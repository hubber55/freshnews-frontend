#!/bin/bash

# Migration script to update image URLs from old Supabase to new DigitalOcean storage
# Run this on the DigitalOcean server

cd ~/website

# Create the migration script
cat > migrate_images.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''; 
const supabaseKey = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.BACKEND_KEY || process.env.SUPABASE_KEY || ''; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateImageUrls() {
  console.log('🔍 Fetching submissions with image URLs...');
  
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('id, image_url')
    .not('image_url', 'is', null);
  
  if (error) {
    console.error('❌ Error fetching submissions:', error);
    process.exit(1);
  }
  
  console.log(`📊 Found ${submissions.length} submissions with images`);
  
  let updated = 0;
  let skipped = 0;
  
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
        console.error(`❌ Error updating submission ${sub.id}:`, updateError);
      } else {
        console.log(`✅ Updated submission ${sub.id}: ${sub.image_url.substring(0, 50)}...`);
        updated++;
      }
    } else {
      skipped++;
    }
  }
  
  console.log(`\n✅ Migration complete!`);
  console.log(`📝 Updated: ${updated} submissions`);
  console.log(`⏭️  Skipped: ${skipped} submissions (already using new URL)`);
}

migrateImageUrls().catch(console.error);
EOF

# Run the migration
node migrate_images.js

# Clean up
rm migrate_images.js

