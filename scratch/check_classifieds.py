import os
from supabase import create_client

def check_env(env_name, url, key):
    print(f"\n--- Checking {env_name}: {url} ---")
    if not url or not key:
        print("Missing URL or Key")
        return
    try:
        supabase = create_client(url, key)
        res_sub = supabase.table('submissions').select('id, title, image_url, post_id, status').eq('type', 'classified').order('created_at', desc=True).limit(5).execute()
        print(f"Found {len(res_sub.data or [])} submissions:")
        for row in res_sub.data or []:
            print(f"Sub ID: {row['id']} | Status: {row['status']} | Post ID: {row['post_id']}")
            print(f"  Title: {row['title']}")
            print(f"  Image URL: {row['image_url']}")
            
        print("\n--- Fetching Posts ---")
        post_ids = [row['post_id'] for row in res_sub.data or [] if row['post_id']]
        if post_ids:
            res_posts = supabase.table('posts').select('id, title, image_url').in_('id', post_ids).execute()
            for row in res_posts.data or []:
                print(f"Post ID: {row['id']}")
                print(f"  Title: {row['title']}")
                print(f"  Image URL: {row['image_url']}")
    except Exception as e:
        print(f"Error querying: {e}")

# Read from .env.local
env_local_url = None
env_local_key = None
if os.path.exists('.env.local'):
    with open('.env.local') as f:
        for line in f:
            if '=' in line:
                k, v = line.strip().split('=', 1)
                if k == 'NEXT_PUBLIC_SUPABASE_URL':
                    env_local_url = v
                elif k == 'SUPABASE_SERVICE_ROLE_KEY':
                    env_local_key = v

# Read from .env
env_url = None
env_key = None
if os.path.exists('.env'):
    with open('.env') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                # Strip quotes if any
                v = v.strip('"\'')
                if k == 'SUPABASE_URL':
                    env_url = v
                elif k == 'SUPABASE_KEY':
                    env_key = v

check_env('.env.local', env_local_url, env_local_key)
check_env('.env', env_url, env_key)
