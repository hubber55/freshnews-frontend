const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubmissions() {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, title, post_id, status')
    .eq('type', 'classified')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    return;
  }

  console.table(data);
}

checkSubmissions();
