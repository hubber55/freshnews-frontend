"""Quick test: Verify Mistral API key works with Malayalam text."""
import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from dotenv import load_dotenv
import requests, json

load_dotenv()
key = os.getenv("MISTRAL_API_KEY", "")
print(f"Key: {key[:10]}...{key[-5:]}" if len(key) > 15 else f"Key: {key}")

response = requests.post(
    "https://api.mistral.ai/v1/chat/completions",
    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    json={
        "model": "mistral-small-latest",
        "messages": [{"role": "user", "content": "Write 2 sentences about Kerala in Malayalam. Reply as JSON: {\"text\": \"...\"}"}],
        "response_format": {"type": "json_object"},
        "max_tokens": 500,
        "temperature": 0.4,
    },
    timeout=30,
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    content = data["choices"][0]["message"]["content"]
    print(f"Mistral works! Response:\n{content}")
    tokens = data.get("usage", {})
    print(f"Tokens used - Input: {tokens.get('prompt_tokens')}, Output: {tokens.get('completion_tokens')}")
else:
    print(f"Error: {response.text}")
