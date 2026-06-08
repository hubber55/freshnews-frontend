'use client';

import { useState, useEffect } from 'react';
import TrackedLink from './TrackedLink';
import LazyImage from './LazyImage';
import LockNewsButton from './LockNewsButton';
import TagBadge from './tag-badge';
import UserAdSlot from './UserAdSlot';
import PollCard from './PollCard';
import { limitWords, getFirstValidTag, formatTimeAgo, formatSourceName } from '../../lib/posts';

function getPrimaryImage(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return typeof parsed[0] === 'string' ? parsed[0] : null;
      }
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

type PostFeedProps = {
  initialPosts: any[];
  activeTag: string;
  page: number;
  pageSize: number;
  adCode: string;
  lockedPosts: any[];
};

export default function PostFeed({
  initialPosts,
  activeTag,
  page,
  pageSize,
  adCode,
  lockedPosts,
}: PostFeedProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);
  const [scrollRestored, setScrollRestored] = useState(false);

  useEffect(() => {
    // If we only have 10 posts initially, fetch the rest in the background
    if (initialPosts.length >= 10 && !hasLoadedMore) {
      const fetchRemaining = async () => {
        setLoadingMore(true);
        try {
          const from = (page - 1) * pageSize + 10;
          const to = (page - 1) * pageSize + pageSize - 1;
          const res = await fetch(`/api/posts?from=${from}&to=${to}&tag=${encodeURIComponent(activeTag)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.posts && data.posts.length > 0) {
              setPosts((prev) => {
                const existingIds = new Set(prev.map((p) => p.id));
                const uniqueNew = data.posts.filter((p: any) => !existingIds.has(p.id));
                return [...prev, ...uniqueNew];
              });
            }
          }
        } catch (err) {
          console.error('Failed to fetch remaining posts:', err);
        } finally {
          setLoadingMore(false);
          setHasLoadedMore(true);
        }
      };

      fetchRemaining();
    }
  }, [initialPosts, activeTag, page, pageSize, hasLoadedMore]);

  // Restore scroll position when ready (either loading finished, or initially < 10 posts)
  useEffect(() => {
    const ready = initialPosts.length < 10 || hasLoadedMore;
    if (ready && !scrollRestored) {
      try {
        const key = 'scroll_pos_' + window.location.pathname + window.location.search;
        const savedPos = sessionStorage.getItem(key);
        if (savedPos) {
          const y = parseInt(savedPos, 10);
          if (!isNaN(y)) {
            setTimeout(() => {
              window.scrollTo({ top: y, behavior: 'instant' as any });
              sessionStorage.removeItem(key);
              setScrollRestored(true);
            }, 100);
          } else {
            setScrollRestored(true);
          }
        } else {
          setScrollRestored(true);
        }
      } catch (err) {
        console.error('Failed to restore scroll position:', err);
        setScrollRestored(true);
      }
    }
  }, [initialPosts, hasLoadedMore, scrollRestored]);

  // Keep posts in sync if initialPosts change (e.g. tag filter changed)
  useEffect(() => {
    setPosts(initialPosts);
    setHasLoadedMore(false);
    setScrollRestored(false);
  }, [initialPosts]);

  // Weave locked posts dynamically during rendering
  let wovenPosts = [...posts];
  if (page === 1 && !activeTag && (lockedPosts?.length ?? 0) > 0) {
    const lockedIds = new Set(lockedPosts.map(p => p.id));
    wovenPosts = wovenPosts.filter(p => !lockedIds.has(p.id));
    
    const sortedLocked = [...lockedPosts].sort((a, b) => (a.locked_position || 99) - (b.locked_position || 99));
    
    sortedLocked.forEach(lp => {
      const pos = lp.locked_position || 100;
      const targetIndex = Math.max(0, pos - 1);
      if (targetIndex <= wovenPosts.length) {
        wovenPosts.splice(targetIndex, 0, lp);
      }
    });
  }

  const remainingPosts = page === 1 ? wovenPosts.slice(1) : wovenPosts;

  return (
    <>
      <div className="mt-6 space-y-7">
        {remainingPosts.map((post, index) => {
          const totalPosition = page === 1 ? index + 2 : (page - 1) * pageSize + index + 1;

          // Show Poll at 3rd position (totalPosition === 3)
          const showPollHere = totalPosition === 3;

          // Show ad after every 10 posts (10, 20, 30...)
          const showAdAfter = totalPosition % 10 === 0;

          return (
            <div key={post.id} className="space-y-7">
              {showPollHere && <PollCard />}

              <article className="relative overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                {/* Independent Source Badge */}
                <div className="absolute top-3 left-3 z-20">
                  <TagBadge tag={formatSourceName(post.source_name) || ''} withHash={false} />
                </div>

                <TrackedLink
                  href={`/posts/${post.id}`}
                  className="block"
                  trackEvent={{ postId: post.id, eventType: 'click' }}
                >
                  <div className="relative w-full overflow-hidden" style={{ paddingTop: '56.25%' }}>
                    {getPrimaryImage(post.image_url) ? (
                      <LazyImage
                        src={getPrimaryImage(post.image_url)!}
                        alt={post.title}
                        eager={index < 3}
                        className="absolute inset-0 w-full h-full object-contain bg-black"
                        imgStyle={{ objectFit: 'contain', backgroundColor: '#000000' }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#21262d] text-sm text-[var(--text-muted)]">
                        No Image Available
                      </div>
                    )}
                  </div>

                  <div className="px-5 py-3 sm:py-4">
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-[11px] font-bold" style={{ fontFamily: 'var(--font-en)' }}>
                        <span className="text-[#ffd42a]"># {getFirstValidTag(post.tags, 'News')}</span>
                        <span className="text-[#ffd42a]/80 font-medium flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-[#ffd42a]/40" />
                          {formatTimeAgo(post.created_at || post.published_at)}
                        </span>
                      </div>
                      <LockNewsButton postId={post.id} isLocked={post.is_locked} />
                    </div>

                    <h3 className="card-title mb-2 text-white">{limitWords(post.title, 10)}</h3>
                  </div>
                </TrackedLink>
              </article>
              {showAdAfter && <UserAdSlot adCode={adCode} />}
            </div>
          );
        })}
      </div>

      {loadingMore && (
        <div className="py-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffd42a]"></div>
        </div>
      )}
    </>
  );
}
