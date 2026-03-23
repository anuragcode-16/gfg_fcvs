import re
import math
from .llm_client import _call_openrouter_sync, _parse_json

def compute_statistical_ai_score(text: str) -> dict:
    # Simplified heuristic logic
    sentences = re.split(r"[.!?]+", text)
    lengths = [len(s.split()) for s in sentences if len(s.split()) > 2]
    
    mean = sum(lengths) / len(lengths) if lengths else 0
    variance = sum((l - mean) ** 2 for l in lengths) / len(lengths) if lengths else 0
    std = math.sqrt(variance)
    burstiness = (std - mean) / (std + mean) if (std + mean) != 0 else 0
    
    # Low burstiness implies AI
    prob = max(0, min(100, 50 + (0.3 - burstiness) * 100)) 
    
    return {
        "statistical_ai_probability": round(prob, 1),
        "features": {"burstiness": round(burstiness, 3)}
    }

AI_DETECT_SYSTEM = """You are an expert forensic linguist. Analyze the text and return JSON with 'llm_probability' (0-100), 'confidence', 'ai_markers_found' (list), 'human_markers_found' (list), and 'assessment' (string)."""

def detect_ai_text(text: str) -> dict:
    stat_result = compute_statistical_ai_score(text)
    sample = text[:2000]
    try:
        raw = _call_openrouter_sync(AI_DETECT_SYSTEM, f"Analyze:\n\n{sample}", temperature=0.0)
        llm_result = _parse_json(raw)
    except Exception:
        llm_result = {"llm_probability": stat_result["statistical_ai_probability"]}
    
    ensemble = round(0.6 * llm_result.get("llm_probability", 50) + 0.4 * stat_result["statistical_ai_probability"], 1)
    
    return {
        "ensemble_probability": ensemble,
        "label": "Likely AI" if ensemble > 70 else "Likely Human",
        "statistical": stat_result,
        "llm_analysis": llm_result
    }