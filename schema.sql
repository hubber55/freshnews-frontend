-- FreshNews Supabase Schema Updates

-- Adding DELETE functionality and SEO Re-routing to existing posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS redirect_to TEXT DEFAULT NULL;

-- Adding FAQ data (AI-generated Q&A pairs) stored as JSONB
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT NULL;

-- Adding Locked Posts functionality
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS locked_position INTEGER DEFAULT NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- WhatsApp Auth Users
CREATE TABLE public.wa_users (
    id SERIAL PRIMARY KEY,
    whatsapp_number TEXT UNIQUE NOT NULL,
    name TEXT,
    username TEXT UNIQUE,
    username_edit_count INTEGER DEFAULT 0,
    email TEXT,
    email_edit_count INTEGER DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
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

-- Enable RLS for wa_users (already enabled on droplet, documented here)
ALTER TABLE public.wa_users ENABLE ROW LEVEL SECURITY;

-- Allow public read for wa_users (needed to show names/usernames in comments)
CREATE POLICY "Allow public read wa_users" ON public.wa_users FOR SELECT USING (true);

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

-- Categories for Ads/Classifieds
CREATE TABLE public.ad_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subcategories
CREATE TABLE public.ad_subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES public.ad_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

CREATE TABLE public.submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.wa_users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'news', 'classified', or 'ad'
    title VARCHAR(70) NOT NULL,
    content VARCHAR(500) NOT NULL,
    tags TEXT[],
    category_id INTEGER REFERENCES public.ad_categories(id),
    subcategory_id INTEGER REFERENCES public.ad_subcategories(id),
    image_url TEXT,
    external_url TEXT,
    hyperlink_text TEXT,
    location TEXT, -- e.g. "Kerala, Ernakulam, Aluva"
    is_premium BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.ad_news (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    title VARCHAR(70) NOT NULL,
    content VARCHAR(500) NOT NULL,
    tags TEXT[],
    image_url TEXT,
    location TEXT, -- e.g. "Kerala, Ernakulam, Aluva"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

INSERT INTO public.admin_settings (key, value) VALUES ('admin_whatsapp_number', '') ON CONFLICT (key) DO NOTHING;

-- WhatsApp Marketing Campaign
CREATE TABLE IF NOT EXISTS public.whatsapp_marketing (
    id SERIAL PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'messaged', 'replied'
    category TEXT DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp Message Templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

