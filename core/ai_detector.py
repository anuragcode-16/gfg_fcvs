import re
import math
import httpx
from .llm_client import _call_openrouter_sync, _parse_json
from .config import settings

# --- 1. RapidAPI Implementation (External API) ---
def detect_ai_rapidapi(text: str) -> dict:
    """
    Detects AI content using RapidAPI (External Service).
    """
    url = f"https://{settings.RAPIDAPI_HOST}/detect" # Common endpoint, verify in API docs
    # Note: The endpoint '/detect' is a guess. Check the 'Endpoints' tab in RapidAPI for the correct path (e.g., '/', '/check', etc.)
    # Often it is just the base URL or '/api/v1/detect'
    
    payload = {
        "text": text
        # Some APIs expect "content" or "input". Check API documentation.
    }
    headers = {
        "x-rapidapi-key": settings.RAPIDAPI_KEY,
        "x-rapidapi-host": settings.RAPIDAPI_HOST,
        "Content-Type": "application/json"
    }

    try:
        # Try the most common endpoint structure
        # If the API expects just the base URL, remove "/detect"
        with httpx.Client(timeout=20.0) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # Parsing the response
            # This logic assumes a standard response structure.
            # You may need to adjust keys based on the specific API you chose.
            # Example: {"is_human": false, "ai_probability": 0.95}
            
            probability = 50.0
            
            # Common keys in responses: 'ai_probability', 'score', 'human_probability'
            if 'ai_probability' in data:
                probability = float(data['ai_probability']) * 100
            elif 'score' in data: # Some APIs return 0-1 score
                probability = float(data['score']) * 100
            elif 'human_probability' in data:
                probability = 100 - (float(data['human_probability']) * 100)
            
            return {
                "ensemble_probability": round(probability, 1),
                "label": "Likely AI-Generated" if probability > 70 else "Likely Human-Written",
                "source": "RapidAPI (External)",
                "raw_response": data
            }
    except Exception as e:
        print(f"RapidAPI Error: {e}")
        return {
            "ensemble_probability": -1,
            "label": "API Error",
            "error": str(e),
            "source": "RapidAPI"
        }

# --- 2. Statistical Heuristics (Fallback) ---
def compute_statistical_ai_score(text: str) -> dict:
    words = text.split()
    word_count = len(words)
    if word_count < 100:
        return {"statistical_ai_probability": 50.0, "features": {"note": "Text too short"}}
    
    sentences = re.split(r"[.!?]+", text)
    lengths = [len(s.split()) for s in sentences if len(s.split()) > 2]
    if len(lengths) < 3: return {"statistical_ai_probability": 50.0, "features": {"note": "Not enough sentences"}}
    
    mean = sum(lengths) / len(lengths)
    variance = sum((l - mean) ** 2 for l in lengths) / len(lengths)
    std = math.sqrt(variance)
    if (std + mean) == 0: burstiness = 0.0
    else: burstiness = (std - mean) / (std + mean)
    
    burstiness_score = max(0, (-0.2 - burstiness) / 0.5) * 25 
    raw_score = 50 + burstiness_score
    probability = min(95, max(5, raw_score))
    return {"statistical_ai_probability": round(probability, 1), "features": {"burstiness": round(burstiness, 3)}}

# --- 3. Main Orchestrator ---
def detect_ai_text(text: str) -> dict:
    """
    Primary: Try RapidAPI.
    Fallback: Statistical & LLM analysis.
    """
    result = {}
    
    # 1. Try External API first (if configured)
    if settings.RAPIDAPI_KEY and settings.RAPIDAPI_HOST:
        rapidapi_result = detect_ai_rapidapi(text)
        if rapidapi_result["ensemble_probability"] >= 0:
            return rapidapi_result
        else:
            result["rapidapi_error"] = rapidapi_result.get("error")
    
    # 2. Fallback to Statistical + LLM
    stat_result = compute_statistical_ai_score(text)
    sample = text[:2000]
    
    try:
        # Simple LLM prompt
        system_prompt = "Analyze if text is AI. Output JSON: {\"probability\": 0-100}"
        raw = _call_openrouter_sync(system_prompt, f"Analyze: {sample}", temperature=0.0)
        llm_res = _parse_json(raw)
        llm_prob = llm_res.get("probability", 50)
    except:
        llm_prob = 50
        
    ensemble = round(0.6 * llm_prob + 0.4 * stat_result["statistical_ai_probability"], 1)
    
    return {
        "ensemble_probability": ensemble,
        "label": "Likely AI-Generated" if ensemble > 70 else "Likely Human-Written",
        "source": "Local Model (Fallback)",
        "statistical": stat_result,
        "llm_analysis": {"llm_probability": llm_prob}
    }