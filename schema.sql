-- FreshNews Supabase Schema Updates

-- Adding DELETE functionality and SEO Re-routing to existing posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS redirect_to TEXT DEFAULT NULL;

-- WhatsApp Auth Users
CREATE TABLE public.wa_users (
    id SERIAL PRIMARY KEY,
    whatsapp_number TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp OTPs
CREATE TABLE public.wa_otps (
    id SERIAL PRIMARY KEY,
    whatsapp_number TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments
CREATE TABLE public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.wa_users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Allow public read for comments
CREATE POLICY "Allow public read comments" ON public.comments FOR SELECT USING (true);

-- Allow authenticated users to insert comments (but since using custom auth, allow all for simplicity)
CREATE POLICY "Allow insert comments" ON public.comments FOR INSERT WITH CHECK (true);

-- DB-level duplicate guard for source URLs
-- 1) Add deterministic URL fingerprint column
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS original_url_fingerprint TEXT;

-- 2) Backfill fingerprint for existing rows (normalized URL: remove scheme/www/query/fragment/trailing slash)
UPDATE public.posts
SET original_url_fingerprint = md5(
    lower(
        regexp_replace(
            regexp_replace(
                regexp_replace(coalesce(original_url, ''), '^https?://(www\.)?', ''),
                '[?#].*$',
                ''
            ),
            '/+$',
            ''
        )
    )
)
WHERE coalesce(trim(original_url), '') <> ''
  AND coalesce(trim(original_url_fingerprint), '') = '';

-- 3) If historical duplicates exist, keep newest fingerprinted row and null older duplicates
WITH ranked AS (
    SELECT
        id,
        original_url_fingerprint,
        ROW_NUMBER() OVER (
            PARTITION BY original_url_fingerprint
            ORDER BY published_at DESC NULLS LAST, id DESC
        ) AS rn
    FROM public.posts
    WHERE original_url_fingerprint IS NOT NULL
)
UPDATE public.posts p
SET original_url_fingerprint = NULL
FROM ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- 4) Enforce uniqueness at DB layer for future inserts
CREATE UNIQUE INDEX IF NOT EXISTS posts_original_url_fingerprint_unique
ON public.posts(original_url_fingerprint)
WHERE original_url_fingerprint IS NOT NULL;
