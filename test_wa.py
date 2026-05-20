import requests
import json

# HARDCODED VALUES FROM YOUR REVEAL
IP = "wa.freshnews.top"
KEY = "Maramon7#5*"
INSTANCE = "VercelBot2"
NUMBER = "919567135764" # The number from your log

url = f"https://{IP}/message/sendText/{INSTANCE}"
headers = {
    "apikey": KEY,
    "Content-Type": "application/json"
}
payload = {
    "number": NUMBER,
    "text": "Test from Script"
}

print(f"Testing URL: {url}")
print(f"Testing Key: {KEY[:5]}...")

try:
    resp = requests.post(url, headers=headers, json=payload, timeout=10)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
