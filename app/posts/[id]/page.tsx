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
    <main className="min-h-screen bg-transparent pb-12 text-white">
      <header className="sticky top-0 z-20 bg-[#222222]">
        <div className="mx-auto flex h-[88px] w-full max-w-[720px] items-center justify-center px-4">
          <h1 className="text-[28px] font-black uppercase tracking-[0.14em] text-[#ffd42a] sm:text-[30px]">
            FRESHNEWS.TOP
          </h1>
        </div>
      </header>

      <article className="mx-auto mt-8 w-full max-w-[720px] px-4">
        <div className="rounded-[18px] bg-[#252525] px-5 py-5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] sm:px-6 sm:py-6">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#cfcfcf]">
            <Link href="/" className="text-[#cfcfcf] hover:text-white">
              ഹോം
            </Link>
            <span>›</span>
            <span>{post.source_name}</span>
            <span>›</span>
            <span className="text-white">{post.title}</span>
          </div>

          <h1 className="mb-4 text-[31px] font-extrabold leading-tight text-[#ffd42a] sm:text-[38px]">
            {post.title}
          </h1>

          <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-[#cfcfcf]">
            {publishedDate && (
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {format(publishedDate, 'MMMM d, yyyy')}
              </span>
            )}
            <span>{Math.max(1, Math.ceil(stripHtml(post.summary).split(' ').length / 220))} minute read</span>
          </div>

          <div className="mb-6 aspect-[16/9] w-full overflow-hidden rounded-[14px] bg-[#111111]">
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

          <div className="space-y-5 text-[18px] leading-8 text-[#f1f1f1]">
            {paragraphs.map((paragraph, index) => (
              <p key={`${post.id}-${index}`}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags?.map((tag: string) => (
              <a
                key={tag}
                href={`/?tag=${encodeURIComponent(tag.trim())}`}
                className="rounded-full border border-[#534400] bg-[#3a3100] px-3 py-1 text-xs font-semibold text-[#ffd42a] transition-colors hover:bg-[#ff6a00] hover:text-white"
              >
                {tag.trim()}
              </a>
            ))}
          </div>

          <ShareButtons title={post.title} url={articleUrl} />

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[#373737] pt-6 text-sm text-[#d8d8d8]">
            <Link href="/" className="rounded border border-[#313131] px-4 py-3 hover:border-[#4a4a4a]">
              <div className="mb-1 flex items-center gap-1 text-[#cfcfcf]">
                <ChevronLeft size={14} />
                <span>Previous News</span>
              </div>
              <div>Back to homepage</div>
            </Link>
            <Link href="/" className="rounded border border-[#313131] px-4 py-3 text-right hover:border-[#4a4a4a]">
              <div className="mb-1 flex items-center justify-end gap-1 text-[#cfcfcf]">
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