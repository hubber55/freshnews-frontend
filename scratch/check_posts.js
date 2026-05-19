const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    // remove surrounding quotes
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    envVars[key] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Could not read NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY from .env.local');
  process.exit(1);
}

console.log('Connecting to:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPosts() {
  try {
    // 1. Total count of posts in DB
    const { count: totalCount, error: countError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    console.log('Total posts in database:', totalCount);

    // 2. Count of non-deleted posts
    const { count: activeCount, error: activeError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    if (activeError) throw activeError;
    console.log('Active (is_deleted = false) posts:', activeCount);

    // 3. Min/Max dates
    const { data: dateRange, error: dateError } = await supabase
      .from('posts')
      .select('published_at')
      .order('published_at', { ascending: true })
      .limit(5);

    if (dateError) throw dateError;
    console.log('Earliest 5 posts (published_at):', dateRange.map(p => p.published_at));

    const { data: latestRange, error: latestError } = await supabase
      .from('posts')
      .select('published_at')
      .order('published_at', { ascending: false })
      .limit(5);

    if (latestError) throw latestError;
    console.log('Latest 5 posts (published_at):', latestRange.map(p => p.published_at));

    // 4. Check if some posts have less than 10 words in summary (which might be filtered out by hasMinimumWords)
    const { data: postsForCheck, error: checkError } = await supabase
      .from('posts')
      .select('id, title, summary, published_at')
      .order('published_at', { ascending: false })
      .limit(20);

    if (checkError) throw checkError;
    console.log('\nChecking first 20 posts summary lengths:');
    postsForCheck.forEach((p, i) => {
      const words = (p.summary || '').trim().split(/\s+/).filter(Boolean).length;
      console.log(`[${i+1}] ID: ${p.id}, Words in summary: ${words}, Date: ${p.published_at}, Title: ${p.title.substring(0, 40)}...`);
    });

  } catch (err) {
    console.error('Error checking database:', err.message);
  }
}

checkPosts();
