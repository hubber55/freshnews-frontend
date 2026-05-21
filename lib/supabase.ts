import { createRestClient } from './supabase-rest';

const backendAnonKey =
  process.env.NEXT_PUBLIC_BACKEND_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const supabase = createRestClient(backendAnonKey);
