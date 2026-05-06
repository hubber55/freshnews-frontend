'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { CalendarDays, Clock, MapPin, Megaphone, Home } from 'lucide-react';
import ImageGallery from '../components/ImageGallery';
import ClassifiedsFilter from './ClassifiedsFilter';

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
  tags?: string[] | null;
  wa_users?: { name?: string | null } | null;
  ad_categories?: { name?: string | null } | null;
  ad_subcategories?: { name?: string | null } | null;
};

export default function ClassifiedsClient({ 
  initialClassifieds,
  allTags 
}: { 
  initialClassifieds: ClassifiedSubmission[],
  allTags: string[]
}) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [activeTag, setActiveTag] = useState<string | null>(searchParams.get('tag'));

  const filteredClassifieds = useMemo(() => {
    return initialClassifieds.filter(item => {
      const matchesSearch = !search || 
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.content?.toLowerCase().includes(search.toLowerCase())) ||
        (item.location?.toLowerCase().includes(search.toLowerCase()));
      
      const matchesTag = !activeTag || 
        (item.tags?.some(t => t.toLowerCase() === activeTag.toLowerCase())) ||
        (item.location?.toLowerCase().includes(activeTag.toLowerCase()));

      return matchesSearch && matchesTag;
    });
  }, [initialClassifieds, search, activeTag]);

  return (
    <main className="mx-auto w-full max-w-[800px] px-5 py-6 sm:px-6">
      {/* BREADCRUMBS */}
      <div className="mb-6 flex items-center gap-2 text-[13px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
        <Link href="/" className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[#ffd42a]">
          <Home size={14} /> Home
        </Link>
        <span>-</span>
        <span className="text-[var(--text-primary)] font-bold">Classifieds</span>
        {activeTag && (
          <>
            <span>-</span>
            <span className="capitalize text-[var(--accent)] font-bold">{activeTag.replace(/-/g, ' ')}</span>
          </>
        )}
      </div>

      <section className="mb-5 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-3">
        <div>
          <div className="flex items-center gap-2 text-[15px] font-extrabold uppercase tracking-wide text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-en)' }}>
            <Megaphone size={18} className="text-[#ffd42a]" />
            Classifieds
          </div>
          <div className="mt-1.5 h-[3px] w-10 rounded-full bg-[var(--accent)]" />
        </div>
        <Link 
          href="/submit?type=classified" 
          className="inline-flex items-center rounded-lg bg-[#00ffff] px-4 py-2 text-[13px] font-black text-black hover:bg-[#00dada] transition-all shadow-lg active:scale-95"
        >
          Submit Classifieds
        </Link>
      </section>

      {/* STICKY FILTER BAR */}
      <div className="sticky top-0 z-50 bg-[var(--bg-primary)]/90 backdrop-blur-md -mx-5 px-5 sm:-mx-6 sm:px-6 py-4 border-b border-[var(--border)] group-focus-within:border-[#00ffff]/50 transition-all">
        <ClassifiedsFilter 
          allTags={allTags} 
          onFilterChange={(s, t) => {
            setSearch(s);
            setActiveTag(t);
          }} 
        />
      </div>

      {filteredClassifieds.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center mt-8">
          <h1 className="text-2xl font-bold text-white">No classifieds found</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            {search || activeTag ? 'Try adjusting your filters or search terms.' : 'Be the first to post a classified ad.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredClassifieds.map((item) => {
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
                      <span className="rounded-full bg-[#00fbff]/10 px-2.5 py-1 text-[#00fbff]">
                        {item.ad_categories?.name || 'Classified'}
                      </span>
                      {item.ad_subcategories?.name ? (
                        <span className="rounded-full bg-white/5 px-2.5 py-1">{item.ad_subcategories.name}</span>
                      ) : null}
                    </div>

                    <h2 className="text-xl font-extrabold leading-tight text-white mb-3">
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
                    <span className="text-[11px] font-bold text-[#00ffff] hover:underline flex items-center gap-1 uppercase tracking-wider">
                      {item.post_id ? 'View Full Post →' : (isLong ? 'Read More →' : '')}
                    </span>
                  </div>
                </div>
              </div>
            );

            return (
              <article 
                key={item.id} 
                className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[#00ffff]/50 transition-all duration-300 group shadow-lg ${item.post_id ? 'cursor-pointer' : ''}`}
              >
                {item.post_id ? (
                  <Link href={`/posts/${item.post_id}`} className="block h-full">
                    {CardContent}
                  </Link>
                ) : (
                  <div className="h-full">
                    {CardContent}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
