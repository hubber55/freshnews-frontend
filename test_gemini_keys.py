import google.generativeai as genai
import config
import time
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

prompt = "Say 'Hello' in Malayalam."

for i, key in enumerate(config.GOOGLE_API_KEYS):
    print(f"Testing Key {i+1}...")
    try:
        genai.configure(api_key=key)
        model = genai.GenerativeModel(config.GEMINI_MODEL)
        response = model.generate_content(prompt)
        print(f"Key {i+1} Success! Response: {response.text.strip()}")
    except Exception as e:
        print(f"Key {i+1} Error: {type(e).__name__} - {e}")
    time.sleep(1)
