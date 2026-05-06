import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import { supabase } from '@/lib/supabase';
import { Clock, Home as HomeIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { hasMinimumWords, limitWords } from '../lib/posts';
import Header from './components/header';
import Footer from './components/footer';
import HomeRefreshRedirect from './components/HomeRefreshRedirect';
import TrackedLink from './components/TrackedLink';
import LazyImage from './components/LazyImage';
import NetworkAd from './components/NetworkAd';
import { createAdminClient } from '@/lib/supabase-admin';

export const revalidate = 120; // Revalidate every 2 minutes

type HeaderInsert = {
  enabled?: boolean;
  placement?: 'head' | 'body';
  scope?: 'all' | 'home';
  code?: string;
};

type AdNetwork = {
  enabled?: boolean;
  code?: string;
};

function safeParseHeaderInserts(value: unknown): HeaderInsert[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as HeaderInsert[]) : [];
  } catch {
    return [];
  }
}

function safeParseAdNetworks(value: unknown): AdNetwork[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as AdNetwork[]) : [];
  } catch {
    return [];
  }
}

function pickAdCode(options: { adNetworksJson: unknown; randomEnabled: boolean; legacyAdsterra: string }) {
  const networks = safeParseAdNetworks(options.adNetworksJson)
    .filter((n) => (n?.enabled ?? true) && typeof n?.code === 'string' && n.code.trim())
    .map((n) => n.code!.trim());

  if (networks.length === 0) return options.legacyAdsterra;
  if (!options.randomEnabled) return networks[0];
  return networks[Math.floor(Math.random() * networks.length)];
}

/**
 * Detects whether the ad code is a "mount target" pattern (e.g. mybid.io / bidvertiser).
 * These ads place a `<div id="...">` in the page and a library script loaded in the <head>
 * finds and populates them. They MUST be in the server-rendered HTML so the library script
 * can find them on page load — rendering them via a client component is too late.
 */
function isMountTargetAd(code: string): boolean {
  const trimmed = code.trim();
  // Match patterns like <div id="2028306"></div> (with possible whitespace/attrs)
  return /^\s*<div[^>]+id\s*=\s*["'][^"']+["'][^>]*>\s*<\/div>\s*$/i.test(trimmed);
}

/**
 * Server-rendered ad slot. For mount-target ads (mybid.io), renders the div directly
 * in the initial HTML so the head-loaded library script can find it.
 * For other ad types (Adsterra etc.), uses the client-side NetworkAd iframe component.
 */
function AdSlot({ code }: { code: string }) {
  if (!code) return null;

  return (
    <div className="relative my-8 w-full rounded-lg overflow-hidden min-h-[250px]" style={{ border: '2px solid #ff00ff' }}>
      <span
        className="absolute top-1 right-2 z-10 text-[9px] font-semibold leading-none"
        style={{ color: '#ff00ff', fontFamily: 'var(--font-en)' }}
      >
        Ad
      </span>
      {isMountTargetAd(code) ? (
        <div className="w-full" dangerouslySetInnerHTML={{ __html: code }} />
      ) : (
        <NetworkAd code={code} />
      )}
    </div>
  );
}

