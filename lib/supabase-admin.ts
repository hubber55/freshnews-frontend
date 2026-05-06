import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return new Proxy(
      {},
      {
        get() {
          throw new Error('Supabase environment variables are not configured.');
        },
      }
    ) as ReturnType<typeof createClient>;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
