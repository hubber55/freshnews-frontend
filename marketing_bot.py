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
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Setup Evolution API
WA_EC2_IP = os.getenv("WA_EC2_IP", "127.0.0.1")
WA_API_KEY = os.getenv("WA_API_KEY", "")
WA_ENDPOINT = f"http://{WA_EC2_IP}:8080/message/sendText/VercelBot2"

def get_ist_time():
    """Returns current time in Indian Standard Time (IST)"""
    utc_now = datetime.now(timezone.utc).replace(tzinfo=None)
    ist_now = utc_now + timedelta(hours=5, minutes=30)
    return ist_now

def run_marketing_bot():
    print("========================================")
    print("🚀 WhatsApp Marketing Drip Bot Started")
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
            
            # If no numbers are there, do nothing and wait 5 minutes
            if not response.data:
                print(f"[{ist_now.strftime('%I:%M %p')}] No pending numbers found. Waiting 5 mins...")
                time.sleep(5 * 60)
                continue
                
            target = response.data[0]
            number_id = target['id']
            phone_number = target['phone_number']
            category = target['category']
            
            print(f"[{ist_now.strftime('%I:%M %p')}] Processing number {phone_number} for category '{category}'...")
            
            # 3. Get templates for this exact category
            templates_resp = supabase.table('whatsapp_templates').select('message_text').eq('category', category).execute()
            
            if not templates_resp.data:
                print(f"⚠️ WARNING: No templates found for category '{category}'. Falling back to default message.")
                message_text = "Hi, is this still available?"
            else:
                # Pick a random template from the ones you added in the Admin Panel
                templates = [t['message_text'] for t in templates_resp.data]
                message_text = random.choice(templates)
                
            # 4. Send via Evolution API
            headers = {
                "Content-Type": "application/json",
                "apikey": WA_API_KEY
            }
            payload = {
                "number": phone_number,
                "textMessage": {
                    "text": message_text
                }
            }
            
            print(f"💬 Sending message: '{message_text}'")
            api_resp = requests.post(WA_ENDPOINT, headers=headers, json=payload, timeout=10)
            
            if api_resp.status_code in [200, 201]:
                print(f"✅ Message sent successfully to {phone_number}!")
                # Update status to 'messaged' so we never contact them again
                supabase.table('whatsapp_marketing').update({'status': 'messaged'}).eq('id', number_id).execute()
            else:
                print(f"❌ Failed to send message: HTTP {api_resp.status_code} - {api_resp.text}")
                # We do not update the DB, it will retry on the next loop
                
            # 5. Drip Feed Delay: Sleep between 10 to 15 minutes to avoid WhatsApp bans
            sleep_time = random.randint(10 * 60, 15 * 60)
            print(f"⏳ Sleeping for {sleep_time // 60} minutes to prevent spam detection...\n")
            time.sleep(sleep_time)

        except Exception as e:
            print(f"❌ Error in marketing loop: {e}")
            time.sleep(5 * 60)

if __name__ == "__main__":
    run_marketing_bot()
