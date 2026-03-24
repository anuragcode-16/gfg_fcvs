import os
import time
import logging
import httpx
from urllib.parse import urlparse
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

def _deduplicate_by_domain(urls: list) -> list:
    seen_domains = {}
    result = []
    for url in urls:
        domain = urlparse(url).netloc.replace("www.", "")
        count = seen_domains.get(domain, 0)
        if count < 2:
            result.append(url)
            seen_domains[domain] = count + 1
    return result

# --- Provider 1: Tavily (Best for AI/Fact-checking) ---
def search_tavily(query: str, max_results: int = MAX_RESULTS_PER_QUERY) -> list:
    if not TAVILY_KEY: return []
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": TAVILY_KEY,
                    "query": query,
                    "search_depth": "basic",
                    "max_results": max_results
                }
            )
            resp.raise_for_status()
            data = resp.json()
            return [r["url"] for r in data.get("results", [])]
    except Exception as e:
        logger.debug(f"Tavily error: {e}")
        return []

# --- Provider 2: Google CSE ---
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

# --- Provider 3: DuckDuckGo ---
def search_duckduckgo(query: str, max_results: int = MAX_RESULTS_PER_QUERY) -> list:
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            return [r["href"] for r in results if "href" in r]
    except Exception as e:
        logger.debug(f"DuckDuckGo error: {e}")
        return []

# --- MAIN SEARCH ORCHESTRATOR ---
def search_for_claim(
    queries: list, 
    max_urls: int = 8, 
    depth: str = "standard", 
    progress_callback=None
) -> list:
    if depth == "quick": max_urls = min(max_urls, 3)
    elif depth == "deep": max_urls = max(max_urls, 10)

    all_urls = []
    for q in queries:
        if progress_callback: progress_callback(f"  Searching: {q[:60]}...")
        
        # PRIORITIZE Tavily since you have a valid key
        found = search_tavily(q, max_urls)
        
        # Fallback to Google (will fail currently due to key) then DuckDuckGo
        if len(found) < 2: found += search_google_cse(q, max_urls)
        if len(found) < 2: found += search_duckduckgo(q, max_urls)
        
        all_urls.extend(found)
        time.sleep(0.3)

    all_urls = list(dict.fromkeys(all_urls))
    all_urls = _filter_urls(all_urls)
    all_urls = _deduplicate_by_domain(all_urls)
    all_urls = _sort_by_credibility(all_urls)

    return all_urls[:max_urls]