
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def diagnose():
    # 1. Fetch latest 5 comments
    print("--- Latest 5 Comments ---")
    res = supabase.table('comments').select('*, wa_users(*)').order('created_at', desc=True).limit(5).execute()
    
    for c in res.data:
        print(f"Comment ID: {c.get('id')}")
        print(f"Post ID: {c.get('post_id')}")
        print(f"User ID: {c.get('user_id')}")
        print(f"Content: {c.get('content')}")
        print(f"wa_users join result: {c.get('wa_users')}")
        
        # 2. Manual check for the user
        uid = c.get('user_id')
        if uid:
            user_res = supabase.table('wa_users').select('*').eq('id', uid).execute()
            print(f"Manual user lookup for {uid}: {user_res.data}")
        print("-" * 30)

diagnose()
