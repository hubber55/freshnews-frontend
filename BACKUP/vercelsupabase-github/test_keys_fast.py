import config
import requests

keys = config.GEMINI_API_KEYS_LIST

def test_key(key, name):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
    payload = {
        "contents": [{"parts":[{"text": "Say Hello"}]}]
    }
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"--- {name} ---")
        if response.status_code == 200:
            print("âœ… VALID & READY!")
        else:
            try:
                err = response.json()
                print("â Ž ERROR:", err.get("error", {}).get("message", "Unknown Error"))
            except:
                print(f"â Ž ERROR: HTTP {response.status_code}")
    except Exception as e:
        print(f"--- {name} ---\nâ Ž EXCEPTION: {e}")

print(f"Found {len(keys)} keys loaded from .env\n")
for i, k in enumerate(keys):
    # Preview key (first 10 chars... last 4 chars)
    preview = f"{k[:10]}...{k[-4:]}" if len(k) > 15 else k
    test_key(k, f"Key {i+1} ({preview})")
