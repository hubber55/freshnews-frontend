import Header from './components/header';

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Top Progress Bar */}
      <div className="top-loading-bar" />

      <Header />

      <main className="pb-4">
        {/* Tag Scroller Skeleton */}
        <div className="mx-auto mt-3 w-full max-w-[1100px] px-5 sm:px-6">
          <div className="flex items-center gap-2 overflow-hidden py-2">
            <div className="h-8 w-20 shrink-0 rounded-full shimmer-box" />
            <div className="h-8 w-24 shrink-0 rounded-full shimmer-box" />
            <div className="h-8 w-16 shrink-0 rounded-full shimmer-box" />
            <div className="h-8 w-28 shrink-0 rounded-full shimmer-box" />
            <div className="h-8 w-20 shrink-0 rounded-full shimmer-box" />
            <div className="h-8 w-24 shrink-0 rounded-full shimmer-box" />
          </div>
        </div>

        {/* Section Header Skeleton ("Latest") */}
        <section className="mx-auto mt-5 w-full max-w-[1100px] px-5 sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3">
            <div>
              <div className="h-4 w-20 rounded shimmer-box" />
              <div className="mt-1.5 h-[3px] w-10 rounded-full shimmer-box" />
            </div>
          </div>

          {/* Hero Card Skeleton */}
          <article className="overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
            {/* 16:9 Image Placeholder */}
            <div className="relative w-full overflow-hidden shimmer-box" style={{ paddingTop: '56.25%' }}>
              <div className="absolute inset-0" />
            </div>
            {/* Title / Meta Area */}
            <div className="px-5 py-3 sm:py-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-16 rounded-full shimmer-box" />
                <div className="h-3 w-20 rounded-full shimmer-box" />
              </div>
              <div className="space-y-2">
                <div className="h-6 w-full rounded-lg shimmer-box" />
                <div className="h-6 w-3/5 rounded-lg shimmer-box" />
              </div>
            </div>
          </article>

          {/* Regular Card Skeletons */}
          <div className="mt-6 space-y-7">
            {[1, 2, 3, 4].map((i) => (
              <article
                key={i}
                className="overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]"
              >
                {/* 16:9 Image Placeholder */}
                <div className="relative w-full overflow-hidden shimmer-box" style={{ paddingTop: '56.25%' }}>
                  <div className="absolute inset-0" />
                </div>
                {/* Title / Meta Area */}
                <div className="px-5 py-3 sm:py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-3 w-14 rounded-full shimmer-box" />
                    <div className="h-3 w-16 rounded-full shimmer-box" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-5 w-full rounded-lg shimmer-box" />
                    <div className="h-5 w-2/3 rounded-lg shimmer-box" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
