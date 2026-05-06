import Header from '../components/header';
import Footer from '../components/footer';
import { Megaphone } from 'lucide-react';

export default function ClassifiedsLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />

      <main className="mx-auto w-full max-w-[800px] px-5 py-6 sm:px-6">
        <section className="mb-5 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-3">
          <div>
            <div className="flex items-center gap-2 text-[15px] font-extrabold uppercase tracking-wide text-[var(--text-primary)]">
              <Megaphone size={18} className="text-[#ffd42a]" />
              Classifieds
            </div>
            <div className="mt-1.5 h-[3px] w-10 rounded-full bg-[var(--accent)]" />
          </div>
        </section>

        <div className="space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
              <div className="grid gap-0 md:grid-cols-[280px_1fr]">
                <div className="min-h-[240px] bg-white/5" />
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="h-6 w-24 rounded bg-white/10" />
                  <div className="h-8 w-3/4 rounded bg-white/10" />
                  <div className="h-4 w-1/2 rounded bg-white/5" />
                  <div className="space-y-2">
                    <div className="h-4 w-full rounded bg-white/5" />
                    <div className="h-4 w-full rounded bg-white/5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
