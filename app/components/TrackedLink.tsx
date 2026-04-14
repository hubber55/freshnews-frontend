'use client';

import Link, { type LinkProps } from 'next/link';
import { useMemo } from 'react';

type TrackEvent = {
  postId: number;
  eventType: 'click';
};

function getOrCreateSessionId() {
  try {
    const key = 'freshnews_session_id';
    const existing = window.localStorage.getItem(key);
    if (existing && existing.length >= 8) return existing;

    const created = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    return `${Date.now()}-${Math.random()}`;
  }
}

function track(payload: unknown) {
  try {
    const body = JSON.stringify(payload);
    const blob = new Blob([body], { type: 'application/json' });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', blob);
      return;
    }

    fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

type TrackedLinkProps = LinkProps & {
  children: React.ReactNode;
  className?: string;
  trackEvent: TrackEvent;
};

export default function TrackedLink({ trackEvent, onClick, ...props }: TrackedLinkProps) {
  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  return (
    <Link
      {...props}
      onClick={(e) => {
        track({
          postId: trackEvent.postId,
          sessionId,
          eventType: 'click',
        });

        onClick?.(e);
      }}
    />
  );
}

