'use client';

import { useEffect } from 'react';

type HomeRefreshRedirectProps = {
  page: number;
  activeTag?: string;
};

export default function HomeRefreshRedirect({ page, activeTag = '' }: HomeRefreshRedirectProps) {
  useEffect(() => {
    if (page <= 1 || typeof window === 'undefined') {
      return;
    }

    const navigationEntries = window.performance.getEntriesByType('navigation');
    const navigationEntry = navigationEntries[0] as PerformanceNavigationTiming | undefined;
    const isReload = navigationEntry?.type === 'reload';

    if (!isReload) {
      return;
    }

    const target = activeTag ? `/?tag=${encodeURIComponent(activeTag)}` : '/';
    window.location.replace(target);
  }, [activeTag, page]);

  return null;
}
