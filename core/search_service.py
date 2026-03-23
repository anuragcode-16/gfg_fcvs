import os
import time
import logging
import httpx
from urllib.parse import urlparse, quote_plus
from dotenv import load_dotenv
from .domain_trust import get_domain_tier, DOMAIN_BLOCKLIST
from .config import settings

logger = logging.getLogger(__name__)

TAVILY_KEY = settings.TAVILY_KEY
GOOGLE_KEY = settings.GOOGLE_API_KEY
GOOGLE_CX = settings.GOOGLE_CSE_ID

MAX_RESULTS_PER_QUERY = 5

def _filter_urls(urls: list) -> list:
    filtered = []
    for url in urls:
        domain = urlparse(url).netloc.lower().replace("www.", "")
        if any(b in domain for b in DOMAIN_BLOCKLIST): continue
        if url.endswith(".pdf"): continue
        filtered.append(url)
    return filtered

def _sort_by_credibility(urls: list) -> list:
    return sorted(urls, key=lambda u: get_domain_tier(urlparse(u).netloc))

# --- Provider 1: Google CSE ---
def search_google_cse(query: str, max_results: int = MAX_RESULTS_PER_QUERY) -> list:
    if not GOOGLE_KEY or not GOOGLE_CX: return []
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(
                "https://www.googleapis.com/customsearch/v1",
                params={"key": GOOGLE_KEY, "cx": GOOGLE_CX, "q": query, "num": min(max_results, 10)},
            )
            resp.raise_for_status()
            return [item["link"] for item in resp.json().get("items", [])]
    except Exception as e:
        logger.debug(f"Google CSE error: {e}")
        return []

# --- Provider 2: DuckDuckGo ---
def search_duckduckgo(query: str, max_results: int = MAX_RESULTS_PER_QUERY) -> list:
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            return [r["href"] for r in results if "href" in r]
    except Exception:
        pass
    return []

# --- MAIN SEARCH ORCHESTRATOR ---
def search_for_claim(queries: list, max_urls: int = 8, progress_callback=None) -> list:
    all_urls = []
    for q in queries:
        if progress_callback: progress_callback(f"  🔍 Searching: {q[:60]}...")
        
        found = search_google_cse(q, max_urls)
        if len(found) < 2: found += search_duckduckgo(q, max_urls)
        all_urls.extend(found)
        time.sleep(0.3)

    all_urls = list(dict.fromkeys(all_urls))
    all_urls = _filter_urls(all_urls)
    all_urls = _sort_by_credibility(all_urls)
    return all_urls[:max_urls]