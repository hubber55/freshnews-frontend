'use client';

import { useEffect, useState } from 'react';

/**
 * SlowNetworkBanner
 *
 * Shows a subtle "Network seems slow… please refresh" toast after 4 seconds
 * IF the page hasn't fully loaded yet. Dismisses automatically once loaded,
 * or when the user taps the refresh button.
 */
export default function SlowNetworkBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // If page already loaded fast — don't start the timer at all
    if (document.readyState === 'complete') return;

    const timer = setTimeout(() => {
      // Double-check: only show if still loading
      if (document.readyState !== 'complete') {
        setVisible(true);
      }
    }, 4000);

    const onLoad = () => {
      clearTimeout(timer);
      setVisible(false);
    };

    window.addEventListener('load', onLoad);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', onLoad);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      id="slow-network-banner"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(22, 27, 34, 0.96)',
        border: '1px solid #30363d',
        borderRadius: '14px',
        padding: '12px 20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
        animation: 'snb-fadein 0.4s ease',
        maxWidth: '90vw',
        width: 'max-content',
      }}
    >
      {/* Animated signal icon */}
      <span style={{ fontSize: '20px', lineHeight: 1 }}>📶</span>

      <span
        style={{
          fontSize: '13.5px',
          color: '#c9d1d9',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1.4,
        }}
      >
        Network seems slow…
        <br />
        <span style={{ color: '#8b949e', fontSize: '12px' }}>please refresh</span>
      </span>

      <button
        onClick={() => window.location.reload()}
        style={{
          marginLeft: '8px',
          background: '#ffd42a',
          color: '#000',
          border: 'none',
          borderRadius: '8px',
          padding: '6px 14px',
          fontSize: '12.5px',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif',
          flexShrink: 0,
        }}
      >
        Refresh
      </button>

      {/* Dismiss × */}
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          color: '#6e7681',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
          padding: '2px 4px',
          flexShrink: 0,
        }}
      >
        ✕
      </button>

      <style>{`
        @keyframes snb-fadein {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
