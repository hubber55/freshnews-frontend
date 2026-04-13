import Link from 'next/link';
import { Home, Search } from 'lucide-react';
import Header from './components/header';
import Footer from './components/footer';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)]">
      <Header />
      
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-[#1a1a1a] p-6 text-[#ffd42a]">
              <Search size={64} strokeWidth={1.5} />
            </div>
          </div>
          
          <h1 className="mb-2 text-6xl font-black text-white" style={{ fontFamily: 'var(--font-en)' }}>
            404
          </h1>
          
          <h2 className="mb-4 text-2xl font-bold text-white">
            Page Not Found / പേജ് ലഭ്യമല്ല
          </h2>
          
          <p className="mx-auto mb-10 max-w-md text-[var(--text-muted)]">
            We couldn't find the page you're looking for. It might have been moved, deleted, or never existed.
          </p>
          
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg bg-[#ffd42a] px-8 py-3.5 text-[16px] font-bold text-black transition-all hover:bg-[#e6be21] hover:scale-[1.02] active:scale-95 shadow-lg"
            >
              <Home size={20} />
              Return Home / തിരികെ പോകാം
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
