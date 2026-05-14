'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

/**
 * SlowNetworkBanner
 *
 * Shows a premium "Network seems slow" notification after 4 seconds
 * IF the page hasn't fully loaded yet. 
 * Automatically disappears after 5 seconds to avoid clutter.
 */
export default function SlowNetworkBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // If page already loaded fast — don't start the timer at all
    if (document.readyState === 'complete') return;

    // Show after 4 seconds if still loading
    const showTimer = setTimeout(() => {
      if (document.readyState !== 'complete') {
        setVisible(true);
        
        // Auto-hide after 5 seconds of visibility
        setTimeout(() => {
          setVisible(false);
        }, 5000);
      }
    }, 4000);

    const onLoad = () => {
      clearTimeout(showTimer);
      setVisible(false);
    };

    window.addEventListener('load', onLoad);

    return () => {
      clearTimeout(showTimer);
      window.removeEventListener('load', onLoad);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      id="slow-network-banner"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-4 bg-[#161b22]/95 border border-[#30363d] rounded-2xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-500 max-w-[90vw] w-max"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500">
        <WifiOff size={20} />
      </div>

      <div className="flex flex-col">
        <span className="text-xs font-black uppercase tracking-widest text-white leading-none mb-1">
          Slow Network
        </span>
        <span className="text-[11px] font-bold text-[var(--text-muted)] leading-tight">
          Connection seems laggy...
        </span>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 bg-[#ffd42a] text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg shadow-yellow-500/20"
      >
        <RefreshCw size={14} />
        Refresh
      </button>
    </div>
  );
}
