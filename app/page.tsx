import Link from 'next/link';

import { supabase } from '../lib/supabase';
import { Clock, Menu, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { buildPreview, shortenTitle } from '../lib/posts';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Home() {
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(50);

  if (!posts || posts.length === 0) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-yellow-400 mb-2">No News Available Yet</h1>
          <p className="text-gray-300">The daemon is fetching articles. Check back soon.</p>
        </div>
      </main>
    );
  }

  const heroPost = posts[0];
  const remainingPosts = posts.slice(1);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-10">
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="mx-auto flex h-14 w-full max-w-[800px] items-center justify-between px-4">
          <button
            type="button"
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center text-[var(--text-secondary)]"
          >
            <Menu size={22} strokeWidth={2.5} />
          </button>
          <div className="text-center">
            <h1 className="text-[20px] font-extrabold uppercase tracking-[0.1em] text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-en)' }}>
              FRESHNEWS.TOP
            </h1>
          </div>
          <button
            type="button"
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center text-[var(--text-secondary)]"
          >
            <Search size={22} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* SECTION HEADER */}
      <section className="mx-auto mt-5 w-full max-w-[800px] px-3">
        <div className="mb-4 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-3">
          <div>
            <div className="text-[15px] font-extrabold uppercase tracking-wide text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-en)' }}>Latest</div>
            <div className="mt-1.5 h-[3px] w-10 rounded-full bg-[var(--accent)]" />
          </div>
          <a href="/" className="text-[13px] font-semibold text-[var(--text-secondary)]">
            കൂടുതല്‍ കാണിക്കുക
          </a>
        </div>

        {/* HERO CARD */}
        <article className="overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
          <Link href={`/posts/${heroPost.id}`} className="block">
            {/* IMAGE with source badge overlay */}
            <div className="relative w-full overflow-hidden" style={{ paddingTop: '56.25%' }}>
              {heroPost.image_url ? (
                <img
                  src={heroPost.image_url}
                  alt={heroPost.title}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#21262d] text-sm text-gray-400">
                  No Image Available
                </div>
              )}
              {/* SOURCE BADGE on image */}
              <span className="source-badge">
                {heroPost.source_name}
              </span>
            </div>

            {/* CARD BODY */}
            <div className="px-4 py-3 sm:px-[18px] sm:py-4">
              <div className="mb-2 flex items-center gap-2 text-[11.5px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
                {heroPost.published_at && (
                  <span className="flex items-center gap-1">
                    <Clock size={13} />
                    {formatDistanceToNow(new Date(heroPost.published_at), { addSuffix: true })}
                  </span>
                )}
              </div>

              <h2 className="card-title-hero mb-2 text-[var(--text-primary)]">
                {heroPost.title}
              </h2>

              <p className="card-snippet mb-3">
                {buildPreview(heroPost.summary, 120)}
              </p>
            </div>
          </Link>

          {/* TAGS */}
          <div className="px-4 pb-4 sm:px-[18px]">
            <div className="flex flex-wrap gap-2">
              {heroPost.tags?.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/?tag=${encodeURIComponent(tag.trim())}`}
                  className="rounded-full bg-[var(--bg-primary)] px-3 py-1 text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent)] hover:text-white"
                >
                  #{tag.trim()}
                </Link>
              ))}
            </div>
          </div>
        </article>

        {/* REMAINING CARDS */}
        <div className="mt-5 space-y-4">
          {remainingPosts.map((post) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]"
            >
              <Link href={`/posts/${post.id}`} className="block">
                {/* IMAGE with source badge overlay */}
                <div className="relative w-full overflow-hidden" style={{ paddingTop: '56.25%' }}>
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#21262d] text-sm text-gray-400">
                      No Image Available
                    </div>
                  )}
                  {/* SOURCE BADGE on image */}
                  <span className="source-badge">
                    {post.source_name}
                  </span>
                </div>

                {/* CARD BODY */}
                <div className="px-4 py-3 sm:px-[18px] sm:py-4">
                  <div className="mb-2 flex items-center gap-2 text-[11.5px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
                    {post.published_at && (
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>

                  <h3 className="card-title mb-2 text-[var(--text-primary)]">
                    {post.title}
                  </h3>

                  <p className="card-snippet mb-3">
                    {buildPreview(post.summary, 100)}
                  </p>
                </div>
              </Link>

              {/* TAGS */}
              <div className="px-4 pb-4 sm:px-[18px]">
                <div className="flex flex-wrap gap-2">
                  {post.tags?.slice(0, 4).map((tag: string) => (
                    <Link
                      key={tag}
                      href={`/?tag=${encodeURIComponent(tag.trim())}`}
                      className="rounded-full bg-[var(--bg-primary)] px-3 py-1 text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent)] hover:text-white"
                    >
                      #{tag.trim()}
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
