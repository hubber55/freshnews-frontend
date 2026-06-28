import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { CalendarDays, Clock, MapPin, Megaphone, Phone, Banknote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import Header from '../../components/header';
import Footer from '../../components/footer';
import ImageGallery from '../../components/ImageGallery';
import { createAdminClient } from '@/lib/supabase-admin';
import ShareButtons from '../../posts/[id]/share-buttons';
import { getSiteUrl, stripHtml } from '@/lib/posts';

type ClassifiedSubmission = {
  id: number;
  title: string;
  content: string | null;
  image_url: string | null;
  location: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
  wa_users?: { name?: string | null } | null;
  ad_categories?: { name?: string | null } | null;
  ad_subcategories?: { name?: string | null } | null;
  price?: string | null;
  contact_phone?: string | null;
  tags?: string[] | null;
  category_id?: number | null;
  subcategory_id?: number | null;
};

function getPrimaryImage(imageUrl: string | null) {
  if (!imageUrl) return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return typeof parsed[0] === 'string' ? parsed[0] : null;
      }
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isFinite(numericId)) {
    return { title: 'Classified Not Found | FreshNews.top' };
  }

  const supabase = createAdminClient();
  const { data: item } = await supabase
    .from('submissions')
    .select('id, title, content, image_url')
    .eq('id', numericId)
    .eq('type', 'classified')
    .eq('status', 'approved')
    .single();

  if (!item) {
    return { title: 'Classified Not Found | FreshNews.top' };
  }

  const siteUrl = getSiteUrl();
  const articleUrl = `${siteUrl}/classifieds/${item.id}`;
  const rawImage = getPrimaryImage(item.image_url);
  const imageUrl = rawImage || `${siteUrl}/og_image.png`;
  const seoDescription = item.content ? stripHtml(item.content).slice(0, 220) : '';

  return {
    title: `${item.title} | Classifieds | FreshNews.top`,
    description: seoDescription,
    alternates: { canonical: articleUrl },
    openGraph: {
      type: 'article',
      url: articleUrl,
      title: item.title,
      description: seoDescription,
      images: [
        {
          url: imageUrl,
          alt: item.title,
        }
      ],
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: item.title,
      description: seoDescription,
      images: [imageUrl],
    },
  };
}

function linkifyText(text: string) {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s/$.?#].[^\s]*|www\.[^\s/$.?#].[^\s]*)/gi;
  const tokens = text.split(/(\s+)/);
  
  return tokens.map((token, idx) => {
    const isUrl = urlRegex.test(token);
    urlRegex.lastIndex = 0; // reset
    
    if (isUrl) {
      const href = token.toLowerCase().startsWith('http') ? token : `http://${token}`;
      return (
        <a
          key={idx}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00ffff] hover:underline underline-offset-4 decoration-2"
        >
          {token}
        </a>
      );
    }
    
    return token;
  });
}

