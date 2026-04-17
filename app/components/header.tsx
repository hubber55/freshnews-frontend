'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Search, LogOut, User } from 'lucide-react';

const GUEST_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Login' },
  { href: '/signup', label: 'Sign Up' },
  { href: '/classifieds', label: 'Classifieds' },
  { href: '/about', label: 'About Us' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/tos', label: 'Terms of Service' },
  { href: '/contact', label: 'Contact Us' },
];

const USER_MENU_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/submit?type=ad', label: 'Submit Ads', color: '#00cfff' },      // Cyan Blue
  { href: '/submit?type=news', label: 'Submit News', color: '#ffd42a' },    // Yellow
  { href: '/submit?type=event', label: 'Submit Events', color: '#90ee90' },   // Light Green
  { href: '/submit?type=classified', label: 'Submit Classifieds', color: '#ff69b4' }, // Pink
  { href: '/classifieds', label: 'View Classifieds' }, // White (default)
  { href: '/about', label: 'About Us' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/tos', label: 'Terms of Service' },
  { href: '/contact', label: 'Contact Us' },
];

// Type for menu items with optional color
type MenuItem = {
  href: string;
  label: string;
  color?: string;
};

type HeaderProps = {
  titleColorClass?: string;
};

export default function Header({ titleColorClass = 'text-[#ffd42a]' }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const isLoggedIn = !!userName;
  const navLinks = isLoggedIn ? USER_MENU_ITEMS : GUEST_LINKS;

  useEffect(() => {
    // Fetch user name
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUserName(data.name || null);
      })
      .catch(() => {
        setUserName(null);
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUserName(null);
    window.location.href = '/';
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="mx-auto flex h-28 w-full max-w-[800px] items-center justify-between px-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="flex h-14 w-14 items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <Menu size={28} strokeWidth={2.5} />
          </button>
          <Link href="/" className="flex-1 flex items-center justify-center h-full mx-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/freshnews_header.png"
              alt="FreshNews.top Logo"
              className="h-full w-full object-cover"
            />
          </Link>
          <button
            type="button"
            aria-label="Search"
            className="flex h-14 w-14 items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <Search size={28} strokeWidth={2.5} />
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
              <div className="h-8 flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/freshnews_header.png"
                  alt="FreshNews.top Logo"
                  className="h-full w-auto object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {isLoggedIn && (
                <div className="px-6 py-4 text-[17px] font-bold text-[#ffd42a] border-b border-[var(--border)]/30">
                  Welcome {userName}
                </div>
              )}
              {navLinks.map((link: MenuItem) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-6 py-4 text-[17px] font-semibold transition-colors border-b border-[var(--border)]/30"
                  style={{ 
                    color: link.color || 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--border)';
                    e.currentTarget.style.color = link.color ? '#ffffff' : '#ffd42a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = link.color || 'var(--text-primary)';
                  }}
                >
                  {link.label}
                </Link>
              ))}
              {isLoggedIn && (
                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-6 py-4 text-[17px] font-semibold text-[var(--text-primary)] hover:bg-[var(--border)] hover:text-red-400 transition-colors border-b border-[var(--border)]/30 flex items-center gap-2"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              )}
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
