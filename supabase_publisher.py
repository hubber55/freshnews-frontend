"""
Supabase Publisher
------------------
Publishes news articles directly to the Supabase PostgreSQL database.
"""

import os
import logging
from urllib.parse import urlparse, parse_qsl, urlencode
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY, MAX_RECENT_POSTS_CHECK

logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        logger.error(f"  \u274c Failed to initialize Supabase client: {e}")

def get_existing_posts(limit=MAX_RECENT_POSTS_CHECK):
    """Fetch recent posts for duplicate protection."""
    if not supabase:
        return []
        
    try:
        response = (
            supabase.table('posts')
            .select('title, original_url')
            .eq('is_deleted', False)
            .order('published_at', desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []
    except Exception as e:
        logger.error(f"  ❌ Failed to fetch existing posts from Supabase: {e}")
        return []


def get_existing_titles(limit=MAX_RECENT_POSTS_CHECK):
    """Backward-compatible helper returning only titles."""
    posts = get_existing_posts(limit=limit)
    return [row.get('title', '') for row in posts if row.get('title')]


def normalize_url(url: str) -> str:
    """Normalize URL for stable duplicate fingerprinting."""
    if not url:
        return ""
    try:
        parsed = urlparse(url.strip())
        scheme = (parsed.scheme or "https").lower()
        netloc = parsed.netloc.lower().replace("www.", "")
        path = parsed.path.rstrip("/")
        # Keep meaningful query params (some publishers use ?id=... as canonical article id)
        params = parse_qsl(parsed.query, keep_blank_values=True)
        tracking_prefixes = ("utm_", "fbclid", "gclid", "igshid", "mc_cid", "mc_eid")
        filtered = []
        for k, v in params:
            key = (k or "").lower()
            if key in ("ref", "ref_src", "source", "from", "feature", "spm"):
                continue
            if any(key.startswith(prefix) for prefix in tracking_prefixes):
                continue
            filtered.append((key, v))
        filtered.sort(key=lambda x: (x[0], x[1]))
        query = urlencode(filtered, doseq=True)
        return f"{scheme}://{netloc}{path}" + (f"?{query}" if query else "")
    except Exception:
        return (url or "").strip().lower()


def url_fingerprint(url: str) -> str:
    normalized = normalize_url(url)
    if not normalized:
        return ""
    # Must match DB migration fingerprint function (md5 in schema.sql)
    import hashlib
    return hashlib.md5(normalized.encode("utf-8")).hexdigest()

def publish_via_supabase(article):
    """
    Publish a single article to the Supabase 'posts' table.
    """
    if not supabase:
        logger.error("  \u274c Supabase client not initialized. Check your .env file.")
        return False

    title = article.get("title", "Untitled")
    summary = article.get("summary", "")
    image_url = article.get("image_url", "")
    source_name = article.get("source_name", "News")
    # Store tags as a list for Postgres array
    tags = [source_name] + article.get("tags", [])
    original_url = article.get("link", "")
    original_url_fingerprint = url_fingerprint(original_url)

    # FAQ data from AI (list of {q, a} dicts) — stored as JSONB
    faq = article.get("faq", [])

    from datetime import datetime, timezone
    published_at = article.get("published")
    if isinstance(published_at, datetime):
        published_at_str = published_at.isoformat()
    elif isinstance(published_at, str):
        published_at_str = published_at
    else:
        published_at_str = datetime.now(timezone.utc).isoformat()

    try:
        # 1. Insert row into the 'posts' table
        post_response = supabase.table('posts').insert({
            "title": title,
            "summary": summary,
            "image_url": image_url,
            "source_name": source_name,
            "tags": tags,
            "original_url": original_url,
            "original_url_fingerprint": original_url_fingerprint or None,
            "faq": faq if faq else None,
            "published_at": published_at_str,
        }).execute()

        if not post_response.data or len(post_response.data) == 0:
            logger.error("  ❌ Post insertion failed - no data returned.")
            return False

        post_id = post_response.data[0]['id']
        logger.info(f"  ✅ Post {post_id} inserted successfully into Supabase!")

        # 2. Handle Bogus Comments
        bogus_comments = article.get("bogus_comments", [])
        if bogus_comments:
            logger.info(f"  💬 Inserting {len(bogus_comments)} bogus comments...")
            
            # Helper to get or create a ghost user
            def get_ghost_user_id(username):
                try:
                    # Check if user exists
                    user_res = supabase.table('wa_users').select('id').eq('username', username).execute()
                    if user_res.data and len(user_res.data) > 0:
                        return user_res.data[0]['id']
                    
                    # Create ghost user with just username
                    create_res = supabase.table('wa_users').insert({
                        "username": username,
                        "whatsapp_number": f"ghost_{username.lower()}"
                    }).execute()
                    
                    if create_res.data and len(create_res.data) > 0:
                        return create_res.data[0]['id']
                except Exception as ex:
                    logger.warning(f"  ⚠️ Error handling ghost user {username}: {ex}")
                return None

            inserted_comments = []
            for i, c in enumerate(bogus_comments):
                uid = get_ghost_user_id(c['username'])
                if not uid:
                    continue
                
                comment_data = {
                    "post_id": post_id,
                    "user_id": uid,
                    "content": c['text'],
                    "is_approved": True
                }
                
                # If we had parent_id support, we'd add it here
                # if c['is_reply'] and c['reply_index'] is not None and c['reply_index'] < i:
                #    parent = inserted_comments[c['reply_index']]
                #    comment_data["parent_id"] = parent['id']

                res = supabase.table('comments').insert(comment_data).execute()
                if res.data and len(res.data) > 0:
                    inserted_comments.append(res.data[0])

            logger.info(f"  ✅ {len(inserted_comments)} bogus comments added.")

        return True
    except Exception as e:
        err = str(e).lower()
        if "duplicate key value violates unique constraint" in err and "original_url_fingerprint" in err:
            logger.warning(f"  🔁 Duplicate blocked by DB unique guard for URL: {original_url}")
            return False
        logger.error(f"  ❌ Supabase operation failed: {e}")
        return False

def get_recent_posts(limit=20):
    """Fetch the most recent posts to check for broken images."""
    if not supabase:
        return []
    try:
        response = supabase.table('posts').select('id, title, image_url').eq('is_deleted', False).order('published_at', desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        logger.error(f"  ❌ Failed to fetch recent posts: {e}")
        return []

def soft_delete_post(post_id, reason="Admin Request"):
    """Permanently delete a post (Hard delete)."""
    if not supabase:
        return False
    try:
        supabase.table('posts').delete().eq('id', post_id).execute()
        logger.warning(f"  🗑️ Permanently deleted post {post_id}: {reason}")
        return True
    except Exception as e:
        logger.error(f"  ❌ Delete failed for {post_id}: {e}")
        return False
