import requests
import os
import json
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("OPENROUTER_API_KEY", "")

def test_model(model):
    print(f"Testing {model}...")
    resp = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": model, "messages": [{"role": "user", "content": "hello"}]}
    )
    print(f"[{resp.status_code}] {resp.text}\n")

test_model("meta-llama/llama-3.1-8b-instruct:free")
test_model("google/gemini-2.0-flash-lite-preview-02-05:free")