export default async function ClassifiedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isFinite(numericId)) {
    notFound();
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id,
      title,
      content,
      image_url,
      location,
      status,
      created_at,
      expires_at,
      category_id,
      subcategory_id,
      wa_users (name),
      ad_categories (name),
      ad_subcategories (name),
      price,
      contact_phone,
      tags
    `)
    .eq('id', numericId)
    .eq('type', 'classified')
    .eq('status', 'approved')
    .single();

  if (error || !data) {
    notFound();
  }

  const item = data as ClassifiedSubmission;
  const image = getPrimaryImage(item.image_url);
  const articleUrl = `${getSiteUrl()}/classifieds/${item.id}`;

  // Fetch similar ads (from same subcategory)
  const { data: similarAdsData } = item.subcategory_id ? await supabase
    .from('submissions')
    .select(`
      id,
      title,
      image_url,
      location,
      price,
      created_at,
      ad_subcategories (name)
    `)
    .eq('type', 'classified')
    .eq('status', 'approved')
    .eq('subcategory_id', item.subcategory_id)
    .neq('id', item.id)
    .order('created_at', { ascending: false })
    .limit(4) : { data: [] };

  const similarAds = (similarAdsData || []) as any[];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />

      <main className="mx-auto w-full max-w-[1100px] px-5 py-6 sm:px-6">
        <div className="mb-4">
          <Link href="/classifieds" className="text-sm font-semibold text-[#00cfff] hover:underline">
            Back to Classifieds
          </Link>
        </div>

        <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="grid gap-0 md:grid-cols-[320px_1fr]">
            <div className="relative bg-black/20 md:border-r border-[var(--border)] min-h-[280px]">
              {item.image_url ? (
                <ImageGallery
                  images={item.image_url.startsWith('[') ? JSON.parse(item.image_url) : [item.image_url]}
                  alt={item.title}
                />
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-[var(--text-muted)]">
                  No Image Available
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                <span className="rounded-full bg-[#00cfff]/10 px-2.5 py-1 text-[#00cfff]">
                  {item.ad_categories?.name || 'Classified'}
                </span>
                {item.ad_subcategories?.name ? (
                  <span className="rounded-full bg-white/5 px-2.5 py-1">{item.ad_subcategories.name}</span>
                ) : null}
              </div>

              <h1 className="text-3xl font-extrabold leading-tight text-white">{item.title}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <Clock size={13} />
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </span>
                {item.location ? (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} />
                    {item.location}
                  </span>
                ) : null}
                {item.expires_at ? (
                  <span className="flex items-center gap-1">
                    <CalendarDays size={13} />
                    Expires {formatDistanceToNow(new Date(item.expires_at), { addSuffix: true })}
                  </span>
                ) : null}
                {item.price ? (
                  <span className="flex items-center gap-1 font-bold text-[#ffd42a]">
                    <Banknote size={13} />
                    Price: {item.price}
                  </span>
                ) : null}
                {item.contact_phone ? (
                  <span className="flex items-center gap-1 font-bold text-[#00cfff]">
                    <Phone size={13} />
                    Contact: {item.contact_phone}
                  </span>
                ) : null}
              </div>

              {item.content ? (
                <p className="mt-5 whitespace-pre-line text-[16px] leading-7 text-white font-medium">
                  {linkifyText(item.content)}
                </p>
              ) : null}

              {/* TAGS */}
              {item.tags && item.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 pt-6 border-t border-white/5">
                  {item.tags.map((tag, idx) => {
                    if (['jobs', 'job', 'classifieds', 'classified', 'real estate'].includes(tag.toLowerCase())) return null;
                    const formattedTag = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
                    const categoryParam = item.ad_categories?.name ? `&category=${encodeURIComponent(item.ad_categories.name)}` : '';
                    return (
                      <Link 
                        key={idx} 
                        href={`/classifieds?tag=${encodeURIComponent(tag)}${categoryParam}`}
                        className="text-[11px] font-bold text-[#00ffff] bg-[#00ffff]/5 px-3 py-1 rounded-full border border-[#00ffff]/10 tracking-wide hover:bg-[#00ffff]/10 transition-all"
                      >
                        {formattedTag}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* REPEAT PRICE AND PHONE AT END */}
              <div className="mt-8 pt-8 border-t border-white/10 flex flex-wrap gap-6">
                {item.price ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-widest">Price</span>
                    <div className="flex items-center gap-1.5 text-xl font-black text-[#ffd42a]">
                      <Banknote size={20} />
                      {item.price}
                    </div>
                  </div>
                ) : null}
                {item.contact_phone ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-widest">Contact</span>
                    <a href={`tel:${item.contact_phone}`} className="flex items-center gap-1.5 text-xl font-black text-[#00ffff] hover:underline transition-all">
                      <Phone size={20} />
                      {item.contact_phone}
                    </a>
                  </div>
                ) : null}
              </div>

              {/* SHARE BUTTONS */}
              <div className="mt-8">
                <ShareButtons postId={item.id} title={item.title} url={articleUrl} />
              </div>
            </div>
          </div>
        </article>

        {/* SIMILAR ADS SECTION */}
        {similarAds.length > 0 && (
          <div className="mt-10 border-t border-[var(--border)] pt-8">
            <h2 className="text-lg font-bold text-[#00cfff] mb-5 flex items-center gap-2" style={{ fontFamily: 'var(--font-en)' }}>
              <Megaphone size={18} className="text-[#ffd42a]" />
              Similar Ads
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {similarAds.map((ad) => {
                const adImage = getPrimaryImage(ad.image_url);
                return (
                  <Link
                    key={ad.id}
                    href={`/classifieds/${ad.id}`}
                    className="group rounded-xl border border-[var(--border)] overflow-hidden transition-colors hover:border-[#00cfff]/50 hover:bg-[var(--bg-primary)] flex flex-col h-full bg-[var(--bg-card)]"
                  >
                    <div className="relative w-full h-28 bg-black/20 overflow-hidden flex-shrink-0">
                      {adImage ? (
                        <img
                          src={adImage}
                          alt={ad.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-[var(--text-muted)]">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[12px] font-bold text-white group-hover:text-[#00cfff] transition-colors line-clamp-2 mb-1.5 leading-snug">
                          {ad.title}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {ad.price && (
                          <div className="text-[11px] font-black text-[#ffd42a] flex items-center gap-0.5">
                            <Banknote size={11} /> {ad.price}
                          </div>
                        )}
                        {ad.location && (
                          <div className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-0.5">
                            <MapPin size={10} /> {ad.location.split(',').pop()?.trim()}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
