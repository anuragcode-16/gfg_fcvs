import os
import json
import re
import httpx
from typing import Any
from tenacity import retry, stop_after_attempt, wait_exponential
from dotenv import load_dotenv
from .config import settings

load_dotenv()

# Configuration
OPENROUTER_API_KEY = settings.OPENROUTER_API_KEY
OPENROUTER_MODEL   = settings.OPENROUTER_MODEL

# --- Raw API Call ---
@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
async def _call_openrouter(system: str, user: str, temperature: float = 0.1) -> str:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://factcheck.ai",
        "X-Title": "FactCheck Engine",
    }
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        "temperature": temperature,
        "max_tokens": 4096,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

def _call_openrouter_sync(system: str, user: str, temperature: float = 0.1) -> str:
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop.run_until_complete(_call_openrouter(system, user, temperature))
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_call_openrouter(system, user, temperature))
        loop.close()
        return result

def _parse_json(raw: str) -> Any:
    raw = raw.strip()
    fenced = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", raw)
    if fenced:
        raw = fenced.group(1)
    start = min(
        (raw.find("{") if raw.find("{") != -1 else len(raw)),
        (raw.find("[") if raw.find("[") != -1 else len(raw)),
    )
    raw = raw[start:]
    return json.loads(raw)

# --- STAGE 1: Claim Extraction ---
CLAIM_EXTRACTION_SYSTEM = """You are an elite fact-extraction engine trained by investigative journalists and logicians.

Your task: decompose input text into ATOMIC, independently VERIFIABLE factual claims.

CHAIN-OF-THOUGHT PROCESS (follow this internally before outputting):
1. Read the full text carefully.
2. Identify sentences that make factual assertions (not opinions, predictions, or rhetoric).
3. For each factual sentence, break it into the smallest possible unit that can be independently verified.
4. Check: can this claim be verified against a real-world source? If yes → include.
5. Assign a type tag: STATISTIC | HISTORICAL | BIOGRAPHICAL | GEOGRAPHICAL | SCIENTIFIC | CURRENT_EVENT | CLAIM_ABOUT_PERSON | CLAIM_ABOUT_ORGANIZATION

RULES:
- Each claim = ONE subject + ONE predicate + ONE object/fact
- No compound claims joined by "and" — split them
- Exclude: pure opinions ("X is great"), predictions ("X will happen"), rhetorical questions
- Include: numbers, dates, names, statistics, records, attributions, quotes, positions held
- Preserve the original meaning exactly — do NOT paraphrase or alter facts
- If a claim contains a temporal marker ("current CEO", "as of 2024"), flag it as TEMPORALLY_SENSITIVE=true

OUTPUT FORMAT (strict JSON, no preamble, no explanation outside JSON):
{
  "document_summary": "2-sentence summary of the input text",
  "total_claims_found": <integer>,
  "claims": [
    {
      "id": "c1",
      "text": "<exact atomic claim>",
      "type": "<type tag>",
      "temporally_sensitive": <true|false>,
      "context_snippet": "<15 surrounding words from original text>",
      "searchability_score": <1-10, how easy to verify via web search>
    }
  ]
}"""

def extract_claims(text: str, max_claims: int = 30) -> dict:
    user_prompt = f"""Extract all verifiable factual claims from this text. Maximum {max_claims} most important claims if there are more.

TEXT TO ANALYZE:
\"\"\"
{text[:8000]}
\"\"\"

Remember: atomic facts only. Split compound statements. Flag temporal claims."""
    
    raw = _call_openrouter_sync(CLAIM_EXTRACTION_SYSTEM, user_prompt, temperature=0.05)
    result = _parse_json(raw)
    if "claims" not in result:
        result["claims"] = []
    return result

# --- STAGE 2: Search Query Generation ---
QUERY_GEN_SYSTEM = """You are a research librarian and investigative journalist. 

Given a factual claim, generate 3 DISTINCT web search queries to find evidence that either SUPPORTS or REFUTES it.

QUERY STRATEGY:
- Query 1: Direct factual lookup (exact names, numbers, dates from the claim)
- Query 2: Primary source lookup (official reports, government data, peer-reviewed)  
- Query 3: Contradiction/alternative perspective (to find refuting evidence)

RULES:
- Queries must be specific and information-dense (not vague)
- Include key entities: names, organizations, dates, statistics
- For temporal claims, add the most recent year
- For biographical claims, search the official organization's website
- Vary query syntax: some keyword-style, some question-style

OUTPUT (strict JSON only):
{
  "queries": ["query1", "query2", "query3"],
  "primary_entity": "<main subject of the claim>",
  "expected_source_types": ["wikipedia", "news", "government", "academic"]
}"""

def generate_search_queries(claim_text: str) -> dict:
    raw = _call_openrouter_sync(
        QUERY_GEN_SYSTEM,
        f'Generate search queries for this claim: "{claim_text}"',
        temperature=0.2,
    )
    return _parse_json(raw)

