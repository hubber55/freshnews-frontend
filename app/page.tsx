import Link from 'next/link';

import { supabase } from '../lib/supabase';
import { Clock, Menu, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { buildPreview } from '../lib/posts';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Home() {
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(50);

  if (!posts || posts.length === 0) {
    return (
      <main className="min-h-screen bg-[#1f1f1f] flex items-center justify-center p-4 text-white">
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
    <main className="min-h-screen bg-transparent text-white pb-10">
      <header className="sticky top-0 z-20 bg-[#222222]">
        <div className="mx-auto flex h-[88px] w-full max-w-[720px] items-center justify-between px-4">
          <button
            type="button"
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center text-[#ff6a00]"
          >
            <Menu size={24} strokeWidth={2.5} />
          </button>
          <div className="text-center">
            <h1 className="text-[28px] font-black uppercase tracking-[0.14em] text-[#ffd42a] [text-shadow:0_2px_0_rgba(0,0,0,0.4)] sm:text-[30px]">
              FRESHNEWS.TOP
            </h1>
          </div>
          <button
            type="button"
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center text-white"
          >
            <Search size={24} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <section className="mx-auto mt-8 w-full max-w-[720px] px-4">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-[#3a3a3a] pb-3">
          <div>
            <div className="text-[18px] font-extrabold uppercase tracking-wide text-white">Latest</div>
            <div className="mt-2 h-1 w-16 rounded-full bg-[#ff6a00]" />
          </div>
          <a href="/" className="text-sm font-semibold text-white sm:text-base">
            കൂടുതല്‍ കാണിക്കുക
          </a>
        </div>

        <Link href={`/posts/${heroPost.id}`} className="block overflow-hidden rounded-[18px] bg-[#252525] shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-transform hover:scale-[1.01]">
          <div className="aspect-[16/9] w-full overflow-hidden bg-[#111111]">
            {heroPost.image_url ? (
              <img
                src={heroPost.image_url}
                alt={heroPost.title}
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                No Image Available
              </div>
            )}
          </div>

          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="rounded-full bg-[#ff6a00] px-3 py-1 font-bold uppercase text-white">
                {heroPost.source_name}
              </span>
              {heroPost.published_at && (
                <span className="flex items-center gap-1 text-[#cfcfcf]">
                  <Clock size={13} />
                  {formatDistanceToNow(new Date(heroPost.published_at), { addSuffix: true })}
                </span>
              )}
            </div>

            <h2 className="mb-3 text-[30px] font-extrabold leading-tight text-[#ffd42a] sm:text-[36px]">
              {heroPost.title}
            </h2>

            <p className="mb-4 text-[18px] leading-8 text-[#f1f1f1]">
              {buildPreview(heroPost.summary)}
            </p>

            <div className="flex flex-wrap gap-2">
              {heroPost.tags?.map((tag: string) => (
                <a
                  key={tag}
                  href={`/?tag=${encodeURIComponent(tag.trim())}`}
                  className="rounded-full border border-[#534400] bg-[#3a3100] px-3 py-1 text-xs font-semibold text-[#ffd42a] transition-colors hover:bg-[#ff6a00] hover:text-white"
                >
                  #{tag.trim()}
                </a>
              ))}
            </div>
          </div>
        </Link>

        <div className="mt-6 space-y-5">
          {remainingPosts.map((post) => (
            <Link
              href={`/posts/${post.id}`}
              key={post.id}
              className="block overflow-hidden rounded-[18px] bg-[#252525] shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition-transform hover:scale-[1.01]"
            >
              <div className="aspect-[16/9] w-full overflow-hidden bg-[#111111]">
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                    No Image Available
                  </div>
                )}
              </div>

              <div className="px-5 py-4 sm:px-6 sm:py-5">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <span className="rounded-full bg-[#ff6a00] px-3 py-1 font-bold uppercase text-white">
                    {post.source_name}
                  </span>
                  {post.published_at && (
                    <span className="flex items-center gap-1 text-[#cfcfcf]">
                      <Clock size={13} />
                      {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                    </span>
                  )}
                </div>

                <h3 className="mb-3 text-[24px] font-extrabold leading-tight text-[#ffd42a] sm:text-[28px]">
                  {post.title}
                </h3>

                <p className="mb-4 text-[17px] leading-7 text-[#f1f1f1] summary-copy">
                  {buildPreview(post.summary)}
                </p>

                <div className="flex flex-wrap gap-2">
                  {post.tags?.slice(0, 4).map((tag: string) => (
                    <a
                      key={tag}
                      href={`/?tag=${encodeURIComponent(tag.trim())}`}
                      className="rounded-full border border-[#534400] bg-[#3a3100] px-3 py-1 text-xs font-semibold text-[#ffd42a] transition-colors hover:bg-[#ff6a00] hover:text-white"
                    >
                      #{tag.trim()}
                    </a>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
