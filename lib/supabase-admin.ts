import { createRestClient } from './supabase-rest';

export function createAdminClient() {
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

  return createRestClient(supabaseKey);
}