# --- STAGE 3: Verdict Generation ---
VERDICT_SYSTEM = """You are a rigorous, evidence-only fact-checking AI. You have ZERO access to external knowledge beyond what is provided as evidence. You MUST NOT use any information from your training data.

CHAIN-OF-THOUGHT VERIFICATION PROCESS:
Step 1: Read the CLAIM carefully. Note all specific facts: numbers, dates, names, statistics.
Step 2: Read ALL evidence passages. Find passages that directly address the claim.
Step 3: For each piece of evidence, determine if it SUPPORTS, REFUTES, or is IRRELEVANT to the claim.
Step 4: Check for CONTRADICTIONS between evidence sources.
Step 5: Assign a verdict based ONLY on the evidence.
Step 6: SELF-REFLECTION — "Am I using information I wasn't given? Could my training data be influencing this verdict?"
Step 7: Assign confidence based on evidence quality and quantity.

VERDICT RULES:
- TRUE: Multiple high-quality sources confirm the claim directly
- FALSE: Evidence directly contradicts the claim
- PARTIALLY TRUE: Some elements correct, some incorrect, or claim is misleadingly stated
- UNVERIFIABLE: Evidence is insufficient, conflicting, or no relevant evidence found
- OUTDATED: Claim was historically true but evidence suggests it's no longer current

CONFIDENCE SCORE GUIDE:
- 90-100: Direct, specific evidence from authoritative source perfectly matches claim
- 70-89: Good evidence supports claim but minor gaps or single source
- 50-69: Mixed signals, conflicting sources, or tangentially related evidence
- 30-49: Mostly unconfirmed, one weak source
- 0-29: No relevant evidence or clear contradiction

OUTPUT (strict JSON only):
{
  "verdict": "TRUE|FALSE|PARTIALLY TRUE|UNVERIFIABLE|OUTDATED",
  "confidence_score": <0-100>,
  "reasoning": "<2-3 sentences citing SPECIFIC evidence passages by source URL>",
  "self_reflection": "<1 sentence: did I rely on training data? If so, lower confidence>",
  "supporting_citations": ["url1", "url2"],
  "contradicting_citations": ["url3"],
  "contradictions_detected": <true|false>,
  "contradiction_explanation": "<if contradictions, explain what conflicts>",
  "temporal_note": "<if claim is time-sensitive, note when evidence was published>"
}"""

def verify_claim(claim_text: str, evidence_passages: list) -> dict:
    evidence_block = ""
    for i, ev in enumerate(evidence_passages[:5], 1):
        snippet = ev.get("content", "")[:600]
        url = ev.get("url", "unknown")
        domain_tier = ev.get("domain_tier", "unknown")
        evidence_block += f"\n[Evidence {i}] Source: {url} (Trust tier: {domain_tier})\n{snippet}\n"
    
    if not evidence_block.strip():
        evidence_block = "[No evidence retrieved — mark as UNVERIFIABLE]"
    
    user_prompt = f"""CLAIM TO VERIFY:
"{claim_text}"

RETRIEVED EVIDENCE:
{evidence_block}

Follow the 7-step Chain-of-Thought verification process. Output JSON verdict only."""
    
    raw = _call_openrouter_sync(VERDICT_SYSTEM, user_prompt, temperature=0.0)
    try:
        return _parse_json(raw)
    except Exception:
        return {
            "verdict": "UNVERIFIABLE", "confidence_score": 0,
            "reasoning": "Verdict parsing failed.", "self_reflection": "N/A",
            "supporting_citations": [], "contradicting_citations": [],
            "contradictions_detected": False, "contradiction_explanation": "", "temporal_note": "",
        }

# --- STAGE 4: Hallucination Audit ---
AUDIT_SYSTEM = """You are a meta-fact-checker auditing AI-generated verdicts.

Review each (claim, verdict, evidence) triple and flag any verdict that appears to use knowledge BEYOND the provided evidence.

For each suspicious verdict, suggest a corrected verdict.

OUTPUT (strict JSON):
{
  "audit_passed": <true|false>,
  "flagged_claims": [
    {
      "claim_id": "c1",
      "issue": "Verdict appears to use training data not present in evidence",
      "suggested_correction": "UNVERIFIABLE",
      "suggested_confidence": 30
    }
  ],
  "overall_pipeline_quality": "<HIGH|MEDIUM|LOW>",
  "auditor_notes": "<1-2 sentences>"
}"""

def audit_verdicts(claims_with_verdicts: list) -> dict:
    summary = []
    for c in claims_with_verdicts:
        summary.append({
            "id": c.get("id"), "claim": c.get("text", "")[:150],
            "verdict": c.get("verdict"), "confidence": c.get("confidence_score"),
            "reasoning": c.get("reasoning", "")[:200],
            "citations_count": len(c.get("supporting_citations", [])),
        })
    
    raw = _call_openrouter_sync(
        AUDIT_SYSTEM,
        f"Audit these verdicts:\n{json.dumps(summary, indent=2)}",
        temperature=0.0,
    )
    try:
        return _parse_json(raw)
    except Exception:
        return {"audit_passed": True, "flagged_claims": [], "overall_pipeline_quality": "MEDIUM"}

# --- STAGE 5: Narrative Generation ---
NARRATIVE_SYSTEM = """You are a senior editor at an investigative journalism outlet.

Given the fact-check results, write a concise, professional executive summary (3-4 sentences) that:
1. States the overall credibility of the document/text
2. Highlights the most significant TRUE and FALSE claims found  
3. Notes any major contradictions or unverifiable areas
4. Gives a clear bottom-line assessment

Style: Authoritative, neutral, precise. No hedging language like "may" or "might" — state findings directly.
Do NOT use bullet points. Write in flowing prose.

OUTPUT: Plain text only. No JSON. Just the narrative paragraph(s)."""

def generate_narrative(overall_score: float, verdict_counts: dict, flagged_claims: list) -> str:
    context = f"""
Overall Accuracy Score: {overall_score:.1f}/100
Verdict Breakdown: {verdict_counts}
Most Significant Claims: {json.dumps(flagged_claims[:5], indent=2)}
"""
    return _call_openrouter_sync(NARRATIVE_SYSTEM, context, temperature=0.3)