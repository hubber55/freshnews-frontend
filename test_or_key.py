import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("OPENROUTER_API_KEY")
print("Key loaded:", bool(key))

url = "https://openrouter.ai/api/v1/chat/completions"
payload = {
    "model": "meta-llama/llama-3.3-70b-instruct:free",
    "messages": [
        {"role": "user", "content": "Just say hello."}
    ]
}
headers = {
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

resp = requests.post(url, headers=headers, json=payload)
print(f"Status Code: {resp.status_code}")
if resp.status_code != 200:
    print(resp.text)
else:
    print("Success!")
