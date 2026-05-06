import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { CalendarDays, Clock, MapPin, Megaphone, Phone, Banknote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import Header from '../../components/header';
import Footer from '../../components/footer';
import ImageGallery from '../../components/ImageGallery';
import { createAdminClient } from '@/lib/supabase-admin';

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

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />

      <main className="mx-auto w-full max-w-[800px] px-5 py-6 sm:px-6">
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
                  {item.content}
                </p>
              ) : null}

              {/* TAGS */}
              {item.tags && item.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 pt-6 border-t border-white/5">
                  {item.tags.map((tag, idx) => (
                    <span key={idx} className="text-[11px] font-bold text-[#00ffff] bg-[#00ffff]/5 px-3 py-1 rounded-full border border-[#00ffff]/10 uppercase tracking-wide">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>

        <div className="mt-5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Megaphone size={14} className="text-[#00cfff]" />
          Clicking a classifieds card now opens this detail view for every item.
        </div>
      </main>

      <Footer />
    </div>
  );
}
