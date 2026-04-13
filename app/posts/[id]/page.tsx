import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { format } from 'date-fns';

import { supabase } from '../../../lib/supabase';
import { getSiteUrl, splitParagraphs, stripHtml, type PostRecord } from '../../../lib/posts';
import ShareButtons from './share-buttons';
import Header from '../../components/header';
import Footer from '../../components/footer';
import TagBadge from '../../components/tag-badge';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getPost(id: string) {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single<PostRecord>();

  return data;
}

async function getAdjacentPosts(currentId: number, publishedAt: string | null) {
  const prevPost: PostRecord | null = null;
  const nextPost: PostRecord | null = null;

  if (!publishedAt) return { prevPost, nextPost };

  // Previous post (older)
  const { data: prev } = await supabase
    .from('posts')
    .select('id, title, image_url')
    .lt('published_at', publishedAt)
    .order('published_at', { ascending: false })
    .limit(1)
    .single<Pick<PostRecord, 'id' | 'title' | 'image_url'>>();

  // Next post (newer)
  const { data: next } = await supabase
    .from('posts')
    .select('id, title, image_url')
    .gt('published_at', publishedAt)
    .order('published_at', { ascending: true })
    .limit(1)
    .single<Pick<PostRecord, 'id' | 'title' | 'image_url'>>();

  return { prevPost: prev, nextPost: next };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return { title: 'Article Not Found | FreshNews.top' };
  }

  const siteUrl = getSiteUrl();
  const articleUrl = `${siteUrl}/posts/${post.id}`;
  const description = stripHtml(post.summary).slice(0, 220);

  return {
    title: `${post.title} | FreshNews.top`,
    description,
    alternates: { canonical: articleUrl },
    openGraph: {
      type: 'article',
      url: articleUrl,
      title: post.title,
      description,
      images: post.image_url ? [{ url: post.image_url, alt: post.title }] : undefined,
    },
    twitter: {
      card: post.image_url ? 'summary_large_image' : 'summary',
      title: post.title,
      description,
      images: post.image_url ? [post.image_url] : undefined,
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    notFound();
  }

  const paragraphs = splitParagraphs(post.summary);
  const publishedDate = post.published_at ? new Date(post.published_at) : null;
  const articleUrl = `${getSiteUrl()}/posts/${post.id}`;

  const { prevPost, nextPost } = await getAdjacentPosts(post.id, post.published_at ?? null);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />

      <main className="pb-8">
        <article className="mx-auto mt-6 w-full max-w-[850px] px-4 sm:px-8">
          <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] px-10 py-8 sm:px-20 sm:py-12 break-words">
            {/* BREADCRUMB */}
            <div className="mb-5 flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
              <Link href="/" className="text-[var(--text-secondary)] hover:text-[#ffd42a]">
                ഹോം
              </Link>
              <span>›</span>
              <span>{post.source_name}</span>
            </div>

            {/* TITLE – yellow */}
            <h1 className="post-title mb-5 text-[#ffd42a]">
              {post.title}
            </h1>

            {/* META */}
            <div className="mb-6 flex flex-wrap items-center gap-4 border-t border-b border-[var(--border)] py-3 text-[12px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
              {publishedDate && (
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {format(publishedDate, 'MMMM d, yyyy')}
                </span>
              )}
              <span>{Math.max(1, Math.ceil(stripHtml(post.summary).split(' ').length / 220))} minute read</span>
            </div>

            {/* IMAGE */}
            <div className="mb-8 w-full overflow-hidden rounded-xl">
              {post.image_url ? (
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full max-h-[500px] object-cover object-center"
                />
              ) : (
                <div className="flex h-48 w-full items-center justify-center bg-[#21262d] text-sm text-[var(--text-muted)]">
                  No Image Available
                </div>
              )}
            </div>

            {/* ARTICLE BODY */}
            <div className="article-body text-[var(--text-primary)]">
              {paragraphs.map((paragraph, index) => (
                <p key={`${post.id}-${index}`}>{paragraph}</p>
              ))}
            </div>

            {/* TAGS – colorful */}
            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
              <span className="text-[12px] font-bold text-white bg-gray-700 px-3 py-1.5 rounded-md" style={{ fontFamily: 'var(--font-en)' }}>Tags</span>
              {post.tags?.slice(0, 4).map((tag: string) => (
                <TagBadge key={tag} tag={tag} withHash={false} />
              ))}
            </div>

            {/* SHARE BUTTONS */}
            <ShareButtons title={post.title} url={articleUrl} />

            {/* BACK TO HOME BUTTON */}
            <div className="mt-12 text-center border-t border-[var(--border)] pt-10 mb-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-[#e91e63] px-7 py-3.5 text-[16px] font-bold text-white shadow-md transition-all hover:bg-[#c2185b] hover:shadow-lg hover:scale-[1.02] active:scale-95"
              >
                <Home size={18} strokeWidth={2.5} />
                Back to Home Page
              </Link>
            </div>

            {/* PREV / NEXT NAVIGATION with title + image */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--border)] pt-6">
              {/* Previous (older) */}
              {prevPost ? (
                <Link
                  href={`/posts/${prevPost.id}`}
                  className="group flex items-start gap-3 rounded-xl border border-[var(--border)] p-3 transition-colors hover:border-[#ffd42a]/50 hover:bg-[var(--bg-primary)]"
                >
                  {prevPost.image_url && (
                    <img
                      src={prevPost.image_url}
                      alt={prevPost.title}
                      className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
                      <ChevronLeft size={12} />
                      വളരെ പഴയ
                    </div>
                    <div className="text-[13px] font-semibold leading-tight text-[var(--text-secondary)] group-hover:text-[#ffd42a] transition-colors line-clamp-2">
                      {prevPost.title}
                    </div>
                  </div>
                </Link>
              ) : (
                <div />
              )}

              {/* Next (newer) */}
              {nextPost ? (
                <Link
                  href={`/posts/${nextPost.id}`}
                  className="group flex items-start gap-3 rounded-xl border border-[var(--border)] p-3 transition-colors hover:border-[#ffd42a]/50 hover:bg-[var(--bg-primary)]"
                >
                  <div className="min-w-0 flex-1 text-right">
                    <div className="mb-1 flex items-center justify-end gap-1 text-[11px] font-semibold text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
                      വളരെ പുതിയ
                      <ChevronRight size={12} />
                    </div>
                    <div className="text-[13px] font-semibold leading-tight text-[var(--text-secondary)] group-hover:text-[#ffd42a] transition-colors line-clamp-2">
                      {nextPost.title}
                    </div>
                  </div>
                  {nextPost.image_url && (
                    <img
                      src={nextPost.image_url}
                      alt={nextPost.title}
                      className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                    />
                  )}
                </Link>
              ) : (
                <div />
              )}
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}