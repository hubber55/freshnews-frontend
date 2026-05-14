-- Migration: Placeholder Ads System
-- Created: 2025-05-06

-- Table for placeholder ads (fallback ads managed by admin)
CREATE TABLE IF NOT EXISTS placeholder_ads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- Internal name for admin reference
    image_url TEXT NOT NULL,
    title VARCHAR(150) NOT NULL,
    cta_text VARCHAR(30) DEFAULT 'Learn More', -- Custom button text
    external_url TEXT, -- Optional external link
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 10, -- Lower = higher priority (1-100)
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking placeholder ad impressions/clicks
CREATE TABLE IF NOT EXISTS placeholder_ad_tracking (
    id SERIAL PRIMARY KEY,
    ad_id INTEGER REFERENCES placeholder_ads(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('impression', 'click')),
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_placeholder_ads_active ON placeholder_ads(is_active);
CREATE INDEX IF NOT EXISTS idx_placeholder_ads_priority ON placeholder_ads(priority);
CREATE INDEX IF NOT EXISTS idx_placeholder_ad_tracking_ad_id ON placeholder_ad_tracking(ad_id);
CREATE INDEX IF NOT EXISTS idx_placeholder_ad_tracking_event ON placeholder_ad_tracking(event_type);
CREATE INDEX IF NOT EXISTS idx_placeholder_ad_tracking_created ON placeholder_ad_tracking(created_at);

-- Enable RLS
ALTER TABLE placeholder_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE placeholder_ad_tracking ENABLE ROW LEVEL SECURITY;

-- Policies for placeholder_ads
CREATE POLICY "Placeholder ads are viewable by everyone" 
    ON placeholder_ads FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Only admins can manage placeholder ads" 
    ON placeholder_ads FOR ALL 
    USING (auth.role() = 'authenticated' AND auth.uid() IN (
        SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    ));

-- Policies for tracking (allow inserts from anon for tracking)
CREATE POLICY "Allow tracking inserts" 
    ON placeholder_ad_tracking FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_placeholder_ads_updated_at 
    BEFORE UPDATE ON placeholder_ads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RPC function for atomic counter increment
CREATE OR REPLACE FUNCTION increment_ad_counter(ad_id INTEGER, counter_field TEXT)
RETURNS VOID AS $$
BEGIN
    IF counter_field = 'impressions' THEN
        UPDATE placeholder_ads SET impressions = impressions + 1 WHERE id = ad_id;
    ELSIF counter_field = 'clicks' THEN
        UPDATE placeholder_ads SET clicks = clicks + 1 WHERE id = ad_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE placeholder_ads IS 'Fallback/placeholder ads managed by admin for homepage ad slots';
COMMENT ON TABLE placeholder_ad_tracking IS 'Tracking data for placeholder ad impressions and clicks';
COMMENT ON COLUMN placeholder_ads.cta_text IS 'Custom call-to-action button text (e.g., Visit Us, Learn More, Book Now)';
COMMENT ON COLUMN placeholder_ads.priority IS 'Ad priority - lower numbers shown first (1=highest, 100=lowest)';
