import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
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
    ) as ReturnType<typeof createServerClient>;
  }

  return createServerClient(
    backendUrl,
    backendAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
