import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Clock, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { format } from 'date-fns';

export const revalidate = 60; // ISR: Revalidate every 60 seconds

import { supabase } from '../../../lib/supabase';
import { getSiteUrl, limitWords, splitParagraphs, stripHtml, type PostRecord } from '../../../lib/posts';
import ShareButtons from './share-buttons';
import Header from '../../components/header';
import Footer from '../../components/footer';
import TagBadge from '../../components/tag-badge';
import CommentsSection from '../../components/CommentsSection';
import PostTracker from '../../components/PostTracker';
import NetworkAd from '../../components/NetworkAd';
import { createAdminClient } from '../../../lib/supabase-admin';
import ImageGallery from '../../components/ImageGallery';

type AdNetwork = {
  enabled?: boolean;
  code?: string;
};

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

  if (networks.length === 0) return options.legacyAdsterra || '';
  if (!options.randomEnabled) return networks[0];
  return networks[Math.floor(Math.random() * networks.length)];
}

function isMountTargetAd(code: string): boolean {
  const trimmed = code.trim();
  return /^\s*<div[^>]+id\s*=\s*["'][^"']+["'][^>]*>\s*<\/div>\s*$/i.test(trimmed);
}

function AdSlot({ code }: { code: string }) {
  const trimmed = code?.trim();
  if (!trimmed) return null;
  return (
    <div className="relative my-8 w-full rounded-lg overflow-hidden flex items-center justify-center min-h-[50px]">
      <span
        className="absolute top-1 right-2 z-10 text-[9px] font-semibold leading-none text-[var(--text-muted)] opacity-50"
        style={{ fontFamily: 'var(--font-en)' }}
      >
        Advertisement
      </span>
      {isMountTargetAd(trimmed) ? (
        <div className="w-full" dangerouslySetInnerHTML={{ __html: trimmed }} />
      ) : (
        <NetworkAd code={trimmed} />
      )}
    </div>
  );
}


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
  const seoDescription = stripHtml(post.summary).slice(0, 220);

  return {
    title: `${post.title} | FreshNews.top`,
    description: seoDescription,
    alternates: { canonical: articleUrl },
    openGraph: {
      type: 'article',
      url: articleUrl,
      title: post.title,
      description: seoDescription,
      images: post.image_url ? [{ url: post.image_url, alt: post.title }] : undefined,
    },
    twitter: {
      card: post.image_url ? 'summary_large_image' : 'summary',
      title: post.title,
      description: seoDescription,
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
  const bodyItems = paragraphs.flatMap((paragraph) => {
    const creditPrefix = 'Photo and News Source:';
    const creditIndex = paragraph.indexOf(creditPrefix);

    if (creditIndex < 0) {
      return [{ text: paragraph, isCredit: false }];
    }

    const before = paragraph.slice(0, creditIndex).trim();
    const after = paragraph.slice(creditIndex + creditPrefix.length).trim();
    const result: Array<{ text: string; isCredit: boolean }> = [];

    if (before) {
      result.push({ text: before, isCredit: false });
    }

    result.push({
      text: `${creditPrefix}${after ? ` ${after}` : ''}`,
      isCredit: true,
    });

    return result;
  });
  const publishedDate = post.published_at ? new Date(post.published_at) : null;
  const articleUrl = `${getSiteUrl()}/posts/${post.id}`;

  const { prevPost, nextPost } = await getAdjacentPosts(post.id, post.published_at ?? null);

  // Related articles: find 4 posts sharing at least one tag
  let relatedPosts: Pick<PostRecord, 'id' | 'title' | 'image_url'>[] = [];
  if (post.tags && post.tags.length > 0) {
    const { data: related } = await supabase
      .from('posts')
      .select('id, title, image_url')
      .neq('id', post.id)
      .eq('is_deleted', false)
      .overlaps('tags', post.tags)
      .order('published_at', { ascending: false })
      .limit(4);
      relatedPosts = related ?? [];
  }

  // More from source: find 3 recent articles from the same source
  let moreFromSource: Pick<PostRecord, 'id' | 'title' | 'image_url'>[] = [];
  if (post.source_name) {
    const { data: fromSource } = await supabase
      .from('posts')
      .select('id, title, image_url')
      .neq('id', post.id)
      .eq('is_deleted', false)
      .eq('source_name', post.source_name)
      .order('published_at', { ascending: false })
      .limit(3);
    moreFromSource = fromSource ?? [];
  }

  // Fetch Ad Network Code from the server-side admin client so public rendering
  // does not depend on anon read access to admin_settings.
  const adminSupabase = createAdminClient();
  const { data: adSettings } = await adminSupabase
    .from('admin_settings')
    .select('key, value')
    .in('key', ['adsterra_code', 'ad_networks', 'ad_networks_random']);

  const adSettingsMap = new Map((adSettings ?? []).map((s) => [s.key, s.value]));
  const legacyAdsterra = typeof adSettingsMap.get('adsterra_code') === 'string' ? adSettingsMap.get('adsterra_code')!.trim() : '';
  const randomAdsEnabled = String(adSettingsMap.get('ad_networks_random') ?? '').toLowerCase() === 'true';
  const adCode = pickAdCode({
    adNetworksJson: adSettingsMap.get('ad_networks'),
    randomEnabled: randomAdsEnabled,
    legacyAdsterra,
  });

  // Build JSON-LD structured data
  const seoDescription = stripHtml(post.summary).slice(0, 220);
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    image: post.image_url ? [post.image_url] : undefined,
    datePublished: post.published_at || undefined,
    author: { '@type': 'Organization', name: post.source_name || 'FreshNews.top' },
    publisher: {
      '@type': 'Organization',
      name: 'FreshNews.top',
      logo: { '@type': 'ImageObject', url: `${getSiteUrl()}/logos/freshnews_header.png` },
    },
    description: seoDescription,
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
  };

  // FAQ structured data (only if FAQ exists)
  const faqItems = Array.isArray(post.faq) ? post.faq.filter(f => f.q && f.a) : [];
  const faqJsonLd = faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  } : null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <Header />

      <main className="pb-8">
        <article className="mx-auto mt-6 w-full max-w-[850px] px-3 sm:px-4">
          <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] px-2.5 py-6 sm:px-5 sm:py-8 break-words">
            {/* BREADCRUMB */}
            <div className="mb-5 flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
              <Link href="/" className="text-[var(--text-secondary)] hover:text-[#ffd42a]">
                ഹോം
              </Link>
              <span>›</span>
              <span>{post.source_name}</span>
            </div>

            {/* TITLE */}
            <h1 className="post-title mb-5 text-[#00ffff]">
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

            {/* IMAGE GALLERY */}
            <div className="mb-8">
              {post.image_url ? (
                <ImageGallery
                  images={post.image_url.startsWith('["') ? JSON.parse(post.image_url) : [post.image_url]}
                  alt={post.title}
                />
              ) : (
                <div className="flex h-48 w-full items-center justify-center rounded-xl bg-[#21262d] text-sm text-[var(--text-muted)]">
                  No Image Available
                </div>
              )}
            </div>

            {/* ARTICLE BODY */}
            <div className="article-body text-[var(--text-primary)]">
              {bodyItems.map((item, index) => {
                if (item.isCredit) {
                  const [prefix, ...nameParts] = item.text.split(':');
                  const sourceName = nameParts.join(':').trim();
                  
                  return (
                    <p
                      key={`${post.id}-${index}`}
                      className="text-[10px] italic opacity-70 mt-12 mb-6 leading-relaxed tracking-wide"
                    >
                      {prefix}: <span className="text-[#00ffff] font-medium">
                        {post.original_url ? (
                          <a 
                            href={post.original_url} 
                            target="_blank" 
                            rel="nofollow" 
                            className="hover:underline"
                          >
                            {sourceName || post.source_name}
                          </a>
                        ) : (
                          sourceName || post.source_name
                        )}
                      </span>
                    </p>
                  );
                }

                return (
                  <p
                    key={`${post.id}-${index}`}
                    className="mb-6 leading-loose"
                  >
                    {item.text}
                  </p>
                );
              })}
            </div>

            {/* PRICE & CONTACT */}
            {(post.price || post.contact_phone) && (
              <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-wrap gap-x-10 gap-y-6 items-center">
                {post.price && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1" style={{ fontFamily: 'var(--font-en)' }}>Price</span>
                    <span className="text-[#00ffff] font-black text-2xl">{post.price}</span>
                  </div>
                )}
                {post.contact_phone && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1" style={{ fontFamily: 'var(--font-en)' }}>Contact</span>
                    <a href={`tel:${post.contact_phone}`} className="text-[#ffd42a] font-black text-2xl hover:underline">
                      {post.contact_phone}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* TAGS – colorful */}
            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-8">
              <span className="text-[12px] font-bold text-white bg-gray-700 px-3 py-1.5 rounded-md" style={{ fontFamily: 'var(--font-en)' }}>Tags</span>
              {post.tags?.slice(0, 5).map((tag: string, i: number) => (
                <TagBadge key={tag} tag={tag} withHash={false} index={i} />
              ))}
            </div>

            {/* SHARE BUTTONS */}
            <div className="mt-10">
              <ShareButtons postId={post.id} title={post.title} url={articleUrl} />
            </div>

            {/* AUTOMATIC VIEW TRACKING */}
            <PostTracker postId={post.id} />

            {/* COMMENTS SECTION - positioned above Back to Home */}
            <div className="mt-10">
              <CommentsSection postId={post.id} />
            </div>

            {adCode && <AdSlot code={adCode} />}

            {/* FAQ SECTION */}
            {faqItems.length > 0 && (
              <div className="mt-10 border-t border-[var(--border)] pt-8">
                <h2 className="text-lg font-bold text-[#ffd42a] mb-5" style={{ fontFamily: 'var(--font-en)' }}>
                  ചോദ്യം ഉത്തരം (FAQ)
                </h2>
                <div className="space-y-4">
                  {faqItems.map((item, i) => (
                    <details
                      key={i}
                      className="group rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] overflow-hidden"
                    >
                      <summary className="cursor-pointer px-4 py-3 text-[14px] font-semibold text-[#00ffff] hover:bg-[var(--border)]/20 transition-colors flex items-center justify-between">
                        <span>{item.q}</span>
                        <span className="text-[var(--text-muted)] text-xs ml-2 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="px-4 pb-4 pt-1 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* RELATED ARTICLES */}
            {relatedPosts.length > 0 && (
              <div className="mt-10 border-t border-[var(--border)] pt-8">
                <h2 className="text-lg font-bold text-[#90ee90] mb-5" style={{ fontFamily: 'var(--font-en)' }}>
                  സമാന വാർത്തകൾ
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {relatedPosts.map((rp) => (
                    <Link
                      key={rp.id}
                      href={`/posts/${rp.id}`}
                      className="group rounded-xl border border-[var(--border)] overflow-hidden transition-colors hover:border-[#ffd42a]/50 hover:bg-[var(--bg-primary)]"
                    >
                      {rp.image_url && (
                        <img
                          src={rp.image_url}
                          alt={rp.title}
                          className="w-full h-24 object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="p-2.5">
                        <div className="text-[12px] font-semibold leading-snug text-[#ffd42a] group-hover:text-[#ffe98a] transition-colors line-clamp-2">
                          {limitWords(rp.title, 8)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* MORE FROM SOURCE */}
            {moreFromSource.length > 0 && (
              <div className="mt-10 border-t border-[var(--border)] pt-8">
                <h2 className="text-lg font-bold text-[#ffd42a] mb-5" style={{ fontFamily: 'var(--font-en)' }}>
                  {post.source_name}ൽ നിന്നുള്ള കൂടുതൽ വാർത്തകൾ
                </h2>
                <div className="space-y-4">
                  {moreFromSource.map((sp) => (
                    <Link
                      key={sp.id}
                      href={`/posts/${sp.id}`}
                      className="group flex items-center gap-4 rounded-xl border border-[var(--border)] p-2 transition-colors hover:border-[#ffd42a]/50 hover:bg-[var(--bg-primary)]"
                    >
                      {sp.image_url && (
                        <img
                          src={sp.image_url}
                          alt={sp.title}
                          className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold leading-tight text-[#00cfff] group-hover:text-[#66e0ff] transition-colors line-clamp-2">
                          {limitWords(sp.title, 12)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-20 text-center">
              <div className="h-8" /> {/* Line break 1 */}
              <div className="h-8" /> {/* Line break 2 */}
              <div className="h-8" /> {/* Line break 3 */}
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-[#000080] px-7 py-3.5 text-[16px] font-bold text-white shadow-md transition-all hover:bg-[#000066] hover:shadow-lg hover:scale-[1.02] active:scale-95"
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
                      Previous
                    </div>
                    <div className="text-[13px] font-semibold leading-tight text-[#ffd42a] group-hover:text-[#ffe98a] transition-colors line-clamp-2">
                      {limitWords(prevPost.title, 10)}
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
                      Next
                      <ChevronRight size={12} />
                    </div>
                    <div className="text-[13px] font-semibold leading-tight text-[#90ee90] group-hover:text-[#b5f5b5] transition-colors line-clamp-2">
                      {limitWords(nextPost.title, 10)}
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
                <Link
                  href="/"
                  className="group flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] p-3 text-[13px] font-bold text-[#90ee90] transition-all hover:bg-[var(--bg-card)] hover:border-[#90ee90]"
                >
                  Go Latest
                  <ChevronRight size={16} />
                </Link>
              )}
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
