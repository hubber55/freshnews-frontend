'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 80; // px to pull before triggering
const RESISTANCE = 2.5; // how much drag slows pull

type Phase = 'idle' | 'pulling' | 'refreshing' | 'done';

export default function PullToRefresh() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [pullY, setPullY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  useEffect(() => {
    // Only enable on touch devices
    if (typeof window === 'undefined' || !('ontouchstart' in window)) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only start if we're scrolled to the very top
      if (window.scrollY > 4) return;
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        startYRef.current = null;
        return;
      }
      // Only pull if still near top
      if (window.scrollY > 4) {
        startYRef.current = null;
        return;
      }
      isPullingRef.current = true;
      const resistance = Math.min(delta / RESISTANCE, THRESHOLD + 30);
      setPullY(resistance);
      setPhase('pulling');
    };

    const onTouchEnd = async () => {
      if (!isPullingRef.current) return;
      startYRef.current = null;
      isPullingRef.current = false;

      if (pullY >= THRESHOLD / RESISTANCE) {
        setPhase('refreshing');
        setPullY(0);
        try {
          await fetch('/api/revalidate-home', { method: 'POST' });
          // Small delay so server cache can propagate
          await new Promise(r => setTimeout(r, 800));
        } catch {/* ignore */}
        setPhase('done');
        setTimeout(() => {
          window.location.reload();
        }, 300);
      } else {
        setPullY(0);
        setPhase('idle');
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullY]);

  if (phase === 'idle') return null;

  const isRefreshing = phase === 'refreshing' || phase === 'done';
  const progress = Math.min(pullY / (THRESHOLD / RESISTANCE), 1);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center transition-all duration-200 pointer-events-none"
      style={{ height: isRefreshing ? '60px' : `${Math.max(pullY, 0)}px` }}
    >
      <div
        className="flex flex-col items-center justify-center gap-1 rounded-full bg-[#161b22]/95 border border-[#30363d] px-5 py-2.5 shadow-2xl backdrop-blur-xl"
        style={{ opacity: isRefreshing ? 1 : progress }}
      >
        <RefreshCw
          size={20}
          className={`text-[#ffd42a] transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
          style={isRefreshing ? {} : { transform: `rotate(${progress * 360}deg)` }}
        />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/70 leading-none">
          {isRefreshing ? 'Refreshing...' : progress >= 1 ? 'Release!' : 'Pull to Refresh'}
        </span>
      </div>
    </div>
  );
}
