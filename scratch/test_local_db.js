const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [k, v] = line.strip ? line.strip().split('=') : line.trim().split('=');
    env[k.trim()] = v.trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Connecting to:', url);

const supabase = createClient(url, key);

async function check() {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('id, title, image_url, post_id, status')
      .eq('type', 'classified')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('API Error:', error);
    } else {
      console.log('Submissions:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('Unhandled error:', e);
  }
}

check();
