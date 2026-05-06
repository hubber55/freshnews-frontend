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

# Setup Site API (Uses the same route as OTPs to ensure delivery)
SITE_URL = os.getenv("SITE_URL", "https://freshnews.top")
WA_API_ENDPOINT = f"{SITE_URL}/api/send-whatsapp"

def get_ist_time():
    """Returns current time in Indian Standard Time (IST)"""
    utc_now = datetime.now(timezone.utc).replace(tzinfo=None)
    ist_now = utc_now + timedelta(hours=5, minutes=30)
    return ist_now

def send_whatsapp(phone_number: str, message_text: str) -> tuple[bool, bool]:
    """
    Send a WhatsApp message via the FreshNews Site API.
    Returns (success: bool, is_invalid: bool)
    """
    try:
        payload = {
            "to": phone_number,
            "message": message_text
        }
        
        # We call our own website's API which is already working for OTPs
        resp = requests.post(WA_API_ENDPOINT, json=payload, timeout=30)
        
        print(f"   Site API Response ({resp.status_code}): {resp.text[:300]}")

        if resp.status_code == 200:
            return True, False
            
        # Check if the error body indicates a non-WhatsApp number
        if resp.status_code == 400:
            try:
                data = resp.json()
                if data.get('isInvalidNumber') is True or "exists" in resp.text.lower():
                    print(f"⚠️  Number {phone_number} is NOT on WhatsApp (confirmed by Site API).")
                    return False, True
            except:
                pass

        return False, False

    except Exception as e:
        print(f"❌ Error calling Site API: {e}")
        return False, False

def run_marketing_bot():
    print("========================================")
    print("🚀 WhatsApp Marketing Drip Bot Started")
    print(f"   Mode: Routing via Site API ({SITE_URL})")
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

            # 4. Send via Site API (Parity with OTPs)
            success, is_invalid = send_whatsapp(phone_number, message_text)

            if success:
                print(f"✅ Message delivered via Site API to {phone_number}!")
                supabase.table('whatsapp_marketing').update({'status': 'messaged'}).eq('id', number_id).execute()
                # Normal drip delay only after successful sends
                sleep_mins = random.randint(10, 15)
                print(f"⏳ Sleeping {sleep_mins} minutes to prevent spam detection...\n")
                time.sleep(sleep_mins * 60)

            elif is_invalid:
                # Number not on WhatsApp — mark as invalid and move on immediately (no sleep)
                print(f"🚫 {phone_number} has no WhatsApp. Marking as 'invalid' and skipping.")
                supabase.table('whatsapp_marketing').update({'status': 'invalid'}).eq('id', number_id).execute()
                time.sleep(2)

            else:
                # Real API error — log and wait a bit before retrying
                print(f"❌ Failed to send to {phone_number} via Site API. Will retry after 5 mins.\n")
                time.sleep(5 * 60)

        except Exception as e:
            print(f"❌ Error in marketing loop: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(5 * 60)

if __name__ == "__main__":
    run_marketing_bot()
