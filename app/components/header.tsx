'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Search } from 'lucide-react';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/tos', label: 'Terms of Service' },
  { href: '/contact', label: 'Contact Us' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="mx-auto flex h-14 w-full max-w-[800px] items-center justify-between px-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <Menu size={22} strokeWidth={2.5} />
          </button>
          <Link href="/" className="text-center">
            <span className="text-[20px] font-extrabold uppercase tracking-[0.1em] text-[#ffd42a]" style={{ fontFamily: 'var(--font-en)' }}>
              FRESHNEWS.TOP
            </span>
          </Link>
          <button
            type="button"
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <Search size={22} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* MOBILE MENU OVERLAY */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          {/* Drawer */}
          <nav className="relative z-10 w-[280px] h-full bg-[var(--bg-card)] border-r border-[var(--border)] shadow-2xl flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <span className="text-[18px] font-extrabold text-[#ffd42a] uppercase tracking-wider" style={{ fontFamily: 'var(--font-en)' }}>
                FRESHNEWS
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-6 py-3.5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--border)] hover:text-[#ffd42a] transition-colors border-b border-[var(--border)]/30"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
              © {new Date().getFullYear()} FreshNews.top
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
