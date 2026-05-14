import { createAdminClient } from './lib/supabase-admin';

async function checkTable() {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching push_subscriptions:', error.message);
  } else {
    console.log('Push subscriptions count:', count);
  }
}

checkTable();
