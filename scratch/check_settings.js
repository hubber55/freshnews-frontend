const { createClient } = require('@supabase/supabase-js');

// Manually set these if needed, but they should be in env
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function check() {
  const { data } = await supabase.from('admin_settings').select('*');
  console.log(JSON.stringify(data, null, 2));
}

check();
