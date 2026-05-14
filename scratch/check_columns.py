
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_users():
    res = supabase.table('wa_users').select('*').limit(1).execute()
    print("Columns in wa_users:", res.data[0].keys() if res.data else "No data")
    if res.data:
        print("Sample user:", res.data[0])

check_users()
