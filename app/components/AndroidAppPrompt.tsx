'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Download } from 'lucide-react';

export default function AndroidAppPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed previously in session or local storage
    if (localStorage.getItem('appPromptDismissed')) {
      setIsDismissed(true);
      return;
    }

    // Wait a few seconds before checking/showing
    const timer = setTimeout(() => {
      // Check if Android
      const isAndroid = /Android/i.test(navigator.userAgent);
      
      // Check if already installed (standalone mode)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as any).standalone === true;

      if (isAndroid && !isStandalone) {
        setShowPrompt(true);
      }
    }, 15000); // 15 seconds delay

    return () => clearTimeout(timer);
  }, []);

  if (!showPrompt || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('appPromptDismissed', 'true');
  };

  return (
    <div className="fixed bottom-[70px] left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="flex items-center gap-4 rounded-2xl border border-[#00cfff]/30 bg-[#1a1a1a]/95 p-4 shadow-2xl backdrop-blur-lg">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00cfff] to-[#0066ff] shadow-inner text-white">
          <Download size={24} />
        </div>
        
        <div className="flex-1">
          <h3 className="text-[15px] font-extrabold text-white">Get the FreshNews App</h3>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">Faster loading & better experience.</p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <button 
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-white"
          >
            <X size={16} />
          </button>
          
          <Link 
            href="https://play.google.com/store/apps/details?id=top.freshnews.app"
            onClick={handleDismiss}
            className="rounded-full bg-[#ffd42a] px-4 py-2 text-[12px] font-bold text-black shadow-lg shadow-[#ffd42a]/20 hover:scale-105 transition-transform"
          >
            Install
          </Link>
        </div>
      </div>
    </div>
  );
}
