import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # LLM
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct")
    
    # Search - Mapped to specific names expected by search_service
    GOOGLE_API_KEY = os.getenv("GOOGLE_CSE_KEY") 
    GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")
    
    # Optional
    TAVILY_KEY = os.getenv("TAVILY_API_KEY", "")
    SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")
    # RapidAPI AI Detection
    RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "")
    RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "")

settings = Settings()   