type HomeProps = {
  searchParams: Promise<{ tag?: string; page?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  await connection();

  const params = await searchParams;
  const activeTag = params.tag?.trim() || '';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const pageSize = 100;
  const overfetch = 120;
  const from = (page - 1) * pageSize;

  if (activeTag === 'Classifieds') {
    redirect('/classifieds');
  }

  let query = supabase
    .from('posts')
    .select('id, title, summary, image_url, source_name, published_at, tags, is_deleted')
    .eq('is_deleted', false)
    .order('published_at', { ascending: false })
    .range(from, from + overfetch - 1);

  // If a tag is selected, filter by it (Supabase array contains)
  if (activeTag) {
    query = query.contains('tags', [activeTag]);
  }

  const { data: posts } = await query;

  // Fetch ad-related settings from the server-side admin client so public rendering
  // does not depend on anon read access to admin_settings.
  const adminSupabase = createAdminClient();
  const { data: adSettings } = await adminSupabase
    .from('admin_settings')
    .select('key, value')
    .in('key', ['adsterra_code', 'header_inserts', 'ad_networks', 'ad_networks_random']);

  const adSettingsMap = new Map((adSettings ?? []).map((setting) => [setting.key, setting.value]));
  const legacyAdsterra = typeof adSettingsMap.get('adsterra_code') === 'string' ? adSettingsMap.get('adsterra_code')!.trim() : '';
  const randomAdsEnabled = String(adSettingsMap.get('ad_networks_random') ?? '').toLowerCase() === 'true';
  const adCode = pickAdCode({
    adNetworksJson: adSettingsMap.get('ad_networks'),
    randomEnabled: randomAdsEnabled,
    legacyAdsterra,
  });
  const headerInserts = safeParseHeaderInserts(adSettingsMap.get('header_inserts'));

  const homepageHeaderHtml = headerInserts
    .filter((ins) => (ins?.enabled ?? true) && (ins?.scope ?? 'all') === 'home' && typeof ins?.code === 'string' && ins.code.trim())
    .map((ins) => ins.code!.trim())
    .join('\n');

  const eligiblePostsAll = (posts ?? []).filter((post) => hasMinimumWords(post.summary, 70));
  const eligiblePosts = eligiblePostsAll.slice(0, pageSize);
  const hasNextPage = eligiblePostsAll.length > pageSize || (posts?.length ?? 0) === overfetch;

  if (eligiblePosts.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Header />
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

  const heroPost = page === 1 ? eligiblePosts[0] : null;
  const remainingPosts = page === 1 ? eligiblePosts.slice(1) : eligiblePosts;
  const baseParams = activeTag ? `tag=${encodeURIComponent(activeTag)}&` : '';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <HomeRefreshRedirect page={page} activeTag={activeTag} />
      <Header />
      {homepageHeaderHtml ? (
        <div aria-hidden="true" className="hidden" dangerouslySetInnerHTML={{ __html: homepageHeaderHtml }} />
      ) : null}

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
            <>
              <article className="overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                <TrackedLink href={`/posts/${heroPost.id}`} className="block" trackEvent={{ postId: heroPost.id, eventType: 'click' }}>
                  <div className="relative w-full overflow-hidden" style={{ paddingTop: '56.25%' }}>
                    {heroPost.image_url ? (
                      <>
                        <LazyImage
                          src={heroPost.image_url}
                          alt={heroPost.title}
                          eager={true}
                          className="absolute inset-0 w-full h-full object-cover"
                          imgStyle={{ aspectRatio: '16/9' }}
                        />
                      </>
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
            </>
          )}

          {/* REMAINING CARDS */}
          <div className="mt-6 space-y-7">
            {remainingPosts.map((post, index) => {
              const totalPosition = (page === 1 ? index + 2 : (page - 1) * pageSize + index + 1);
              // Show ad after positions 2, 12, 22 (every 10), then every 20 posts after the 3rd ad.
              const showAdAfter = totalPosition === 2 || totalPosition === 12 || totalPosition === 22
                || (totalPosition > 22 && (totalPosition - 22) % 20 === 0);
              
              return (
                <div key={post.id} className="space-y-7">
                  <article
                    className="overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]"
                  >
                    <TrackedLink href={`/posts/${post.id}`} className="block" trackEvent={{ postId: post.id, eventType: 'click' }}>
                      <div className="relative w-full overflow-hidden" style={{ paddingTop: '56.25%' }}>
                        {post.image_url ? (
                          <>
                          <LazyImage
                            src={post.image_url}
                            alt={post.title}
                            eager={index < 3}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          </>
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
                  {showAdAfter && adCode && <AdSlot code={adCode} />}
                </div>
              );
            })}
          </div>

          {page > 1 ? (
            <div className="mt-20 text-center">
              <div className="h-8" />
              <div className="h-8" />
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-[#000080] px-7 py-3.5 text-[16px] font-bold text-white shadow-md transition-all hover:bg-[#000066] hover:shadow-lg hover:scale-[1.02] active:scale-95"
              >
                <HomeIcon size={18} strokeWidth={2.5} />
                Back to Home Page
              </Link>
            </div>
          ) : null}

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
