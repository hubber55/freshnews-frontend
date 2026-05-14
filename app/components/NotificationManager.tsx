'use client';

import { useState, useEffect, useRef } from 'react';
import { BellRing, X } from 'lucide-react';

// Use the environment variable, but fallback to the hardcoded key to ensure build-time stability
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BFSRpzyB_5UuVFkf6-cfJ1JsFuQllDvYoii-PfZs5_k-jXmhZYOB-Szacp_YSLPen0MSCYD7jAlkTE3n7EKrawM';

export default function NotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const bellBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      const hideUntil = localStorage.getItem('hide_notifications_until');
      if (hideUntil && new Date().getTime() < parseInt(hideUntil)) {
        setIsVisible(false);
        setLoading(false);
        return;
      }

      if (Notification.permission === 'granted') {
        syncExistingSubscription();
        return;
      }
      setIsSupported(true);
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isVisible || loading || !isSupported) return;
    
    const GLOW_COLORS = ['fx-glow-gold', 'fx-glow-white', 'fx-glow-pink', 'fx-glow-green', 'fx-glow-cyan'];
    let cycleCount = 0;
    let timer: NodeJS.Timeout;

    function runGlow() {
      if (cycleCount >= 30) return;
      if (!bellBtnRef.current) return;

      const colorClass = GLOW_COLORS[Math.floor(Math.random() * GLOW_COLORS.length)];
      bellBtnRef.current.classList.add(colorClass);
      
      setTimeout(() => {
        bellBtnRef.current?.classList.remove(colorClass);
      }, 5000);

      cycleCount++;
      timer = setTimeout(runGlow, 10000 + Math.random() * 15000);
    }

    timer = setTimeout(runGlow, 3000);
    return () => clearTimeout(timer);
  }, [isVisible, loading, isSupported]);

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await saveSubscription(sub);
        setIsVisible(false);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
    } finally {
      setLoading(false);
    }
  }

  async function syncExistingSubscription() {
    setIsSupported(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();

      if (existingSub) {
        await saveSubscription(existingSub);
        setIsVisible(false);
        return;
      }

      if (!VAPID_PUBLIC_KEY) {
        console.error('Push Notification Error: VAPID Public Key Missing in env');
        setIsVisible(false);
        return;
      }

      const newSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      await saveSubscription(newSub);
      setIsVisible(false);
    } catch (err) {
      console.error('Error syncing notification subscription:', err);
      setIsVisible(false);
    } finally {
      setLoading(false);
    }
  }

  async function saveSubscription(subscription: PushSubscription) {
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save notification subscription');
    }
  }

  async function handleSubscribe() {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        alert('Notifications are blocked. Please click the Lock icon (🔒) in your browser address bar and set Notifications to "Allow".');
        dismissForAWeek();
        return;
      }

      if (!VAPID_PUBLIC_KEY) {
        alert('Push system configuration error. Please try again later.');
        return;
      }

      setLoading(true);
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      await saveSubscription(sub);
      setIsVisible(false);
    } catch (err: any) {
      console.error('Push error:', err);
      if (err.name === 'NotAllowedError') {
        alert('Permission Denied. Please enable notifications in your browser settings.');
      }
      setIsVisible(false);
    } finally {
      setLoading(false);
    }
  }

  function dismissForAWeek() {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('hide_notifications_until', (new Date().getTime() + oneWeek).toString());
    setIsVisible(false);
  }

  if (!isSupported || !isVisible || loading) return null;

  return (
    <>
      <div className="fixed bottom-24 right-4 z-[100] flex flex-col items-center gap-2 group/bellContainer">
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismissForAWeek();
          }}
          className="bg-black/80 text-white rounded-full p-1 opacity-0 group-hover/bellContainer:opacity-100 transition-opacity hover:bg-black"
          title="Dismiss for a week"
        >
          <X size={14} />
        </button>

        <button
          ref={bellBtnRef}
          id="notifBellBtn"
          onClick={handleSubscribe}
          className="p-3.5 rounded-full bg-[#ffd42a] text-black shadow-[0_4px_15px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center group relative border-none outline-none"
        >
          <BellRing size={22} className="group-hover:animate-shake" />
          
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-30"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-black"></span>
          </span>
        </button>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-15deg); }
          60% { transform: rotate(10deg); }
          80% { transform: rotate(-10deg); }
        }
        .group-hover\\:animate-shake { animation: shake 0.5s ease-in-out infinite; }
      `}</style>
    </>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
