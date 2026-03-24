import math
import re
from collections import Counter
from typing import Dict, List


STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by",
    "for", "from", "had", "has", "have", "he", "her", "his", "in", "into",
    "is", "it", "its", "of", "on", "or", "that", "the", "their", "there",
    "they", "this", "to", "was", "were", "will", "with", "would", "about",
    "after", "all", "also", "among", "any", "because", "before", "between",
    "both", "can", "during", "each", "few", "if", "more", "most", "no", "not",
    "other", "out", "over", "same", "some", "such", "than", "then", "these",
    "those", "through", "under", "until", "up", "very", "what", "when", "where",
    "which", "who", "why", "your",
}

TOKEN_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9%.\-:/]*")
SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b")
NUMBER_RE = re.compile(r"\b\d+(?:\.\d+)?%?\b")


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def _tokenize(text: str) -> List[str]:
    return [
        token.lower()
        for token in TOKEN_RE.findall(text or "")
        if len(token) > 1 and token.lower() not in STOPWORDS
    ]


def chunk_text(text: str, chunk_size: int = 750, overlap_sentences: int = 1) -> List[str]:
    text = _normalize_whitespace(text)
    if not text:
        return []

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    units = paragraphs if len(paragraphs) > 1 else SENTENCE_SPLIT_RE.split(text)
    units = [unit.strip() for unit in units if unit.strip()]

    chunks: List[str] = []
    current: List[str] = []

    for unit in units:
        candidate = " ".join(current + [unit]).strip()
        if current and len(candidate) > chunk_size:
            chunk = " ".join(current).strip()
            if chunk:
                chunks.append(chunk)
            current = current[-overlap_sentences:] if overlap_sentences else []
        current.append(unit)

    if current:
        chunks.append(" ".join(current).strip())

    deduped: List[str] = []
    seen = set()
    for chunk in chunks:
        key = chunk.lower()
        if key not in seen and len(chunk) > 80:
            deduped.append(chunk)
            seen.add(key)
    return deduped


def prepare_document_chunks(document: Dict, max_chunks: int = 12) -> List[Dict]:
    raw_chunks = chunk_text(document.get("content", ""))
    prepared = []
    for idx, chunk in enumerate(raw_chunks[:max_chunks]):
        prepared.append(
            {
                "chunk_id": f"{document.get('domain', 'source')}-{idx + 1}",
                "content": chunk,
                "tokens": _tokenize(chunk),
            }
        )
    return prepared


def _compute_idf(chunks: List[Dict]) -> Dict[str, float]:
    total = max(len(chunks), 1)
    doc_freq = Counter()
    for chunk in chunks:
        doc_freq.update(set(chunk.get("tokens", [])))
    return {
        token: math.log((1 + total) / (1 + freq)) + 1.0
        for token, freq in doc_freq.items()
    }


def _score_chunk(claim_text: str, claim_tokens: List[str], chunk: Dict, idf: Dict[str, float]) -> float:
    chunk_tokens = chunk.get("tokens", [])
    if not chunk_tokens:
        return 0.0

    chunk_counts = Counter(chunk_tokens)
    overlap = set(claim_tokens) & set(chunk_tokens)
    if not overlap:
        return 0.0

    lexical_score = 0.0
    max_possible = 0.0
    for token in claim_tokens:
        weight = idf.get(token, 1.0)
        max_possible += weight
        lexical_score += min(chunk_counts.get(token, 0), 2) * weight
    lexical_score = lexical_score / max(max_possible, 1.0)

    claim_years = set(YEAR_RE.findall(claim_text))
    chunk_years = set(YEAR_RE.findall(chunk.get("content", "")))
    year_bonus = 0.15 if claim_years and claim_years & chunk_years else 0.0

    claim_numbers = set(NUMBER_RE.findall(claim_text))
    chunk_numbers = set(NUMBER_RE.findall(chunk.get("content", "")))
    number_bonus = 0.12 if claim_numbers and claim_numbers & chunk_numbers else 0.0

    normalized_claim = re.sub(r"\W+", " ", claim_text.lower()).strip()
    phrase_bonus = 0.08 if normalized_claim and normalized_claim[:80] in re.sub(r"\W+", " ", chunk.get("content", "").lower()) else 0.0

    coverage_bonus = min(len(overlap) / max(len(set(claim_tokens)), 1), 1.0) * 0.15
    return lexical_score + year_bonus + number_bonus + phrase_bonus + coverage_bonus


def retrieve_relevant_passages(
    claim_text: str,
    evidence_items: List[Dict],
    top_k: int = 6,
    per_document_limit: int = 2,
) -> List[Dict]:
    prepared_chunks: List[Dict] = []
    for evidence in evidence_items:
        retrieval_chunks = evidence.get("_retrieval_chunks") or evidence.get("retrieval_chunks", [])
        for chunk in retrieval_chunks:
            prepared_chunks.append(
                {
                    **chunk,
                    "url": evidence.get("url"),
                    "domain": evidence.get("domain"),
                    "domain_tier": evidence.get("domain_tier"),
                    "method": evidence.get("method"),
                }
            )

    if not prepared_chunks:
        return []

    claim_tokens = _tokenize(claim_text)
    if not claim_tokens:
        return []

    idf = _compute_idf(prepared_chunks)
    scored = []
    for chunk in prepared_chunks:
        score = _score_chunk(claim_text, claim_tokens, chunk, idf)
        if score <= 0:
            continue
        scored.append(
            {
                "url": chunk.get("url"),
                "domain": chunk.get("domain"),
                "domain_tier": chunk.get("domain_tier"),
                "method": chunk.get("method"),
                "chunk_id": chunk.get("chunk_id"),
                "score": round(score, 4),
                "content": chunk.get("content", ""),
                "matched_terms": sorted(set(claim_tokens) & set(chunk.get("tokens", [])))[:12],
            }
        )

    scored.sort(key=lambda item: (item["score"], -(item.get("domain_tier") or 4)), reverse=True)

    selected: List[Dict] = []
    per_doc_counts = Counter()
    seen_snippets = set()
    for item in scored:
        url = item.get("url") or ""
        if per_doc_counts[url] >= per_document_limit:
            continue
        snippet_key = item.get("content", "").lower()
        if snippet_key in seen_snippets:
            continue
        selected.append(item)
        per_doc_counts[url] += 1
        seen_snippets.add(snippet_key)
        if len(selected) >= top_k:
            break

    return selected
