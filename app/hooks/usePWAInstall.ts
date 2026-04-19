'use client';

import { useState, useEffect, useCallback } from 'react';

// Extend Window interface to include our global
declare global {
  interface Window {
    deferredInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if we already have the prompt captured globally
    const checkForPrompt = () => {
      if (typeof window !== 'undefined' && window.deferredInstallPrompt) {
        setDeferredPrompt(window.deferredInstallPrompt);
        setIsInstallable(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (!checkForPrompt()) {
      // Poll for it since it might come after component mounts
      const interval = setInterval(() => {
        if (checkForPrompt()) {
          clearInterval(interval);
        }
      }, 500);

      // Stop polling after 10 seconds
      setTimeout(() => clearInterval(interval), 10000);

      return () => clearInterval(interval);
    }
  }, []);

  // Also listen for the event in case it fires after mount
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.deferredInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    // Use the global prompt if available, otherwise use state
    const prompt = window.deferredInstallPrompt || deferredPrompt;
    
    if (!prompt) {
      console.log('[PWA] No install prompt available');
      return false;
    }

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      
      if (outcome === 'accepted') {
        window.deferredInstallPrompt = null;
        setDeferredPrompt(null);
        setIsInstallable(false);
        console.log('[PWA] User accepted install');
      } else {
        console.log('[PWA] User dismissed install');
      }
      
      return outcome === 'accepted';
    } catch (err) {
      console.error('[PWA] Error triggering install:', err);
      return false;
    }
  }, [deferredPrompt]);

  return {
    isInstalled,
    isInstallable: isInstallable || !!window.deferredInstallPrompt,
    triggerInstall,
    deferredPrompt,
  };
}
