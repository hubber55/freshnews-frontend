'use client';

import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

type PostTrackerProps = {
  postId: number;
};

export default function PostTracker({ postId }: PostTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    // Only track once per page mount
    if (trackedRef.current) return;
    trackedRef.current = true;

    async function trackView() {
      try {
        // Get or create sessionId
        let sessionId = localStorage.getItem('fn_session_id');
        if (!sessionId) {
          sessionId = uuidv4();
          localStorage.setItem('fn_session_id', sessionId);
        }

        // Call tracking API
        await fetch('/api/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postId,
            sessionId,
            eventType: 'click',
          }),
        });
      } catch (err) {
        console.error('Failed to track post view:', err);
      }
    }

    // Delay slightly to ensure it's a real view and not a bounce/bot pre-fetch
    const timer = setTimeout(trackView, 1000);
    return () => clearTimeout(timer);
  }, [postId]);

  return null; // This component doesn't render anything
}
