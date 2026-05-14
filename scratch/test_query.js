const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('wa_users')
    .select('id, whatsapp_number, name, username, email, username_edit_count, email_edit_count, is_blocked');
  
  if (error) {
    console.error('ERROR:', error.message);
    console.error('HINT:', error.hint);
  } else {
    console.log('SUCCESS:', data.length, 'users found');
  }
}
test();
