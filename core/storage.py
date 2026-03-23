# core/storage.py
import json
import os
from typing import List, Dict

# Define the path for the local database file
# It will be stored in the root directory of the project
HISTORY_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "history.json")

def load_history() -> List[Dict]:
    """Load history from the local JSON file."""
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        # If file is corrupt or empty, return empty list
        return []

def save_history(history: List[Dict]):
    """Save history to the local JSON file."""
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, default=str) # default=str handles datetime objects
    except IOError as e:
        print(f"Error saving history: {e}")