import Link from 'next/link';
import { connection } from 'next/server';
import { formatDistanceToNow } from 'date-fns';
import { CalendarDays, Clock, MapPin, Megaphone } from 'lucide-react';

import Header from '../components/header';
import Footer from '../components/footer';
import LazyImage from '../components/LazyImage';
import { createAdminClient } from '@/lib/supabase-admin';
import ImageGallery from '../components/ImageGallery';

export const revalidate = 120;

type ClassifiedSubmission = {
  id: number;
  title: string;
  content: string | null;
  image_url: string | null;
  location: string | null;
  post_id: number | null;
  status: string;
  created_at: string;
  expires_at: string | null;
  wa_users?: { name?: string | null } | null;
  ad_categories?: { name?: string | null } | null;
  ad_subcategories?: { name?: string | null } | null;
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
  await connection();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id,
      title,
      content,
      image_url,
      location,
      post_id,
      status,
      created_at,
      expires_at,
      wa_users (name),
      ad_categories (name),
      ad_subcategories (name)
    `)
    .eq('type', 'classified')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

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
          <Link href="/submit?type=classified" className="text-[13px] font-semibold text-[#ffd42a] hover:underline">
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
              className="mt-5 inline-flex rounded-full bg-[#ffd42a] px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-[#ffe36d]"
            >
              Submit Classifieds
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {classifieds.map((item) => {
              const publishedAt = item.created_at;
              const isLong = item.content && item.content.length > 200;

              const CardContent = (
                <div className="grid gap-0 md:grid-cols-[280px_1fr]">
                  <div className="relative bg-black/20 md:border-r border-[var(--border)] min-h-[240px]">
                    {item.image_url ? (
                      <ImageGallery
                        images={item.image_url.startsWith('[') ? JSON.parse(item.image_url) : [item.image_url]}
                        alt={item.title}
                      />
                    ) : (
                      <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-[var(--text-muted)]">
                        No Image Available
                      </div>
                    )}
                  </div>

                  <div className="p-5 sm:p-6 flex flex-col justify-between">
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                        <span className="rounded-full bg-[#00cfff]/10 px-2.5 py-1 text-[#00cfff]">
                          {item.ad_categories?.name || 'Classified'}
                        </span>
                        {item.ad_subcategories?.name ? (
                          <span className="rounded-full bg-white/5 px-2.5 py-1">{item.ad_subcategories.name}</span>
                        ) : null}
                      </div>

                      <h2 className="text-2xl font-extrabold leading-tight text-white mb-3">
                        {item.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--text-muted)] mb-4">
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
                          <span className="flex items-center gap-1 text-[#ffd42a]/80">
                            <CalendarDays size={13} />
                            Expires {formatDistanceToNow(new Date(item.expires_at), { addSuffix: true })}
                          </span>
                        ) : null}
                      </div>

                      {item.content ? (
                        <p className="whitespace-pre-line text-[14px] leading-6 text-[var(--text-secondary)] line-clamp-4">
                          {item.content}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[11px] font-bold text-[#ffd42a] hover:underline flex items-center gap-1 uppercase tracking-wider">
                        {item.post_id ? 'View Full Post →' : (isLong ? 'Read More →' : '')}
                      </span>
                    </div>
                  </div>
                </div>
              );

              return (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[#ffd42a]/30 transition-all duration-300 group">
                  {item.post_id ? (
                    <Link href={`/posts/${item.post_id}`}>
                      {CardContent}
                    </Link>
                  ) : CardContent}
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
