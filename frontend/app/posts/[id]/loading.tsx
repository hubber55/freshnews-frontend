import Header from '../../components/header';

export default function PostLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Top Progress Bar for immediate visual feedback */}
      <div className="top-loading-bar" />
      
      <Header />
      
      <main className="pb-8">
        <article className="mx-auto mt-6 w-full max-w-[850px] px-3 sm:px-4">
          <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] px-2.5 py-6 sm:px-5 sm:py-8 overflow-hidden">
            
            {/* Breadcrumb skeleton */}
            <div className="mb-5 flex items-center gap-2">
              <div className="h-3 w-12 rounded-full shimmer-box" />
              <div className="h-3 w-2 rounded-full shimmer-box" />
              <div className="h-3 w-24 rounded-full shimmer-box" />
            </div>

            {/* Title skeleton */}
            <div className="mb-6 space-y-3">
              <div className="h-8 w-full rounded-lg shimmer-box" />
              <div className="h-8 w-4/5 rounded-lg shimmer-box" />
            </div>

            {/* Meta info skeleton */}
            <div className="mb-8 flex flex-wrap items-center gap-4 border-t border-b border-[var(--border)] py-4">
              <div className="h-4 w-32 rounded shimmer-box" />
              <div className="h-4 w-24 rounded shimmer-box" />
              <div className="h-4 w-20 rounded shimmer-box" />
            </div>

            {/* Featured Image skeleton - Dailyhunt style aspect ratio */}
            <div className="mb-8 aspect-video w-full overflow-hidden rounded-2xl shimmer-box">
              <div className="h-full w-full" />
            </div>

            {/* Article content skeleton - varied line lengths for natural look */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="h-4 w-full rounded shimmer-box" />
                <div className="h-4 w-full rounded shimmer-box" />
                <div className="h-4 w-full rounded shimmer-box" />
                <div className="h-4 w-3/4 rounded shimmer-box" />
              </div>
              
              <div className="space-y-3">
                <div className="h-4 w-full rounded shimmer-box" />
                <div className="h-4 w-full rounded shimmer-box" />
                <div className="h-4 w-2/3 rounded shimmer-box" />
              </div>

              <div className="space-y-3">
                <div className="h-4 w-full rounded shimmer-box" />
                <div className="h-4 w-11/12 rounded shimmer-box" />
                <div className="h-4 w-4/5 rounded shimmer-box" />
              </div>
            </div>

            {/* Tag section skeleton */}
            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-8">
              <div className="h-6 w-12 rounded-md shimmer-box" />
              <div className="h-6 w-20 rounded-full shimmer-box" />
              <div className="h-6 w-24 rounded-full shimmer-box" />
              <div className="h-6 w-16 rounded-full shimmer-box" />
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
