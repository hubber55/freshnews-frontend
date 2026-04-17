'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { hasMinimumWords, limitWords } from '../lib/posts';
import Header from './components/header';
import Footer from './components/footer';
import TrackedLink from './components/TrackedLink';
import { createClient } from '@/app/utils/supabase/client';

function mergeNewsAndAds(news: any[], ads: any[], refreshCount: number) {
  const merged = [];
  let adIndex = 0;
  let newsIndex = 0;

  const adPositions = [2, 5, 8];
  let adPosition = adPositions[Math.min(refreshCount, adPositions.length - 1)];

  while (newsIndex < news.length || adIndex < ads.length) {
    if (newsIndex === adPosition && adIndex < ads.length) {
      merged.push({ ...ads[adIndex], isAd: true });
      adIndex++;
      adPosition += adPositions[Math.min(refreshCount, adPositions.length - 1)] + 1;
    } else if (newsIndex < news.length) {
      merged.push(news[newsIndex]);
      newsIndex++;
    } else {
      break;
    }
  }

  return merged;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const activeTag = searchParams.get('tag')?.trim() || '';
  const pageParam = searchParams.get('page') || '1';

  // Generate cache key based on search params
  const cacheKey = `posts_${activeTag || 'all'}_${pageParam}`;

  // Restore scroll position on mount
  useEffect(() => {
    const savedScrollY = sessionStorage.getItem('homeScrollPosition');
    if (savedScrollY) {
      // Delay scroll restoration to after render
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(savedScrollY, 10));
      });
      sessionStorage.removeItem('homeScrollPosition');
    }
  }, []);

  // Save scroll position before leaving
  const saveScrollPosition = useCallback(() => {
    sessionStorage.setItem('homeScrollPosition', window.scrollY.toString());
    // Also cache current posts before leaving
    sessionStorage.setItem(cacheKey, JSON.stringify({ posts, hasNextPage, timestamp: Date.now() }));
  }, [posts, hasNextPage, cacheKey]);

  // Get search params string for dependency tracking
  const searchParamsString = searchParams.toString();

  // Load cached data or fetch fresh
  useEffect(() => {
    const currentPage = Math.max(1, Number.parseInt(pageParam, 10) || 1);
    setPage(currentPage);

    // Check if we have cached data for this page/tag combination
    const cached = sessionStorage.getItem(cacheKey);

    // Always use cached data if available - this prevents loading flicker when navigating back
    if (cached) {
      const { posts: cachedPosts, hasNextPage: cachedHasNextPage } = JSON.parse(cached);
      setPosts(cachedPosts);
      setHasNextPage(cachedHasNextPage);
      setLoading(false);

      // Silently refresh in background after a short delay (only on actual refresh, not back nav)
      const navigationType = (performance as any).getEntriesByType?.('navigation')?.[0]?.type;
      if (navigationType === 'reload') {
        setTimeout(() => refreshData(currentPage), 100);
      }
    } else {
      // No cache - must fetch
      refreshData(currentPage);
    }

    async function refreshData(currentPage: number) {
      setLoading(true);
      const refreshCount = parseInt(sessionStorage.getItem('refreshCount') || '0', 10);
      sessionStorage.setItem('refreshCount', (refreshCount + 1).toString());

      const pageSize = 50;
      const overfetch = 200;
      const from = (currentPage - 1) * pageSize;

      let newsQuery = supabase
        .from('posts')
        .select('*')
        .eq('is_deleted', false)
        .order('published_at', { ascending: false })
        .range(from, from + overfetch - 1);

      if (activeTag) {
        console.log('Filtering by tag:', activeTag);
        newsQuery = newsQuery.contains('tags', [activeTag]);
      }

      const { data: newsData } = await newsQuery;
      console.log('News query result:', newsData?.length, 'posts found');
      const eligibleNews = (newsData ?? []).filter((post) => hasMinimumWords(post.summary, 70));

      const { data: adsData } = await supabase
        .from('submissions')
        .select('*')
        .eq('type', 'ad')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      const mergedFeed = mergeNewsAndAds(eligibleNews, adsData || [], refreshCount);

      const newPosts = mergedFeed.slice(0, pageSize);
      const newHasNextPage = mergedFeed.length > pageSize || (newsData?.length ?? 0) === overfetch;

      setPosts(newPosts);
      setHasNextPage(newHasNextPage);
      setLoading(false);

      // Cache the data
      sessionStorage.setItem(cacheKey, JSON.stringify({ posts: newPosts, hasNextPage: newHasNextPage, timestamp: Date.now() }));
    }
  }, [searchParamsString, activeTag, cacheKey, pageParam]);

  // Show "No News Available" only when not loading and posts are actually empty
  if (!loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Header titleColorClass="text-white" />
        <main className="flex items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              {activeTag ? `No articles tagged "${activeTag}"` : 'No News Available Yet'}
            </h2>
            <p className="text-[var(--text-secondary)]">
              {activeTag ? (
                <Link href="/" className="text-white hover:underline">← Back to all news</Link>
              ) : (
                'The daemon is fetching articles. Check back soon.'
              )}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show loading spinner only on initial load (not when navigating back with cached data)
  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Header titleColorClass="text-white" />
        <main className="flex items-center justify-center p-8 min-h-[50vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-[var(--border)] border-t-[#ffd42a] rounded-full animate-spin" />
            <p className="text-[var(--text-secondary)]">Loading news...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const heroPost = page === 1 ? posts[0] : null;
  const remainingPosts = page === 1 ? posts.slice(1) : posts;
  const baseParams = activeTag ? `tag=${encodeURIComponent(activeTag)}&` : '';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header titleColorClass="text-white" />

      <main className="pb-4">
        {/* SECTION HEADER */}
        <section className="mx-auto mt-5 w-full max-w-[800px] px-5 sm:px-6">
          <div className="mb-4 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-3">
            <div>
              <div className="text-[15px] font-extrabold uppercase tracking-wide text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-en)' }}>
                {activeTag ? `#${activeTag}` : 'Latest'}
              </div>
              <div className="mt-1.5 h-[3px] w-10 rounded-full bg-[var(--accent)]" />
            </div>
            {activeTag ? (
              <Link href="/" className="text-[13px] font-semibold text-[#ffd42a] hover:underline">
                ← All News
              </Link>
            ) : (
              null
            )}
          </div>

          {/* HERO CARD */}
          {heroPost && (
            <article className="overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <TrackedLink href={`/posts/${heroPost.id}`} className="block" trackEvent={{ postId: heroPost.id, eventType: 'click' }}>
                <div className="relative w-full overflow-hidden" style={{ paddingTop: '56.25%' }}>
                  {heroPost.image_url ? (
                    <img
                      src={heroPost.image_url}
                      alt={heroPost.title}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      loading="eager"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#21262d] text-sm text-[var(--text-muted)]">
                      No Image Available
                    </div>
                  )}
                  <span className="source-badge">{heroPost.source_name}</span>
                </div>

                <div className="px-5 py-3 sm:py-4">
                  <div className="mb-2 flex items-center gap-2 text-[11.5px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
                    {heroPost.published_at && (
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {formatDistanceToNow(new Date(heroPost.published_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>

                  <h2 className="card-title-hero mb-2 text-white">
                    {limitWords(heroPost.title, 10)}
                  </h2>
                </div>
              </TrackedLink>
            </article>
          )}

          {/* REMAINING CARDS */}
          <div className="mt-6 space-y-7">
            {remainingPosts.map((post, index) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]"
              >
                <TrackedLink
                  href={`/posts/${post.id}`}
                  className="block"
                  trackEvent={{ postId: post.id, eventType: 'click' }}
                  onClick={saveScrollPosition}
                >
                  <div className="relative w-full overflow-hidden" style={{ paddingTop: '56.25%' }}>
                    {post.image_url ? (
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="absolute inset-0 h-full w-full object-cover object-center"
                        loading={index < 9 ? 'eager' : 'lazy'}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#21262d] text-sm text-[var(--text-muted)]">
                        No Image Available
                      </div>
                    )}
                    <span className="source-badge">{post.source_name}</span>
                  </div>

                  <div className="px-5 py-3 sm:py-4">
                    <div className="mb-2 flex items-center gap-2 text-[11.5px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
                      {post.published_at && (
                        <span className="flex items-center gap-1">
                          <Clock size={13} />
                          {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>

                    <h3 className="card-title mb-2 text-white">
                      {limitWords(post.title, 10)}
                    </h3>
                  </div>
                </TrackedLink>
              </article>
            ))}
          </div>

          {/* PAGINATION */}
          <div className="mt-10 flex items-center justify-between border-t border-[var(--border)] pt-6">
            {page > 1 ? (
              <Link
                href={`/?${baseParams}page=${page - 1}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[13px] font-bold text-white hover:border-white/30"
                style={{ fontFamily: 'var(--font-en)' }}
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}

            <span className="text-[12px] font-semibold text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
              Page {page}
            </span>

            {hasNextPage ? (
              <Link
                href={`/?${baseParams}page=${page + 1}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[13px] font-bold text-white hover:border-white/30"
                style={{ fontFamily: 'var(--font-en)' }}
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-primary)]" />}>
      <HomeContent />
    </Suspense>
  );
}
