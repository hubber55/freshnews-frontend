const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''; 
const supabaseKey = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.BACKEND_KEY || process.env.SUPABASE_KEY || ''; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixImageUrls() {
  console.log('Fetching submissions with image URLs...');
  
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('id, image_url')
    .not('image_url', 'is', null);
  
  if (error) {
    console.error('Error fetching submissions:', error);
    return;
  }
  
  console.log(`Found ${submissions.length} submissions with images`);
  
  let updated = 0;
  for (const sub of submissions) {
    if (!sub.image_url) continue;
    
    // Replace old Supabase cloud URL with new DigitalOcean URL
    const oldUrl = 'https://luvdgrpykesexfuqgvvt.supabase.co';
    const newUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    
    if (sub.image_url.includes(oldUrl)) {
      const newImageUrl = sub.image_url.replace(oldUrl, newUrl);
      
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ image_url: newImageUrl })
        .eq('id', sub.id);
      
      if (updateError) {
        console.error(`Error updating submission ${sub.id}:`, updateError);
      } else {
        console.log(`✅ Updated submission ${sub.id}`);
        updated++;
      }
    }
  }
  
  console.log(`\n✅ Total updated: ${updated} submissions`);
}

fixImageUrls();

