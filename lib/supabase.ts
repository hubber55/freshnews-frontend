import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function createSafeSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Proxy(
      {},
      {
        get() {
          throw new Error('Supabase environment variables are not configured.');
        },
      }
    ) as ReturnType<typeof createClient>;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSafeSupabaseClient();
