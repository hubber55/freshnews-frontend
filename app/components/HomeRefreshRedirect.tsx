'use client';

import { useEffect } from 'react';

type HomeRefreshRedirectProps = {
  page: number;
  activeTag?: string;
};

export default function HomeRefreshRedirect({ page, activeTag = '' }: HomeRefreshRedirectProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const navigationEntries = window.performance.getEntriesByType('navigation');
    const navigationEntry = navigationEntries[0] as PerformanceNavigationTiming | undefined;
    
    // Support modern and legacy reload detection
    const isReload = 
      navigationEntry?.type === 'reload' || 
      (window.performance.navigation && window.performance.navigation.type === 1);

    if (isReload && activeTag) {
      // Refreshing a tag page should reset to Latest home
      window.location.replace('/');
    }
  }, [activeTag, page]);

  return null;
}
