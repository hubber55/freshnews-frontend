'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Search, LogOut, User } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const GUEST_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Login / Sign Up' },
  { href: '/submit?type=news', label: 'Submit News', color: '#ffd42a', requiresAuth: true },
  { href: '/submit?type=event', label: 'Submit Events', color: '#90ee90', requiresAuth: true },
  { href: '/install-app', label: 'Install As App', color: '#00cfff', requiresAuth: false, isInstallLink: true },
  { href: '/contact', label: 'Contact Us' },
];

const USER_MENU_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/profile', label: 'Profile', color: '#ffd42a' },
  { href: '/submit?type=ad', label: 'Submit Ads', color: '#00cfff' },
  { href: '/submit?type=news', label: 'Submit News', color: '#ffd42a' },
  { href: '/submit?type=event', label: 'Submit Events', color: '#90ee90' },
  { href: '/install-app', label: 'Install As App', color: '#00cfff', isInstallLink: true },
  { href: '/contact', label: 'Contact Us' },
];

// Type for menu items with optional color
type MenuItem = {
  href: string;
  label: string;
  color?: string;
  requiresAuth?: boolean;
  isInstallLink?: boolean;
};

type HeaderProps = {
  titleColorClass?: string;
};

export default function Header({ titleColorClass = 'text-[#ffd42a]' }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [installNotice, setInstallNotice] = useState<string | null>(null);
  const isLoggedIn = !!userName;
  const { isInstallable, triggerInstall, isInstalled } = usePWAInstall();
  
  const allLinks = isLoggedIn ? USER_MENU_ITEMS : GUEST_LINKS;
  const navLinks = allLinks;

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

  // Menu button effects scheduler
  useEffect(() => {
    const btn = document.getElementById('menuBtn');
    const fx = document.getElementById('fx');
    if (!btn || !fx) return;

    // session gate (stop after click for entire session)
    const KEY = 'menuFxDisabled';
    if (sessionStorage.getItem(KEY) === '1') return;

    const GLOW_COLORS = [
      'fx-glow-gold',
      'fx-glow-white',
      'fx-glow-pink',
      'fx-glow-green',
      'fx-glow-cyan'
    ];

    let running = true;
    let cycleCount = 0;
    const MAX_CYCLES = 6;

    function clearFx() {
      if (fx) fx.className = '';
    }

    function runOnce() {
      if (!running || !fx) return;
      clearFx();
      
      // Random glow color each time
      const name = GLOW_COLORS[Math.floor(Math.random() * GLOW_COLORS.length)];
      
      fx.classList.add(name);
      setTimeout(clearFx, 8000); // 8 seconds duration
      cycleCount++;
    }

    function scheduleNext() {
      if (!running) return;
      const delay = 20000 + Math.random() * 25000; // 20–45s
      setTimeout(() => {
        if (!running) return;
        if (cycleCount >= MAX_CYCLES) return;
        runOnce();
        scheduleNext();
      }, delay);
    }

    // First run (on load) - always glow
    runOnce();
    scheduleNext();

    // Stop for entire session on click
    btn.addEventListener('click', () => {
      running = false;
      clearFx();
      sessionStorage.setItem(KEY, '1');
    }, { passive: true });

    return () => {
      running = false;
      clearFx();
    };
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
          {/* Animated Menu Button */}
          <div className="menu-wrapper">
            <button
              type="button"
              className="menu-btn"
              id="menuBtn"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div id="fx" aria-hidden="true"></div>
          </div>
          <Link href="/" className="flex-1 flex items-center justify-center h-full mx-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/freshnews_header.png"
              alt="FreshNews.top Logo"
              className="h-full w-full object-cover"
              loading="eager"
              decoding="sync"
              style={{ contentVisibility: 'auto' }}
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
              {installNotice && (
                <div className="mx-4 mb-2 rounded-lg border border-[#90ee90]/30 bg-[#90ee90]/10 px-4 py-2 text-sm font-semibold text-[#90ee90]">
                  {installNotice}
                </div>
              )}
              {navLinks.map((link: MenuItem) => {
                // For guest users, dim out items that require auth
                const isDimmed = !isLoggedIn && link.requiresAuth;
                const targetHref = isDimmed ? '/signup' : link.href;
                const isInstallLink = link.href === '/install-app';
                const isInstallDisabled = isInstallLink && isInstalled;
                
                // Use button for install link when prompt is available to prevent navigation
                if (isInstallLink && isInstallable && !isInstalled) {
                  return (
                    <button
                      key={link.href}
                      onClick={async () => {
                        const result = await triggerInstall();
                        if (result) {
                          setMenuOpen(false);
                        }
                      }}
                      className="w-full text-left block px-6 py-4 text-[17px] font-semibold transition-colors border-b border-[var(--border)]/30"
                      style={{ color: link.color || 'var(--text-primary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--border)';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = link.color || 'var(--text-primary)';
                      }}
                    >
                      {link.label}
                    </button>
                  );
                }

                if (isInstallDisabled) {
                  return (
                    <button
                      key={link.href}
                      type="button"
                      onClick={() => {
                        setInstallNotice('Already Installed');
                      }}
                      className="w-full text-left block px-6 py-4 text-[17px] font-semibold border-b border-[var(--border)]/30"
                      style={{
                        color: 'var(--text-muted)',
                        opacity: 0.6,
                        cursor: 'not-allowed',
                      }}
                    >
                      {link.label}
                    </button>
                  );
                }
                
                return (
                  <Link
                    key={link.href}
                    href={targetHref}
                    onClick={() => setMenuOpen(false)}
                    className="block px-6 py-4 text-[17px] font-semibold transition-colors border-b border-[var(--border)]/30"
                    style={{ 
                      color: isDimmed ? 'var(--text-muted)' : (link.color || 'var(--text-primary)'),
                      opacity: isDimmed ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (isDimmed) return;
                      e.currentTarget.style.backgroundColor = 'var(--border)';
                      e.currentTarget.style.color = link.color ? '#ffffff' : '#ffd42a';
                    }}
                    onMouseLeave={(e) => {
                      if (isDimmed) return;
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = link.color || 'var(--text-primary)';
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
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
