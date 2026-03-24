# test_api.py
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("OPENROUTER_API_KEY")
model = os.getenv("OPENROUTER_MODEL")

print(f"Testing Key: {api_key[:10]}... (Hidden for security)")
print(f"Testing Model: {model}")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}

# Simple test payload
data = {
    "model": model,
    "messages": [{"role": "user", "content": "Say hello"}]
}

try:
    response = httpx.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data, timeout=30)
    response.raise_for_status()
    print("\nSUCCESS! API Key and Model are working.")
    print("Response:", response.json()["choices"][0]["message"]["content"])
except httpx.HTTPStatusError as e:
    print(f"\nERROR: {e.response.status_code}")
    print("Details:", e.response.text)
except Exception as e:
    print(f"\nERROR: {e}")