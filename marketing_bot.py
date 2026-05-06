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

# Setup Evolution API (Direct connection for better delivery tracking)
WA_EC2_IP = os.getenv("WA_EC2_IP", "127.0.0.1")
WA_API_KEY = os.getenv("WA_API_KEY", "")
WA_INSTANCE = os.getenv("WA_INSTANCE", "VercelBot2")
BASE_ENDPOINT = f"http://{WA_EC2_IP}:8080"

def get_ist_time():
    """Returns current time in Indian Standard Time (IST)"""
    utc_now = datetime.now(timezone.utc).replace(tzinfo=None)
    ist_now = utc_now + timedelta(hours=5, minutes=30)
    return ist_now

def set_presence(phone_number: str, presence: str = "composing"):
    """Sends a typing indicator to make the bot look more human and improve delivery."""
    try:
        url = f"{BASE_ENDPOINT}/chat/setPresence/{WA_INSTANCE}"
        headers = {"apikey": WA_API_KEY, "Content-Type": "application/json"}
        payload = {"number": phone_number, "presence": presence}
        requests.post(url, headers=headers, json=payload, timeout=5)
    except:
        pass

def send_whatsapp(phone_number: str, message_text: str) -> tuple[bool, bool]:
    """
    Send a WhatsApp message via Evolution API with delivery optimizations.
    Returns (success: bool, is_invalid: bool)
    """
    headers = {
        "Content-Type": "application/json",
        "apikey": WA_API_KEY
    }

    # 1. Set presence to 'composing' for 2 seconds (looks like a human typing)
    set_presence(phone_number, "composing")
    time.sleep(2)

    # 2. Prepare payload with a small internal delay
    # Using textMessage format which is proven to work with 201
    payload = {
        "number": phone_number,
        "options": {
            "delay": 1200,
            "presence": "composing"
        },
        "textMessage": {
            "text": message_text
        }
    }

    try:
        url = f"{BASE_ENDPOINT}/message/sendText/{WA_INSTANCE}"
        resp = requests.post(url, headers=headers, json=payload, timeout=15)
        
        print(f"   Evolution API Response ({resp.status_code}): {resp.text[:300]}")

        # 201 Created is the standard success for Evolution API messages
        if resp.status_code in [200, 201]:
            # Stop presence
            set_presence(phone_number, "paused")
            return True, False
            
        # Check for non-WhatsApp number
        if resp.status_code == 400:
            try:
                data = resp.json()
                msg = str(data.get('response', {}).get('message', ''))
                if "exists" in msg.lower() and "false" in msg.lower():
                    print(f"⚠️  Number {phone_number} is NOT on WhatsApp.")
                    return False, True
            except:
                pass

        return False, False

    except Exception as e:
        print(f"❌ Error calling Evolution API: {e}")
        return False, False

def run_marketing_bot():
    print("========================================")
    print("🚀 WhatsApp Marketing Drip Bot Started")
    print(f"   Instance: {WA_INSTANCE}")
    print(f"   EC2 IP: {WA_EC2_IP}")
    print(f"   API Key: {'Configured' if WA_API_KEY else 'MISSING!'}")
    print("   Optimizations: Presence (Typing) enabled, Internal Delay 1.2s")
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
            template_key = target.get('category') or 'general'

            print(f"\n[{ist_now.strftime('%I:%M %p')}] Processing: {phone_number}")
            print(f"   Category: {template_key}")

            # 3. Get templates
            templates_resp = supabase.table('whatsapp_templates').select('message_text').eq('category', template_key).execute()
            if not templates_resp.data:
                templates_resp = supabase.table('whatsapp_templates').select('message_text').eq('category', 'general').execute()

            if not templates_resp.data:
                message_text = "Hi, is this still available?"
            else:
                templates = [t['message_text'] for t in templates_resp.data]
                message_text = random.choice(templates)

            print(f"   Message: '{message_text}'")

            # 4. Send with Human-like behavior
            success, is_invalid = send_whatsapp(phone_number, message_text)

            if success:
                print(f"✅ Message sent successfully to {phone_number}!")
                supabase.table('whatsapp_marketing').update({'status': 'messaged'}).eq('id', number_id).execute()
                
                # Normal drip delay: 10-15 minutes
                sleep_mins = random.randint(10, 15)
                print(f"⏳ Sleeping {sleep_mins} minutes to prevent spam detection...\n")
                time.sleep(sleep_mins * 60)

            elif is_invalid:
                print(f"🚫 {phone_number} has no WhatsApp. Marking as 'invalid'.")
                supabase.table('whatsapp_marketing').update({'status': 'invalid'}).eq('id', number_id).execute()
                time.sleep(2)

            else:
                print(f"❌ Failed to send to {phone_number}. Will retry after 5 mins.\n")
                time.sleep(5 * 60)

        except Exception as e:
            print(f"❌ Error in marketing loop: {e}")
            time.sleep(5 * 60)

if __name__ == "__main__":
    run_marketing_bot()
