import Link from 'next/link';
import { connection } from 'next/server';
import { formatDistanceToNow } from 'date-fns';
import { CalendarDays, Clock, MapPin, Megaphone, Phone, Banknote } from 'lucide-react';

import Header from '../components/header';
import Footer from '../components/footer';
import LazyImage from '../components/LazyImage';
import { createAdminClient } from '@/lib/supabase-admin';

export const revalidate = 120;

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

export default async function ClassifiedsPage() {

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
      contact_phone
    `)
    .eq('type', 'classified')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50);

  const classifieds = ((error ? [] : data) ?? []) as ClassifiedSubmission[];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />

      <main className="mx-auto w-full max-w-[800px] px-5 py-6 sm:px-6">
        <section className="mb-5 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-3">
          <div>
            <div className="flex items-center gap-2 text-[15px] font-extrabold uppercase tracking-wide text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-en)' }}>
              <Megaphone size={18} className="text-[#ffd42a]" />
              Classifieds
            </div>
            <div className="mt-1.5 h-[3px] w-10 rounded-full bg-[var(--accent)]" />
          </div>
          <Link href="/submit?type=classified" className="text-[13px] font-semibold text-[#00cfff] hover:underline">
            Submit Classifieds
          </Link>
        </section>

        {classifieds.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
            <h1 className="text-2xl font-bold text-white">No classifieds yet</h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              Be the first to post a classified ad.
            </p>
            <Link
              href="/submit?type=classified"
              className="mt-5 inline-flex rounded-full border border-[#00cfff] bg-transparent px-5 py-3 text-sm font-bold text-[#00cfff] transition-colors hover:bg-[#00cfff]/10"
            >
              Submit Classifieds
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {classifieds.map((item) => {
              const image = getPrimaryImage(item.image_url);
              const publishedAt = item.created_at;

              return (
                <Link
                  key={item.id}
                  href={`/classifieds/${item.id}`}
                  className="block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#00cfff]/40"
                >
                  <div className="grid gap-0 md:grid-cols-[280px_1fr]">
                    <div className="relative min-h-[240px] bg-black/20">
                      {image ? (
                        <LazyImage
                          src={image}
                          alt={item.title}
                          eager={true}
                          className="h-full w-full object-cover"
                          imgStyle={{ aspectRatio: '4 / 3' }}
                        />
                      ) : (
                        <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-[var(--text-muted)]">
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

                      <h2 className="text-2xl font-extrabold leading-tight text-white">
                        {item.title}
                      </h2>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--text-muted)]">
                        {publishedAt ? (
                          <span className="flex items-center gap-1">
                            <Clock size={13} />
                            {formatDistanceToNow(new Date(publishedAt), { addSuffix: true })}
                          </span>
                        ) : null}
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
                            {item.price}
                          </span>
                        ) : null}
                        {item.contact_phone ? (
                          <span className="flex items-center gap-1 font-bold text-[#00cfff]">
                            <Phone size={13} />
                            {item.contact_phone}
                          </span>
                        ) : null}
                      </div>

                      {item.content ? (
                        <p className="mt-4 whitespace-pre-line text-[14px] leading-6 text-[var(--text-secondary)]">
                          {item.content}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
