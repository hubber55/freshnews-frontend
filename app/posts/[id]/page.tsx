import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

import { supabase } from '../../../lib/supabase';
import { getSiteUrl, splitParagraphs, stripHtml, type PostRecord } from '../../../lib/posts';
import ShareButtons from './share-buttons';

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return {
      title: 'Article Not Found | FreshNews.top',
    };
  }

  const siteUrl = getSiteUrl();
  const articleUrl = `${siteUrl}/posts/${post.id}`;
  const description = stripHtml(post.summary).slice(0, 220);

  return {
    title: `${post.title} | FreshNews.top`,
    description,
    alternates: {
      canonical: articleUrl,
    },
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

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pb-12 text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="mx-auto flex h-14 w-full max-w-[800px] items-center justify-center px-4">
          <h1 className="text-[20px] font-extrabold uppercase tracking-[0.1em] text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-en)' }}>
            <Link href="/">FRESHNEWS.TOP</Link>
          </h1>
        </div>
      </header>

      <article className="mx-auto mt-5 w-full max-w-[800px] px-3">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] px-4 py-5 sm:px-5 sm:py-6">
          {/* BREADCRUMB */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
            <Link href="/" className="text-[var(--text-secondary)] hover:text-white">
              ഹോം
            </Link>
            <span>›</span>
            <span>{post.source_name}</span>
          </div>

          {/* TITLE */}
          <h1 className="post-title mb-4 text-[var(--text-primary)]">
            {post.title}
          </h1>

          {/* META */}
          <div className="mb-5 flex flex-wrap items-center gap-4 border-t border-b border-[var(--border)] py-3 text-[12px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
            {publishedDate && (
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {format(publishedDate, 'MMMM d, yyyy')}
              </span>
            )}
            <span>{Math.max(1, Math.ceil(stripHtml(post.summary).split(' ').length / 220))} minute read</span>
          </div>

          {/* IMAGE */}
          <div className="mb-6 w-full overflow-hidden rounded-xl">
            {post.image_url ? (
              <img
                src={post.image_url}
                alt={post.title}
                className="w-full max-h-[480px] object-cover object-center"
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center bg-[#21262d] text-sm text-gray-400">
                No Image Available
              </div>
            )}
          </div>

          {/* ARTICLE BODY – 17px, line-height 1.85, paragraph spacing 18px */}
          <div className="article-body text-[var(--text-primary)]">
            {paragraphs.map((paragraph, index) => (
              <p key={`${post.id}-${index}`}>{paragraph}</p>
            ))}
          </div>

          {/* TAGS */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--border)] pt-5">
            {post.tags?.map((tag: string) => (
              <a
                key={tag}
                href={`/?tag=${encodeURIComponent(tag.trim())}`}
                className="rounded-full bg-[var(--bg-primary)] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent)] hover:text-white"
              >
                {tag.trim()}
              </a>
            ))}
          </div>

          {/* SHARE BUTTONS */}
          <ShareButtons title={post.title} url={articleUrl} />

          {/* NAVIGATION */}
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-6 text-[13px] text-[var(--text-secondary)]">
            <Link href="/" className="rounded-lg border border-[var(--border)] px-4 py-3 hover:border-[var(--text-muted)] transition-colors">
              <div className="mb-1 flex items-center gap-1 text-[var(--text-muted)]">
                <ChevronLeft size={14} />
                <span>Previous News</span>
              </div>
              <div>Back to homepage</div>
            </Link>
            <Link href="/" className="rounded-lg border border-[var(--border)] px-4 py-3 text-right hover:border-[var(--text-muted)] transition-colors">
              <div className="mb-1 flex items-center justify-end gap-1 text-[var(--text-muted)]">
                <span>Latest News</span>
                <ChevronRight size={14} />
              </div>
              <div>More FreshNews posts</div>
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}