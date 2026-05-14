const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Environment variables not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFaqs() {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('key', 'site_faqs')
    .single();

  if (error) {
    console.error('Error fetching FAQs:', error);
  } else {
    console.log('Current site_faqs in DB:');
    console.log(data.value);
  }
}

checkFaqs();
