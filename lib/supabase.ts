import { createRestClient } from './supabase-rest';

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createRestClient(supabaseAnonKey);
