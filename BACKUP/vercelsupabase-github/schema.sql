-- FreshNews Supabase Schema

-- Create the posts table
CREATE TABLE public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    image_url TEXT,
    source_name TEXT,
    tags TEXT[] DEFAULT '{}',
    original_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Allow ANYONE to READ the news posts (for your Next.js website)
CREATE POLICY "Allow public read access" 
ON public.posts 
FOR SELECT 
USING (true);

-- Allow ANYONE to INSERT posts (so our python script works easily with the publishable key)
-- Note: If you want better security later, we can restrict this to service_role only.
CREATE POLICY "Allow public insert access" 
ON public.posts 
FOR INSERT 
WITH CHECK (true);

-- Adding DELETE functionality and SEO Re-routing
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS redirect_to TEXT DEFAULT NULL;

