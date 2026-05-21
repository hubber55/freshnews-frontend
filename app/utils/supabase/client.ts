import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  const backendAnonKey =
    process.env.NEXT_PUBLIC_BACKEND_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  if (!backendUrl || !backendAnonKey) {
    return new Proxy(
      {},
      {
        get() {
          throw new Error('Backend environment variables are not configured.');
        },
      }
    ) as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(backendUrl, backendAnonKey);
}
