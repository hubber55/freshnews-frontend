import os
import time
import random
import requests
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

# Load Environment Variables from .env file
load_dotenv()

# Setup Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Setup Evolution API
WA_EC2_IP = os.getenv("WA_EC2_IP", "127.0.0.1")
WA_API_KEY = os.getenv("WA_API_KEY", "")
WA_INSTANCE = os.getenv("WA_INSTANCE", "VercelBot2")
WA_ENDPOINT = f"http://{WA_EC2_IP}:8080/message/sendText/{WA_INSTANCE}"

def get_ist_time():
    """Returns current time in Indian Standard Time (IST)"""
    utc_now = datetime.now(timezone.utc).replace(tzinfo=None)
    ist_now = utc_now + timedelta(hours=5, minutes=30)
    return ist_now

def send_whatsapp(phone_number: str, message_text: str) -> bool:
    """
    Send a WhatsApp message via Evolution API.
    Returns True on success, False on failure.
    Tries both payload formats for compatibility.
    """
    headers = {
        "Content-Type": "application/json",
        "apikey": WA_API_KEY
    }

    # Evolution API v2 format
    payload = {
        "number": phone_number,
        "text": message_text
    }

    try:
        resp = requests.post(WA_ENDPOINT, headers=headers, json=payload, timeout=15)
        print(f"   API Response ({resp.status_code}): {resp.text[:200]}")

        if resp.status_code in [200, 201]:
            return True

        # Fallback: try v1 format with textMessage wrapper
        payload_v1 = {
            "number": phone_number,
            "textMessage": {"text": message_text}
        }
        resp2 = requests.post(WA_ENDPOINT, headers=headers, json=payload_v1, timeout=15)
        print(f"   Fallback API Response ({resp2.status_code}): {resp2.text[:200]}")
        return resp2.status_code in [200, 201]

    except requests.exceptions.ConnectionError:
        print(f"❌ CONNECTION ERROR: Cannot reach Evolution API at {WA_ENDPOINT}")
        print(f"   Check: Is the EC2 instance running? Is port 8080 open?")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ TIMEOUT: Evolution API did not respond in 15 seconds")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def run_marketing_bot():
    print("========================================")
    print("🚀 WhatsApp Marketing Drip Bot Started")
    print(f"   Instance: {WA_INSTANCE}")
    print(f"   Endpoint: {WA_ENDPOINT}")
    print(f"   API Key set: {'Yes' if WA_API_KEY else 'NO - CHECK .env!'}")
    print(f"   Supabase URL: {SUPABASE_URL[:40] if SUPABASE_URL else 'NOT SET!'}")
    print("========================================")

    while True:
        try:
            ist_now = get_ist_time()

            # 1. Avoid messaging between 12 AM (Midnight) and 6 AM IST
            if 0 <= ist_now.hour < 6:
                print(f"[{ist_now.strftime('%I:%M %p')}] Quiet hours (12 AM - 6 AM). Sleeping for 15 mins...")
                time.sleep(15 * 60)
                continue

            # 2. Get ONE pending number from the database
            response = supabase.table('whatsapp_marketing').select('*').eq('status', 'pending').limit(1).execute()

            if not response.data:
                print(f"[{ist_now.strftime('%I:%M %p')}] No pending numbers found. Waiting 5 mins...")
                time.sleep(5 * 60)
                continue

            target = response.data[0]
            number_id = target['id']
            phone_number = target['phone_number']
            # Category column stores the subcategory name (e.g. "Real Estate")
            template_key = target.get('category') or 'general'

            print(f"\n[{ist_now.strftime('%I:%M %p')}] Processing: {phone_number}")
            print(f"   Category: {template_key}")

            # 3. Get templates for this category
            templates_resp = supabase.table('whatsapp_templates').select('message_text').eq('category', template_key).execute()

            if not templates_resp.data:
                print(f"⚠️  No templates for '{template_key}'. Trying 'general'...")
                templates_resp = supabase.table('whatsapp_templates').select('message_text').eq('category', 'general').execute()

            if not templates_resp.data:
                print(f"⚠️  No templates found at all. Using fallback message.")
                message_text = "Hi, is this still available?"
            else:
                templates = [t['message_text'] for t in templates_resp.data]
                message_text = random.choice(templates)

            print(f"   Message: '{message_text}'")

            # 4. Send via Evolution API
            success = send_whatsapp(phone_number, message_text)

            if success:
                print(f"✅ Sent to {phone_number}! Marking as 'messaged'.")
                supabase.table('whatsapp_marketing').update({'status': 'messaged'}).eq('id', number_id).execute()
            else:
                print(f"❌ Failed to send to {phone_number}. Will retry next loop.")

            # 5. Drip Feed Delay: 10-15 minutes
            sleep_mins = random.randint(10, 15)
            print(f"⏳ Sleeping {sleep_mins} minutes to prevent spam detection...\n")
            time.sleep(sleep_mins * 60)

        except Exception as e:
            print(f"❌ Error in marketing loop: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(5 * 60)

if __name__ == "__main__":
    run_marketing_bot()
