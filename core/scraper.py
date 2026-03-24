import re
import time
import random
import logging
import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_fixed
from .domain_trust import get_domain_tier, DOMAIN_BLOCKLIST
from urllib.parse import urlparse

logger = logging.getLogger(__name__)
MIN_CONTENT_LENGTH = 150

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(Subscribe|Sign up|Log in|Cookie policy)[^\n]{0,80}", "", text, flags=re.IGNORECASE)
    return text.strip()

def _is_blocked(url: str) -> bool:
    domain = urlparse(url).netloc.lower().replace("www.", "")
    return any(blocked in domain for blocked in DOMAIN_BLOCKLIST)

# --- FALLBACK 1: BS4 (fast, lightweight) ---
@retry(stop=stop_after_attempt(2), wait=wait_fixed(1))
def scrape_bs4(url: str, timeout: int = 8) -> str:
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True, headers=HEADERS) as client:
            resp = client.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")
            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()
            target = soup.find("article") or soup.find("main") or soup.body
            if not target: return None
            text = target.get_text(separator=" ", strip=True)
            return _clean_text(text) if len(text) > MIN_CONTENT_LENGTH else None
    except Exception as e:
        logger.debug(f"BS4 failed for {url}: {e}")
        return None

# --- FALLBACK 2: Selenium (JS-rendered) ---
def scrape_selenium(url: str, timeout: int = 15) -> str:
    try:
        import undetected_chromedriver as uc
        options = uc.ChromeOptions()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        driver = uc.Chrome(options=options)
        try:
            driver.set_page_load_timeout(timeout)
            driver.get(url)
            time.sleep(random.uniform(1.5, 2.5))
            text = driver.execute_script("return document.body.innerText")
            return _clean_text(text) if text and len(text) > MIN_CONTENT_LENGTH else None
        finally:
            driver.quit()
    except Exception as e:
        logger.debug(f"Selenium failed for {url}: {e}")
        return None

# --- FALLBACK 3: Playwright (stealth JS) ---
def scrape_playwright(url: str, timeout: int = 20) -> str:
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="networkidle", timeout=timeout * 1000)
            page.wait_for_timeout(2000)
            text = page.inner_text("body")
            browser.close()
            return _clean_text(text) if text and len(text) > MIN_CONTENT_LENGTH else None
    except Exception as e:
        logger.debug(f"Playwright failed for {url}: {e}")
        return None

# --- FALLBACK 4: Scrapling (last resort) ---
def scrape_scrapling(url: str) -> str:
    try:
        from scrapling import StealthyFetcher, Adaptor
        page = StealthyFetcher.fetch(url, headless=True, network_idle=True, block_images=True)
        if not page: return None
        adaptor = Adaptor(page.content, auto_match=True)
        text = adaptor.get_all_text(ignore_tags=["script", "style", "nav"])
        return _clean_text(text) if text and len(text) > MIN_CONTENT_LENGTH else None
    except Exception as e:
        logger.debug(f"Scrapling failed for {url}: {e}")
        return None

# --- WATERFALL ORCHESTRATOR ---
SCRAPER_REGISTRY = [
    ("bs4", scrape_bs4),
    ("selenium", scrape_selenium),
    ("playwright", scrape_playwright),
    ("scrapling", scrape_scrapling),
]

def fetch_url_content(url: str, progress_callback=None) -> dict:
    if _is_blocked(url):
        return {"url": url, "content": None, "method": "blocked", "success": False, "domain_tier": 0}

    domain = urlparse(url).netloc.replace("www.", "")
    domain_tier = get_domain_tier(domain)

    for method_name, scraper_fn in SCRAPER_REGISTRY:
        if progress_callback:
            progress_callback(f"  Trying {method_name.upper()} on {domain}...")
        try:
            content = scraper_fn(url)
            if content and len(content.strip()) > MIN_CONTENT_LENGTH:
                if progress_callback:
                    progress_callback(f"  {method_name.upper()} succeeded")
                return {
                    "url": url, "content": content[:6000], "method": method_name,
                    "domain": domain, "domain_tier": domain_tier, "success": True,
                }
        except Exception as e:
            continue
            
    return {"url": url, "content": None, "method": "failed", "success": False, "domain": domain, "domain_tier": domain_tier}