const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => { 
  const [k, v] = line.split('='); 
  if(k && v) acc[k.trim()] = v.trim().replace(/['"]/g, ''); 
  return acc; 
}, {}); 
const { createClient } = require('@supabase/supabase-js'); 
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY); 
supabase.from('posts').select('created_at').limit(1).then(console.log).catch(console.error);
