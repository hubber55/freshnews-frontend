'use client';

import { useEffect } from 'react';

export default function ClassifiedsRefreshRedirect() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const navigationEntries = window.performance.getEntriesByType('navigation');
    const navigationEntry = navigationEntries[0] as PerformanceNavigationTiming | undefined;
    
    // Support modern and legacy reload detection
    const isReload = 
      navigationEntry?.type === 'reload' || 
      (window.performance.navigation && window.performance.navigation.type === 1);

    if (isReload) {
      // If refreshed, go to main classifieds home
      window.location.replace('/classifieds');
    }
  }, []);

  return null;
}
