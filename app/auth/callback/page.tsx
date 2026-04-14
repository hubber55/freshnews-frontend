'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';

function parseHashParams(hash: string) {
  const raw = (hash || '').replace(/^#/, '');
  const params = new URLSearchParams(raw);
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type'),
  };
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();

      try {
        const { access_token, refresh_token } = parseHashParams(window.location.hash);

        // Most recovery/magic links land with tokens in the hash fragment.
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        } else {
          // Fallback for flows that might use code in query.
          await supabase.auth.getSessionFromUrl({ storeSession: true });
        }
      } catch {
        // ignore
      }

      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          const next = searchParams.get('next') || '/admin/posts';
          window.location.replace(next);
          return;
        }
      } catch {
        // ignore
      }

      // If we couldn't establish a session, send them to login explicitly.
      window.location.replace('/admin/login');
    };

    run();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-en)' }}>Signing you in…</div>
        <div className="mt-2 text-sm text-[var(--text-muted)]">Please wait.</div>
      </div>
    </main>
  );
}
