'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';

export function useUser() {
  const supabase = createClient();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
      } else {
        setUser(data.user);
      }
      setLoading(false);
    }

    getUser();
  }, []);

  return { user, loading };
}
