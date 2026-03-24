from urllib.parse import urlparse

# ── Tier 1: Highest credibility (Gov, Academic, Wire Services, Top Fact-Check) ──────────────────
TIER1_DOMAINS = {
    # Government & Intergovernmental
    "cdc.gov", "nih.gov", "who.int", "fda.gov", "nasa.gov", "nist.gov",
    "data.gov", "census.gov", "bls.gov", "fed.us", "whitehouse.gov",
    "gov.uk", "europa.eu", "un.org", "worldbank.org", "imf.org", "oecd.org",
    "loc.gov", "cia.gov", "science.gov", "ncbi.nlm.nih.gov", "eric.ed.gov",
    
    # Wire Services (Primary Sources)
    "reuters.com", "apnews.com", "afp.com",
    
    # Top Academic & Science
    "nature.com", "science.org", "cell.com", "pubmed.ncbi.nlm.nih.gov",
    "scholar.google.com", "arxiv.org", "jstor.org", "nature.com",
    "thelancet.com", "bmj.com", "jamanetwork.com", "cochrane.org",
    "mayoclinic.org", "core.ac.uk", "semanticscholar.org",
    
    # Encyclopedia
    "en.wikipedia.org", "britannica.com",
    
    # Major Fact-Checkers
    "snopes.com", "politifact.com", "factcheck.org",
    
    # Education & Non-profit
    "khanacademy.org", "propublica.org", "pewresearch.org", "brookings.edu",
    "mit.edu", "ocw.mit.edu", "ted.com",
    
    # Official Monument Sites (Specific trust)
    "toureiffel.paris"
}

# ── Tier 2: High credibility (Major News, Tech, Business) ──────────────────────
TIER2_DOMAINS = {
    # Major Global Newspapers
    "nytimes.com", "washingtonpost.com", "wsj.com", "ft.com",
    "bbc.com", "bbc.co.uk", "theguardian.com", "economist.com",
    "theatlantic.com", "newyorker.com", "time.com",
    
    # Major US News
    "npr.org", "pbs.org", "nbcnews.com", "abcnews.go.com", 
    "cbsnews.com", "cnn.com", "foxnews.com", "usatoday.com",
    "latimes.com", "chicagotribune.com",
    
    # Business & Tech
    "bloomberg.com", "forbes.com", "wired.com", "techcrunch.com",
    "theverge.com", "arstechnica.com", "statista.com",
    
    # Science & Magazines
    "sciencedaily.com", "newscientist.com", "scientificamerican.com",
    
    # Global News
    "aljazeera.com", "scmp.com",
    
    # Policy & Think Tanks
    "cfr.org", "foreignaffairs.com",
    
    # Reference & Learning
    "investopedia.com", "imdb.com", "coursera.org", "edx.org",
    "researchgate.net", "academia.edu"
}

# ── Tier 3: Moderate credibility ─────────────────────────────────────────────
TIER3_DOMAINS = {
    "medium.com", "substack.com", "vox.com", "axios.com", "slate.com",
    "businessinsider.com", "huffpost.com", "thehill.com", "politico.com",
    "qs.com", "topuniversities.com"
}

# ── Blocklist: Do not use as evidence sources ─────────────────────────────────
DOMAIN_BLOCKLIST = {
    "theonion.com", "clickhole.com", "babylonbee.com",  # satire
    "infowars.com", "naturalnews.com", "beforeitsnews.com",  # misinformation
    "reddit.com", "twitter.com", "x.com", "facebook.com",  # social (unreliable as primary)
    "tiktok.com", "instagram.com", "youtube.com", "pinterest.com",  # social media
    "quora.com", "answers.com", "yahoo.com", # user-generated content
}


def get_domain_tier(domain: str) -> int:
    """Return trust tier (1-4, or 0 for blocked)."""
    domain = domain.lower().replace("www.", "").replace("m.", "")
    
    if domain in DOMAIN_BLOCKLIST:
        return 0
    if domain in TIER1_DOMAINS:
        return 1
    # Check .gov, .edu TLDs (implicit Tier 1)
    if domain.endswith(".gov") or domain.endswith(".gov.uk") or domain.endswith(".edu") or domain.endswith(".mil"):
        return 1
    if domain in TIER2_DOMAINS:
        return 2
    if domain in TIER3_DOMAINS:
        return 3
    return 4  # Unknown


def get_domain_score(domain: str) -> float:
    """Return numeric credibility score 0.0–1.0."""
    tier = get_domain_tier(domain)
    return {0: 0.0, 1: 1.0, 2: 0.75, 3: 0.5, 4: 0.25}.get(tier, 0.25)


def get_tier_label(tier: int) -> str:
    return {
        0: "BLOCKED",
        1: "Tier 1 — Authoritative",
        2: "Tier 2 — Reputable",
        3: "Tier 3 — Moderate",
        4: "Tier 4 — Unknown",
    }.get(tier, "Unknown")


def get_domain_from_url(url: str) -> str:
    try:
        return urlparse(url).netloc.lower().replace("www.", "")
    except Exception:
        return url


def compute_weighted_confidence(raw_confidence: int, domain_tier: int) -> int:
    """
    Adjust raw LLM confidence by domain credibility.
    Tier 1: no penalty
    Tier 2: -5 max
    Tier 3: -15 max
    Tier 4: -25 max
    Tier 0: -50 max
    """
    penalty = {0: 50, 1: 0, 2: 5, 3: 15, 4: 25}.get(domain_tier, 25)
    return max(0, min(100, raw_confidence - penalty))