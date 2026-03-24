import time
import uuid
import json
import fitz  # PyMuPDF
import logging
from datetime import datetime
from typing import Generator, Optional
from urllib.parse import urlparse

from .llm_client import extract_claims, generate_search_queries, verify_claim, audit_verdicts, generate_narrative
from .scraper import fetch_url_content
from .search_service import search_for_claim
from .ai_detector import detect_ai_text
from .domain_trust import compute_weighted_confidence
from .rag import prepare_document_chunks

logger = logging.getLogger(__name__)

def run_pipeline(
    input_text: str = "", input_url: str = "", input_pdf_bytes: bytes = b"",
    max_claims: int = 20, depth: str = "standard", sources_per_claim: int = 5,
    min_source_quality: int = 1, progress_callback=None, stop_check=None
) -> dict:
    
    session_id = str(uuid.uuid4())[:8]
    
    def emit(stage: str, msg: str, pct: int):
        if progress_callback: progress_callback(stage, msg, pct)

    # STAGE 01: Source Authentication
    emit("stage_01", "Parsing input...", 2)
    text = ""
    source_url = "" # Track source URL if provided
    
    if input_url:
        emit("stage_01", f"Fetching URL: {input_url[:80]}", 5)
        source_url = input_url
        res = fetch_url_content(input_url)
        if res["success"]: 
            text = res["content"]
        else:
            # If URL fetch fails, we might want to stop or warn
            logger.warning(f"Failed to fetch URL content for {input_url}")
            
    elif input_pdf_bytes:
        emit("stage_01", "Extracting PDF...", 5)
        try:
            doc = fitz.open(stream=input_pdf_bytes, filetype="pdf")
            text = "\n".join(page.get_text() for page in doc)
        except Exception as e:
            logger.error(f"PDF Extraction Error: {e}")
            raise ValueError("Could not read PDF file.")
            
    elif input_text:
        text = input_text
    
    # --- UPDATED VALIDATION: Allow inputs as short as 10 characters ---
    if not text or len(text.strip()) < 10:
        raise ValueError("Input too short. Please provide at least a sentence or a valid URL.")

    # STAGE 02: Linguistic Pattern Matching
    emit("stage_02", "Extracting claims...", 12)
    extraction_result = extract_claims(text, max_claims=max_claims)
    claims_raw = extraction_result.get("claims", [])

    # STAGE 03: Cross-Reference Synthesis
    emit("stage_03", "Generating search queries...", 22)
    for claim in claims_raw:
        # Check for stop signal
        if stop_check and stop_check():
            emit("stopped", "Stopped during query generation.", 100)
            return {}
            
        q_res = generate_search_queries(claim["text"])
        claim["queries"] = q_res.get("queries", [claim["text"]])

    # STAGE 04: Claim Verification
    emit("stage_04", "Gathering evidence...", 30)
    claims_with_evidence = []
    
    for i, claim in enumerate(claims_raw):
        # --- STOP CHECK ---
        if stop_check and stop_check():
            emit("stopped", "Analysis stopped by user.", 100)
            break
        # ------------------
        
        emit("stage_04", f"Processing claim {i+1}/{len(claims_raw)}", 30 + int((i/max(len(claims_raw),1))*30))
        
        urls = search_for_claim(claim["queries"], max_urls=sources_per_claim, depth=depth)
        evidence_items = []
        
        for url in urls:
            res = fetch_url_content(url)
            if res["success"] and (res["domain_tier"] <= min_source_quality or min_source_quality == 4):
                res["_retrieval_chunks"] = prepare_document_chunks(res)
                evidence_items.append(res)
                
        claim["evidence"] = evidence_items
        claims_with_evidence.append(claim)

    # STAGE 05: Conflict Resolution
    emit("stage_05", "Verifying claims...", 62)
    verified_claims = []
    
    for i, claim in enumerate(claims_with_evidence):
        # --- STOP CHECK ---
        if stop_check and stop_check():
            emit("stopped", "Analysis stopped by user.", 100)
            break
        # ------------------

        emit("stage_05", f"Verdicting claim {i+1}/{len(claims_with_evidence)}", 62 + int((i/max(len(claims_with_evidence),1))*20))
        
        verdict_data = verify_claim(claim["text"], claim["evidence"])
        public_evidence = [
            {k: v for k, v in evidence.items() if k not in {"_retrieval_chunks", "retrieval_chunks"}}
            for evidence in claim["evidence"]
        ]
        
        if claim["evidence"]:
            best_tier = min(e.get("domain_tier", 4) for e in claim["evidence"])
            verdict_data["confidence_score"] = compute_weighted_confidence(verdict_data.get("confidence_score", 50), best_tier)
        
        verified_claims.append({**claim, "evidence": public_evidence, **verdict_data})

    # STAGE 06: Report Assembly
    emit("stage_06", "Assembling report...", 84)
    verdict_counts = {"TRUE": 0, "FALSE": 0, "PARTIALLY TRUE": 0, "UNVERIFIABLE": 0, "OUTDATED": 0}
    for c in verified_claims: verdict_counts[c.get("verdict", "UNVERIFIABLE")] += 1
    
    # Improved Accuracy Calculation: TRUE=100%, PARTIAL=50%
    true_count = verdict_counts.get("TRUE", 0)
    partial_count = verdict_counts.get("PARTIALLY TRUE", 0)
    total_claims_count = len(verified_claims)
    
    if total_claims_count > 0:
        accuracy = ((true_count * 1.0) + (partial_count * 0.5)) / total_claims_count * 100
    else:
        accuracy = 0.0
        
    accuracy = round(accuracy, 1)
    
    audit = audit_verdicts(verified_claims)
    narrative = generate_narrative(accuracy, verdict_counts, verified_claims[:5])

    # STAGE 07: AI Detection
    emit("stage_07", "Detecting AI content...", 92)
    ai_res = detect_ai_text(text)

    emit("complete", "Done.", 100)

    return {
        "session_id": session_id, 
        "started_at": datetime.now().isoformat(),
        "input_type": "url" if input_url else "pdf" if input_pdf_bytes else "text",
        "input_url": source_url,
        "text_sample": text[:500],
        "overall_accuracy_score": accuracy,
        "verdict_counts": verdict_counts,
        "total_claims": len(verified_claims),
        "claims": verified_claims,
        "narrative": narrative,
        "ai_detection": ai_res,
        "audit": audit
    }
