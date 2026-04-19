import Link from 'next/link';
import { connection } from 'next/server';

import { supabase } from '@/lib/supabase';
import { Clock, Home as HomeIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { hasMinimumWords, limitWords } from '../lib/posts';
import Header from './components/header';
import Footer from './components/footer';
import TrackedLink from './components/TrackedLink';

// export const revalidate = 60; // Disabled for testing

type HomeProps = {
  searchParams: Promise<{ tag?: string; page?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  await connection();

  const params = await searchParams;
  const activeTag = params.tag?.trim() || '';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const pageSize = 100;
  const overfetch = 300;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('posts')
    .select('*')
    .eq('is_deleted', false)
    .order('published_at', { ascending: false })
    .range(from, from + overfetch - 1);

  // If a tag is selected, filter by it (Supabase array contains)
  if (activeTag) {
    query = query.contains('tags', [activeTag]);
  }

  const { data: posts } = await query;
  const eligiblePostsAll = (posts ?? []).filter((post) => hasMinimumWords(post.summary, 70));
  const eligiblePosts = eligiblePostsAll.slice(0, pageSize);
  const hasNextPage = eligiblePostsAll.length > pageSize || (posts?.length ?? 0) === overfetch;

  if (eligiblePosts.length === 0) {
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

  const heroPost = page === 1 ? eligiblePosts[0] : null;
  const remainingPosts = page === 1 ? eligiblePosts.slice(1) : eligiblePosts;
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
            {remainingPosts.map((post) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]"
              >
                <TrackedLink href={`/posts/${post.id}`} className="block" trackEvent={{ postId: post.id, eventType: 'click' }}>
                  <div className="relative w-full overflow-hidden" style={{ paddingTop: '56.25%' }}>
                    {post.image_url ? (
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="absolute inset-0 h-full w-full object-cover object-center"
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
