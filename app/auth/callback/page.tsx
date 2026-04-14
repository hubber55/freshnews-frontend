'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();

      // Stores session based on URL hash/query if present.
      // Works for recovery/magic links depending on project auth settings.
      try {
        await supabase.auth.getSessionFromUrl({ storeSession: true });
      } catch {
        // ignore
      }

      const next = searchParams.get('next') || '/admin/posts';
      router.replace(next);
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

