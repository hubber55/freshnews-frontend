'use client';

import { useState, useEffect } from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import { Download, Smartphone, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallAppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      
      <main className="px-4 pt-20 pb-10">
        <div className="mx-auto w-full max-w-[600px]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-2xl bg-[#00cfff]/10 p-4">
                <Smartphone size={48} className="text-[#00cfff]" />
              </div>
            </div>
            
            <h1 className="text-2xl font-extrabold text-white mb-4" style={{ fontFamily: 'var(--font-en)' }}>
              Install FreshNews App
            </h1>
            
            <p className="text-[var(--text-secondary)] mb-8">
              Add FreshNews to your home screen for quick and easy access to the latest Malayalam news.
            </p>

            {isInstalled ? (
              <div className="flex items-center justify-center gap-2 text-[#90ee90] font-semibold">
                <CheckCircle size={20} />
                <span>App is already installed!</span>
              </div>
            ) : isIOS ? (
              <div className="bg-[var(--bg-primary)] rounded-xl p-6 text-left">
                <h3 className="text-lg font-bold text-white mb-4">To install on iOS:</h3>
                <ol className="space-y-3 text-[var(--text-secondary)]">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#ffd42a] text-[#0d1117] flex items-center justify-center text-sm font-bold">1</span>
                    <span>Tap the Share button in Safari</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#ffd42a] text-[#0d1117] flex items-center justify-center text-sm font-bold">2</span>
                    <span>Scroll down and tap &quot;Add to Home Screen&quot;</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#ffd42a] text-[#0d1117] flex items-center justify-center text-sm font-bold">3</span>
                    <span>Tap &quot;Add&quot; in the top right</span>
                  </li>
                </ol>
              </div>
            ) : deferredPrompt ? (
              <button
                onClick={handleInstall}
                className="inline-flex items-center gap-2 rounded-xl bg-[#00cfff] px-8 py-4 font-extrabold text-[#0d1117] shadow-md hover:brightness-110 transition-all"
              >
                <Download size={20} />
                Install Now
              </button>
            ) : (
              <div className="text-[var(--text-muted)]">
                <p>To install this app:</p>
                <p className="mt-2">Look for the install icon (➕) in your browser&apos;s address bar, or go to Menu → Install FreshNews</p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <h4 className="text-sm font-bold text-[var(--text-muted)] mb-2">Why install?</h4>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                <li>✓ Instant access to latest news</li>
                <li>✓ Works offline</li>
                <li>✓ No browser address bar</li>
                <li>✓ Fast and native-like experience</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
