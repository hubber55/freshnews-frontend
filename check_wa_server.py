import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Configuration from .env
IP = os.getenv("WA_EC2_IP", "127.0.0.1")
KEY = os.getenv("WA_API_KEY", "")
INSTANCE = os.getenv("WA_INSTANCE", "VercelBot2")
BASE_URL = os.getenv("WA_API_URL", f"http://{IP}:8080").strip().rstrip('/')

def run_diagnostics():
    print(f"\n========================================")
    print(f"🔍 WhatsApp API Diagnostics")
    print(f"========================================")
    print(f"Target IP: {IP}")
    print(f"Instance:  {INSTANCE}")
    print(f"--------------------------------\n")

    # 1. Check Server Connection
    print("1️⃣  Checking Server Connectivity...")
    try:
        resp = requests.get(BASE_URL, timeout=5)
        if resp.status_code == 200:
            version = resp.json().get('version', 'Unknown')
            print(f"✅ Server is UP (Version: {version})")
        else:
            print(f"❌ Server responded with code {resp.status_code}")
    except Exception as e:
        print(f"❌ Could not reach server: {e}")
        print("   Tip: Check if the Evolution API is running and if port 8080 is open in EC2 Security Group.")
        return

    # 2. Check Authentication & Instances
    print("\n2️⃣  Checking API Key & Instances...")
    headers = {"apikey": KEY}
    try:
        # Try fetchInstances (Standard for Global API Key)
        resp = requests.get(f"{BASE_URL}/instance/fetchInstances", headers=headers, timeout=10)
        
        if resp.status_code == 401:
            print("❌ API Key Rejected: You are likely using an Instance-Level key or it has expired.")
            print("   Action: Use the GLOBAL_API_KEY from your Evolution API environment config.")
        elif resp.status_code == 200:
            instances = resp.json()
            print(f"✅ Authentication Successful!")
            print(f"   Found {len(instances)} active instances.")
            # Extract names from the list
            instance_names = []
            for item in instances:
                # Handle different API response structures
                if isinstance(item, dict):
                    name = item.get('instanceName') or item.get('instance', {}).get('instanceName')
                    if name: instance_names.append(name)
            
            print(f"   Available Instances: {instance_names}")
        else:
            print(f"❓ Unexpected response when listing instances: {resp.status_code}")
    except Exception as e:
        print(f"❌ Error listing instances: {e}")

    # 3. Check Specific Instance Status
    print(f"\n3️⃣  Checking specific status for '{INSTANCE}'...")
    try:
        resp = requests.get(f"{BASE_URL}/instance/connectionState/{INSTANCE}", headers=headers, timeout=10)
        if resp.status_code == 200:
            # Structure check for 1.8.x
            data = resp.json()
            state = data.get('instance', {}).get('state') or data.get('state', 'Unknown')
            print(f"✅ Instance Found! State: {state}")
            if state != "open":
                print(f"   ⚠️  Warning: Instance is not 'open'. You may need to scan the QR code.")
        elif resp.status_code == 404:
            print(f"❌ Instance MISSING: '{INSTANCE}' does not exist on this server.")
            print(f"   Action: You need to re-create this instance name in Evolution API.")
        else:
            print(f"❌ API Error {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"❌ Error checking instance: {e}")

    print(f"\n========================================\n")

if __name__ == "__main__":
    run_diagnostics()
