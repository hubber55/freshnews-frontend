import os
from supabase import create_client
from dotenv import load_dotenv

# Load env vars
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def check():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Supabase environment variables missing!")
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Query for the specific Janam TV post
    res_janam = supabase.table('posts').select('id, source_name, image_url, title').ilike('title', '%കല്യാണ സദ്യയിൽ%').execute()
    # Query for the specific Kerala Kaumudi default card post
    res_kk = supabase.table('posts').select('id, source_name, image_url, title').ilike('title', '%മാക്കേക്കടവ്%').execute()
    # Query for the specific Express Kerala post
    res_ek = supabase.table('posts').select('id, source_name, image_url, title').ilike('title', '%പെരിങ്ങനാട്%').execute()
    
    posts = (res_janam.data or []) + (res_kk.data or []) + (res_ek.data or [])
    
    for post in posts:
        print(f"[{post['source_name']}] Post ID: {post['id']}")
        print(f"  Title: {post['title']}")
        print(f"  Image URL: {post['image_url']}")
        print("-" * 50)

if __name__ == "__main__":
    check()
