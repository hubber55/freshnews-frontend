const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkImages() {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, title, image_url, type')
    .eq('type', 'classified')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample image URLs:');
    data.forEach(item => {
      console.log(`ID: ${item.id}, Title: ${item.title}`);
      console.log(`Image URL: ${item.image_url}`);
      console.log('---');
    });
  }
}

checkImages();

