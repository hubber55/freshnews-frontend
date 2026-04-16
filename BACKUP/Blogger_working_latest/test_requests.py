import requests
import json
import os

key1 = "AIzaSyAW7g82LZ8FsAWiJpryzQ5CPS1UMu52rXE"
key2 = "AIzaSyDp376C_H2uCJf1CSP0Qks3Sgg77Yd-oBU"
key3 = "AIzaSyC4CgpPrlugZ7xr25MYJtgqEClrAxLJpqk"

def test_key(key, name):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
    payload = {
        "contents": [{"parts":[{"text": "Say Hello"}]}]
    }
    headers = {"Content-Type": "application/json"}
    
    response = requests.post(url, headers=headers, json=payload)
    print(f"--- {name} ---")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Success")
    else:
        try:
            err = response.json()
            print("Error reason:", err.get("error", {}).get("message", "Unknown"))
            print("Full error:", response.text)
        except:
            print("Raw response:", response.text)

test_key(key2, "Key 2")
test_key(key3, "Key 3")
