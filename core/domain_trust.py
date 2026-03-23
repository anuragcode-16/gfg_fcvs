from urllib.parse import urlparse

# --- Tier 1: Highest credibility ---
TIER1_DOMAINS = {
    "cdc.gov", "nih.gov", "who.int", "fda.gov", "nasa.gov", "nist.gov",
    "reuters.com", "apnews.com", "afp.com",
    "nature.com", "science.org", "cell.com", "pubmed.ncbi.nlm.nih.gov",
    "en.wikipedia.org", "britannica.com",
    "snopes.com", "politifact.com", "factcheck.org",
}

# --- Tier 2: High credibility ---
TIER2_DOMAINS = {
    "nytimes.com", "washingtonpost.com", "wsj.com", "ft.com",
    "bbc.com", "bbc.co.uk", "theguardian.com", "economist.com",
    "bloomberg.com", "forbes.com", "theatlantic.com", "time.com",
    "npr.org", "pbs.org", "cnn.com", "foxnews.com",
}

# --- Tier 3: Moderate credibility ---
TIER3_DOMAINS = {
    "medium.com", "substack.com", "techcrunch.com", "wired.com",
    "theverge.com", "businessinsider.com", "vox.com",
}

# --- Blocklist ---
DOMAIN_BLOCKLIST = {
    "theonion.com", "clickhole.com", "babylonbee.com",  # satire
    "infowars.com", "naturalnews.com",  # misinformation
    "reddit.com", "twitter.com", "x.com", "facebook.com",  # social
}

def get_domain_tier(domain: str) -> int:
    domain = domain.lower().replace("www.", "").replace("m.", "")
    if domain in DOMAIN_BLOCKLIST:
        return 0
    if domain in TIER1_DOMAINS:
        return 1
    if domain.endswith(".gov") or domain.endswith(".edu"):
        return 1
    if domain in TIER2_DOMAINS:
        return 2
    if domain in TIER3_DOMAINS:
        return 3
    return 4

def compute_weighted_confidence(raw_confidence: int, domain_tier: int) -> int:
    penalty = {0: 50, 1: 0, 2: 5, 3: 15, 4: 25}.get(domain_tier, 25)
    return max(0, min(100, raw_confidence - penalty))