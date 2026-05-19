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

    print("=== Supabase Post Dates Diagnostics ===")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Query last 30 posts from database
    res = supabase.table('posts').select('id, source_name, title, published_at').order('published_at', desc=True).limit(30).execute()
    
    for post in res.data:
        print(f"[{post['source_name']}] Post ID: {post['id']}")
        print(f"  Title: {post['title'][:60]}")
        print(f"  Published At (DB): {post['published_at']}")
        print("-" * 50)

if __name__ == "__main__":
    check()
