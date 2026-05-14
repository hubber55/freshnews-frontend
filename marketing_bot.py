import os
import time
import random
import requests
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

# Load Environment Variables from .env file (Force override existing session variables)
load_dotenv(override=True)

# Setup Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Setup Evolution API (Direct connection)
WA_EC2_IP = os.getenv("WA_EC2_IP", "127.0.0.1").strip().replace('"', '').replace("'", "")
WA_API_KEY = os.getenv("WA_API_KEY", "").strip().replace('"', '').replace("'", "")
WA_INSTANCE = os.getenv("WA_INSTANCE", "VercelBot2").strip().replace('"', '').replace("'", "")
BASE_ENDPOINT = f"http://{WA_EC2_IP}:8080"

def get_ist_time():
    """Returns current time in Indian Standard Time (IST)"""
    utc_now = datetime.now(timezone.utc).replace(tzinfo=None)
    ist_now = utc_now + timedelta(hours=5, minutes=30)
    return ist_now

def set_presence(phone_number: str, presence: str = "composing"):
    """Sends a typing indicator to make the bot look more human."""
    try:
        url = f"{BASE_ENDPOINT}/chat/setPresence/{WA_INSTANCE}"
        headers = {"apikey": WA_API_KEY, "Content-Type": "application/json"}
        payload = {"number": phone_number, "presence": presence}
        requests.post(url, headers=headers, json=payload, timeout=5)
    except:
        pass

def send_whatsapp(phone_number: str, message_text: str) -> tuple[bool, bool]:
    """
    Send a WhatsApp message via Evolution API with randomized human mimicry.
    """
    headers = {
        "Content-Type": "application/json",
        "apikey": WA_API_KEY
    }

    # 1. Human behavior: Randomized Typing for 8-15 seconds
    typing_delay = random.randint(8, 15)
    print(f"   🔍 Mimicking human behavior: Typing for {typing_delay}s...")
    set_presence(phone_number, "composing")
    time.sleep(typing_delay)

    # 2. Payload with options
    payload = {
        "number": phone_number,
        "options": {
            "delay": 2000,
            "presence": "composing",
            "linkPreview": False
        },
        "textMessage": {
            "text": message_text
        }
    }
    
    print(f"   🚀 Sending Message to {phone_number}...")

    try:
        url = f"{BASE_ENDPOINT}/message/sendText/{WA_INSTANCE}"
        resp = requests.post(url, headers=headers, json=payload, timeout=15)
        
        print(f"   Evolution API Response ({resp.status_code}): {resp.text[:300]}")

        if resp.status_code in [200, 201]:
            set_presence(phone_number, "paused")
            return True, False
            
        if resp.status_code == 400:
            try:
                data = resp.json()
                msg = str(data.get('response', {}).get('message', ''))
                if "exists" in msg.lower() and "false" in msg.lower():
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
    print(f"   Instance: [{WA_INSTANCE}] | IP: {WA_EC2_IP}")
    print(f"   Key Length: {len(WA_API_KEY)} | Key Prefix: {WA_API_KEY[:3]}...")
    print("   Status: Optimized for delivery (Presence + Drip)")
    print("========================================")

    while True:
        try:
            ist_now = get_ist_time()

            if 0 <= ist_now.hour < 6:
                print(f"[{ist_now.strftime('%I:%M %p')}] Quiet hours. Sleeping 15m...")
                time.sleep(15 * 60)
                continue

            response = supabase.table('whatsapp_marketing').select('*').eq('status', 'pending').limit(1).execute()

            if not response.data:
                print(f"[{ist_now.strftime('%I:%M %p')}] No pending numbers. Waiting 5m...")
                time.sleep(5 * 60)
                continue

            target = response.data[0]
            number_id = target['id']
            phone_number = target['phone_number']
            template_key = target.get('category') or 'general'

            print(f"\n[{ist_now.strftime('%I:%M %p')}] Processing: {phone_number}")
            
            # Get and Randomize Template
            templates_resp = supabase.table('whatsapp_templates').select('message_text').eq('category', template_key).execute()
            if not templates_resp.data:
                templates_resp = supabase.table('whatsapp_templates').select('message_text').eq('category', 'general').execute()

            if not templates_resp.data:
                message_text = "Hi, is this still available?"
            else:
                templates = [t['message_text'] for t in templates_resp.data]
                message_text = random.choice(templates)

            # Subtle invisible randomization to prevent spam block 
            # (Adding 1-3 spaces at the end makes it unique but looks the same)
            message_text = f"{message_text}{' ' * random.randint(1, 3)}"

            print(f"   Message: '{message_text.strip()}'")

            # Send
            success, is_invalid = send_whatsapp(phone_number, message_text)

            if success:
                print(f"✅ Message sent successfully to {phone_number}!")
                supabase.table('whatsapp_marketing').update({'status': 'messaged'}).eq('id', number_id).execute()
                
                # Optimized delay for 3-4 messages per hour (approx 15-20 mins apart)
                sleep_mins = random.randint(15, 20)
                print(f"⏳ Sleeping {sleep_mins} minutes...\n")
                time.sleep(sleep_mins * 60)

            elif is_invalid:
                print(f"🚫 {phone_number} is not on WhatsApp.")
                supabase.table('whatsapp_marketing').update({'status': 'invalid'}).eq('id', number_id).execute()
                time.sleep(2)

            else:
                print(f"❌ Failed to send to {phone_number}. Retrying after 5m.\n")
                time.sleep(5 * 60)

        except Exception as e:
            print(f"❌ Error: {e}")
            time.sleep(5 * 60)

if __name__ == "__main__":
    run_marketing_bot()
