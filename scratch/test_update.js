import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const { data: sub, error: fetchErr } = await supabase
    .from('submissions')
    .select('*')
    .limit(1)
    .single();
    
  if (fetchErr) {
    console.error("Fetch Error:", fetchErr);
    return;
  }
  
  const updateData = {
    status: 'pending',
    updated_at: new Date().toISOString(),
    image_url: null,
    event_date: null,
    category: null
  };
  
  const { data, error } = await supabase
    .from('submissions')
    .update(updateData)
    .eq('id', sub.id)
    .select();
    
  if (error) {
    console.error("Update Error:", error);
  } else {
    console.log("Success with null:", data);
  }

  // Now test with ""
  const updateDataBad = {
    status: 'pending',
    updated_at: new Date().toISOString(),
    image_url: null,
    event_date: "",
    category: ""
  };
  
  const { data: dataBad, error: errorBad } = await supabase
    .from('submissions')
    .update(updateDataBad)
    .eq('id', sub.id)
    .select();

  if (errorBad) {
    console.error("Update Error with empty string:", errorBad);
  } else {
    console.log("Success with empty string:", dataBad);
  }
}

testUpdate();
