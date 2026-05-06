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

def check_instance_connected() -> bool:
    """Check if the WhatsApp instance is actually connected before sending."""
    try:
        status_url = f"http://{WA_EC2_IP}:8080/instance/connectionState/{WA_INSTANCE}"
        headers = {"apikey": WA_API_KEY}
        resp = requests.get(status_url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            state = data.get('instance', {}).get('state', '') or data.get('state', '')
            print(f"   Instance state: {state}")
            return state in ['open', 'ONLINE', 'connected']
        else:
            print(f"   Could not check instance state: HTTP {resp.status_code}")
            return True  # Assume OK if we can't check
    except Exception as e:
        print(f"   Instance check error: {e}")
        return True  # Assume OK if we can't check

def send_whatsapp(phone_number: str, message_text: str) -> tuple[bool, bool]:
    """
    Send a WhatsApp message via Evolution API (v1 textMessage format).
    Returns (success: bool, is_invalid: bool)
    - (True, False)  = message sent OK
    - (False, True)  = number has no WhatsApp account (mark as invalid)
    - (False, False) = API error, will retry
    """
    headers = {
        "Content-Type": "application/json",
        "apikey": WA_API_KEY
    }

    # Evolution API requires textMessage format
    payload = {
        "number": phone_number,
        "textMessage": {"text": message_text}
    }

    try:
        resp = requests.post(WA_ENDPOINT, headers=headers, json=payload, timeout=15)
        print(f"   API Response ({resp.status_code}): {resp.text[:300]}")

        if resp.status_code in [200, 201]:
            return True, False

        # Check for "not on WhatsApp" error
        try:
            resp_json = resp.json()
            messages = resp_json.get('response', {}).get('message', [])
            # Handles both list-of-dicts and list-of-lists format
            for m in messages:
                if isinstance(m, dict) and m.get('exists') is False:
                    print(f"⚠️  Number {phone_number} is NOT on WhatsApp. Marking as invalid.")
                    return False, True
        except Exception:
            pass

        return False, False

    except requests.exceptions.ConnectionError:
        print(f"❌ CONNECTION ERROR: Cannot reach Evolution API at {WA_ENDPOINT}")
        return False, False
    except requests.exceptions.Timeout:
        print(f"❌ TIMEOUT: Evolution API did not respond in 15 seconds")
        return False, False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False, False

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

            # 4. Check instance is connected before sending
            print(f"🔍 Checking WhatsApp instance connection...")
            if not check_instance_connected():
                print(f"⚠️  Instance '{WA_INSTANCE}' appears DISCONNECTED. Waiting 5 mins before retry...")
                print(f"   👉 Please check Evolution API dashboard and reconnect the WhatsApp instance!")
                time.sleep(5 * 60)
                continue

            # 5. Send via Evolution API
            success, is_invalid = send_whatsapp(phone_number, message_text)

            if success:
                print(f"✅ Sent to {phone_number}! Marking as 'messaged'.")
                supabase.table('whatsapp_marketing').update({'status': 'messaged'}).eq('id', number_id).execute()
                # Normal drip delay only after successful sends
                sleep_mins = random.randint(10, 15)
                print(f"⏳ Sleeping {sleep_mins} minutes to prevent spam detection...\n")
                time.sleep(sleep_mins * 60)

            elif is_invalid:
                # Number not on WhatsApp — mark as invalid and move on immediately (no sleep)
                print(f"🚫 {phone_number} has no WhatsApp. Marking as 'invalid' and skipping.")
                supabase.table('whatsapp_marketing').update({'status': 'invalid'}).eq('id', number_id).execute()
                time.sleep(5)

            else:
                # Real API error — log and wait a bit before retrying
                print(f"❌ Failed to send to {phone_number}. Will retry after 2 mins.\n")
                time.sleep(2 * 60)

        except Exception as e:
            print(f"❌ Error in marketing loop: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(5 * 60)

if __name__ == "__main__":
    run_marketing_bot()
