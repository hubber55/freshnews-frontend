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

    try:
        # Insert row into the 'posts' table
        data, count = supabase.table('posts').insert({
            "title": title,
            "summary": summary,
            "image_url": image_url,
            "source_name": source_name,
            "tags": tags,
            "original_url": original_url,
            "original_url_fingerprint": original_url_fingerprint or None,
        }).execute()

        logger.info(f"  \u2705 Inserted successfully into Supabase!")
        return True
    except Exception as e:
        err = str(e).lower()
        if "duplicate key value violates unique constraint" in err and "original_url_fingerprint" in err:
            logger.warning(f"  🔁 Duplicate blocked by DB unique guard for URL: {original_url}")
            return False
        logger.error(f"  ❌ Supabase insert failed: {e}")
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
    """Mark a post as deleted instead of removing it (SEO safety)."""
    if not supabase:
        return False
    try:
        supabase.table('posts').update({"is_deleted": True}).eq('id', post_id).execute()
        logger.warning(f"  🗑️ Soft deleted post {post_id}: {reason}")
        return True
    except Exception as e:
        logger.error(f"  ❌ Soft delete failed for {post_id}: {e}")
        return False
