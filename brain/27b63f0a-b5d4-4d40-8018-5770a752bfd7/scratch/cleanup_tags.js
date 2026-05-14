const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manual env loader
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '');
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

async function cleanupTags() {
  console.log('Fetching posts...');
  const { data, error } = await supabase
    .from('posts')
    .select('id, tags')
    .not('tags', 'is', null);

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  console.log(`Processing ${data.length} posts...`);
  let updatedCount = 0;

  for (const post of data) {
    if (!Array.isArray(post.tags)) continue;

    const lowTags = Array.from(new Set(post.tags.map(t => t.trim().toLowerCase()))).filter(Boolean);
    
    // Sort both to compare arrays accurately
    const originalSorted = [...post.tags].sort();
    const newSorted = [...lowTags].sort();

    if (JSON.stringify(originalSorted) !== JSON.stringify(newSorted)) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ tags: lowTags })
        .eq('id', post.id);

      if (updateError) {
        console.error(`Error updating post ${post.id}:`, updateError);
      } else {
        updatedCount++;
        if (updatedCount % 10 === 0) console.log(`Updated ${updatedCount} posts...`);
      }
    }
  }

  console.log(`Cleanup complete. Total posts updated: ${updatedCount}`);
}

cleanupTags();
