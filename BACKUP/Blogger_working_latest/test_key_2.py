import google.generativeai as genai
import config

key2 = config.GEMINI_API_KEYS_LIST[1]
print(f"Testing Key 2 independently...")
print(f"Key preview: {key2[:15]}...")

genai.configure(api_key=key2)
model = genai.GenerativeModel(config.GEMINI_MODEL)
try:
    response = model.generate_content("Say 'Hello' in Malayalam.")
    print("Success! Response:", response.text.strip())
except Exception as e:
    print(f"Error: {e}")
