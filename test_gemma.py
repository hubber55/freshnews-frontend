import os
import requests
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

payload = {
    "model": "llama-3.1-8b-instant",
    "messages": [
        {
            "role": "user",
            "content": "Write a 2 sentence summary in Malayalam about artificial intelligence taking over programming jobs."
        }
    ],
    "max_tokens": 800,
    "temperature": 0.3
}
headers = {
    "Authorization": f"Bearer {GROQ_API_KEY}",
    "Content-Type": "application/json"
}

resp = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers)
print(resp.json())
