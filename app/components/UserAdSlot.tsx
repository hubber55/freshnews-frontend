'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

// Types
type UserAd = {
  id: number;
  title: string;
  content: string;
  image_url: string;
  external_url: string | null;
  hyperlink_text: string | null;
  type: 'ad' | 'classified';
};

type PlaceholderAd = {
  id: number;
  image_url: string;
  title: string;
  cta_text: string;
  external_url: string | null;
};

type AdData = {
  type: 'user' | 'placeholder';
  ad: UserAd | PlaceholderAd;
};

interface UserAdSlotProps {
  adCode?: string; // Legacy ad network code (optional fallback)
}

// Generate or get session ID for tracking
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem('ad_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('ad_session_id', sessionId);
  }
  return sessionId;
}

export default function UserAdSlot({ adCode }: UserAdSlotProps) {
  const [adData, setAdData] = useState<AdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [impressionTracked, setImpressionTracked] = useState(false);
  const router = useRouter();

  // Fetch ad (user-submitted or placeholder)
  useEffect(() => {
    async function fetchAd() {
      try {
        // Fetch both user-submitted and placeholder ads in parallel
        const [userAdRes, placeholderRes] = await Promise.all([
          fetch('/api/ads/random-approved'),
          fetch('/api/placeholder-ads/random')
        ]);

        let userAd = null;
        let placeholderAd = null;

        if (userAdRes.ok) {
          const data = await userAdRes.json();
          userAd = data.ad;
        }

        if (placeholderRes.ok) {
          const data = await placeholderRes.json();
          placeholderAd = data.ad;
        }

        // Randomly mix them if both are available
        if (userAd && placeholderAd) {
          if (Math.random() > 0.5) {
            setAdData({ type: 'user', ad: userAd });
          } else {
            setAdData({ type: 'placeholder', ad: placeholderAd });
          }
        } else if (userAd) {
          setAdData({ type: 'user', ad: userAd });
        } else if (placeholderAd) {
          setAdData({ type: 'placeholder', ad: placeholderAd });
        }
      } catch (error) {
        console.error('Error fetching ad:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAd();
  }, []);

  // Track impression
  useEffect(() => {
    if (!adData || impressionTracked) return;

    const trackImpression = async () => {
      try {
        const sessionId = getSessionId();
        const adId = adData.ad.id;
        const eventType = adData.type === 'user' ? 'user_ad_impression' : 'impression';

        // Track based on ad type
        if (adData.type === 'placeholder') {
          await fetch('/api/placeholder-ads/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ad_id: adId,
              event_type: 'impression',
              session_id: sessionId,
            }),
          });
        }
        // User ad impressions can be tracked separately if needed

        setImpressionTracked(true);
      } catch (error) {
        console.error('Error tracking impression:', error);
      }
    };

    // Track impression after ad is visible for at least 1 second
    const timer = setTimeout(trackImpression, 1000);
    return () => clearTimeout(timer);
  }, [adData, impressionTracked]);

  // Handle click tracking and navigation
  const handleClick = useCallback(async () => {
    if (!adData) return;

    const ad = adData.ad;
    const externalUrl = ad.external_url;

    // Track click
    try {
      const sessionId = getSessionId();
      
      if (adData.type === 'placeholder') {
        await fetch('/api/placeholder-ads/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ad_id: ad.id,
            event_type: 'click',
            session_id: sessionId,
          }),
        });
      }
    } catch (error) {
      console.error('Error tracking click:', error);
    }

    // Navigation logic based on ad type
    if (adData.type === 'user') {
      const userAd = ad as UserAd;
      if (userAd.type === 'classified') {
        // Classified ads: internal navigation (same tab)
        router.push(`/classifieds/${userAd.id}`);
      } else if (userAd.type === 'ad' && externalUrl) {
        // User-submitted ads with external link: new tab
        window.open(externalUrl, '_blank', 'noopener,noreferrer');
      }
    } else if (adData.type === 'placeholder' && externalUrl) {
      // Placeholder ads: internal navigation (same tab)
      if (externalUrl.startsWith('/') || externalUrl.includes(window.location.host)) {
        router.push(externalUrl);
      } else {
        window.location.href = externalUrl;
      }
    }
  }, [adData, router]);

  if (loading) {
    return (
      <div className="relative my-8 w-full rounded-lg overflow-hidden min-h-[250px] bg-[#161b22] animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1c2128] to-[#161b22]" />
      </div>
    );
  }

  // If no ad data and no legacy ad code, show nothing
  if (!adData) {
    // Fallback to legacy ad slot if available
    if (!adCode) return null;
    return (
      <div className="relative my-8 w-full rounded-lg overflow-hidden min-h-[250px]" style={{ border: '2px solid #ff00ff' }}>
        <span className="absolute top-1 right-2 z-10 text-[9px] font-semibold leading-none" style={{ color: '#ff00ff', fontFamily: 'var(--font-en)' }}>
          Ad
        </span>
        <div dangerouslySetInnerHTML={{ __html: adCode }} />
      </div>
    );
  }

  const ad = adData.ad;
  const isUserAd = adData.type === 'user';
  const externalUrl = ad.external_url;
  const ctaText = isUserAd ? (ad as UserAd).hyperlink_text || 'Learn More' : (ad as PlaceholderAd).cta_text;

  return (
    <div className="relative my-8 w-full rounded-lg overflow-hidden" style={{ border: '2px solid #ff00ff' }}>
      {/* Ad Label */}
      <span className="absolute top-1 right-2 z-20 text-[9px] font-semibold leading-none" style={{ color: '#ff00ff', fontFamily: 'var(--font-en)' }}>
        Ad
      </span>

      {/* Ad Container */}
      <div 
        className="relative w-full bg-[#161b22] cursor-pointer group"
        onClick={handleClick}
      >
        {/* Main Image - Full Width Banner */}
        <div className="relative w-full aspect-video md:aspect-[21/9] overflow-hidden">
          <img
            src={ad.image_url}
            alt={ad.title}
            className="w-full h-full object-fill transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Localized Overlay for Title and Icon */}
          <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="inline-block px-2 py-1 bg-black/50 backdrop-blur-[2px] rounded text-[11px] sm:text-[13px] font-bold text-white leading-tight drop-shadow-md break-words">
                {ad.title}
              </span>
            </div>
            
            {externalUrl && (
              <div className="shrink-0 p-1.5 bg-black/50 backdrop-blur-[2px] rounded-full text-white shadow-lg hover:scale-110 transition-transform">
                <ExternalLink size={14} strokeWidth={2.5} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
