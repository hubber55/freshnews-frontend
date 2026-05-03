'use client';

import { useEffect } from 'react';

export default function AuthHashHandler() {
  useEffect(() => {
    try {
      // Supabase recovery links often land with access_token in the hash fragment.
      // Handle it client-side and move to a dedicated callback page that consumes it.
      const hash = window.location.hash ?? '';
      if (!hash) return;

      const isSupabaseHash =
        hash.includes('access_token=') ||
        hash.includes('refresh_token=') ||
        hash.includes('type=recovery') ||
        hash.includes('type=magiclink');

      if (!isSupabaseHash) return;

      const target = `/auth/callback${hash}`;
      window.location.replace(target);
    } catch {
      // ignore
    }
  }, []);

  return null;
}

