const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env manually
const envPath = path.resolve(__dirname, '../.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing keys');
    process.exit(1);
}

const s = createClient(supabaseUrl, supabaseKey);

async function fix() {
    console.log('Attempting to create bucket...');
    const { data, error } = await s.storage.createBucket('poll-assets', { public: true });
    console.log('Create result:', { data, error });

    console.log('Ensuring SQL policies...');
    const sql = `
        INSERT INTO storage.buckets (id, name, public) VALUES ('poll-assets', 'poll-assets', true) ON CONFLICT (id) DO UPDATE SET public = true;
        
        -- Delete existing if any to avoid duplicates
        DROP POLICY IF EXISTS "Public Access" ON storage.objects;
        DROP POLICY IF EXISTS "Anon Upload" ON storage.objects;
        
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'poll-assets');
        CREATE POLICY "Anon Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'poll-assets');
    `;
    const { data: d2, error: e2 } = await s.rpc('run_sql', { sql });
    console.log('SQL result:', { d2, e2 });
}

fix();
