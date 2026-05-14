'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import X from 'lucide-react/dist/esm/icons/x'
import Search from 'lucide-react/dist/esm/icons/search'
import LogOut from 'lucide-react/dist/esm/icons/log-out'
import { usePWAInstall } from '../hooks/usePWAInstall';

const GUEST_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Login / Sign Up' },
  { href: '/submit', label: 'Submit Ads/News/Events', color: '#ffd42a', requiresAuth: true },
  { href: '/submit?type=classified', label: 'Submit Classifieds', color: '#ff69b4', requiresAuth: true },
  { href: '/classifieds', label: 'View Classifieds', color: '#00cfff' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/install-app', label: 'Install As App', color: '#00cfff', requiresAuth: false, isInstallLink: true },
];

const USER_MENU_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/submit', label: 'Submit Ads/News/Events', color: '#ffd42a' },
  { href: '/submit?type=classified', label: 'Submit Classifieds', color: '#ff69b4' },
  { href: '/classifieds', label: 'View Classifieds', color: '#00cfff' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/profile', label: 'Profile', color: '#ffd42a' },
  { href: '/install-app', label: 'Install As App', color: '#00cfff', isInstallLink: true },
];

// Type for menu items with optional color
type MenuItem = {
  href: string;
  label: string;
  color?: string;
  requiresAuth?: boolean;
  isInstallLink?: boolean;
};

import { useAuth } from './AuthProvider';

export default function Header() {
  const { user, refresh } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [installNotice, setInstallNotice] = useState<string | null>(null);
  
  const userName = user?.username || user?.name || 'User';
  const isLoggedIn = !!user;
  const { isInstallable, triggerInstall, isInstalled } = usePWAInstall();
  
  const allLinks = isLoggedIn ? USER_MENU_ITEMS : GUEST_LINKS;
  const navLinks = allLinks;

  useEffect(() => {
    // Fetch tags for autocomplete - cached at browser level for 5 mins
    fetch('/api/news-tags')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAllTags(data);
      })
      .catch(() => {});
  }, []);

  const ghostText = searchQuery.length >= 2 ? (
    allTags.find(t => t.toLowerCase().startsWith(searchQuery.toLowerCase()))?.slice(searchQuery.length) || ''
  ) : '';

  const suggestions = searchQuery.length >= 2 && showSuggestions ? (
    allTags
      .filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const query = searchQuery.toLowerCase();
        const aLow = a.toLowerCase();
        const bLow = b.toLowerCase();
        
        // Exact match first
        if (aLow === query) return -1;
        if (bLow === query) return 1;
        
        // Starts with next
        const aStarts = aLow.startsWith(query);
        const bStarts = bLow.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;
        
        // Then alphabetical
        return aLow.localeCompare(bLow);
      })
      .slice(0, 5)
  ) : [];

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = (searchQuery + ghostText).trim();
    if (query) {
      window.location.href = `/?tag=${encodeURIComponent(query)}`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Tab' || e.key === 'Enter') && ghostText) {
      e.preventDefault();
      setSearchQuery(searchQuery + ghostText);
      setShowSuggestions(false);
    } else if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

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

    // First run (on load) - removed immediate glow
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
    await refresh();
    window.location.href = '/';
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="mx-auto relative flex h-20 sm:h-28 w-full max-w-[800px] items-center justify-between px-4">
          
          {/* SEARCH BAR OVERLAY (COMPACT SLIDING) */}
          <div 
            className={`absolute inset-0 z-40 bg-[var(--bg-card)] flex items-center justify-center px-4 transition-all duration-500 ease-in-out ${
              searchOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
            }`}
          >
            <div className="w-full max-w-[500px] flex items-center gap-2">
              <div className="flex-1 relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ffd42a]" />
                
                {/* Ghost Text Overlay */}
                <div className="absolute left-11 right-4 top-1/2 -translate-y-1/2 text-[14px] pointer-events-none whitespace-pre overflow-hidden">
                  <span className="text-transparent">{searchQuery}</span>
                  <span className="text-white/40">{ghostText}</span>
                </div>

                <input 
                  type="text" 
                  placeholder="തിരയുക (Search...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full bg-[#0d1117] border border-[#ffd42a]/30 rounded-full py-2.5 pl-11 pr-4 text-white text-[14px] focus:outline-none focus:border-[#ffd42a] focus:ring-1 focus:ring-[#ffd42a] transition-all shadow-lg"
                  autoFocus={searchOpen}
                />

                {/* Suggestions Dropdown */}
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl bg-[#161b22]/95 backdrop-blur-xl border border-[#ffd42a]/30 overflow-hidden shadow-2xl">
                    {suggestions.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          setSearchQuery(tag);
                          setShowSuggestions(false);
                          window.location.href = `/?tag=${encodeURIComponent(tag)}`;
                        }}
                        className="w-full text-left px-5 py-2.5 text-[13px] text-white/80 hover:bg-[#ffd42a]/10 hover:text-[#ffd42a] transition-colors border-b border-[var(--border)] last:border-0 flex items-center gap-3"
                      >
                        <Search size={12} className="opacity-50" />
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => setSearchOpen(false)}
                className="p-2 text-[var(--text-muted)] hover:text-white transition-transform active:scale-90"
              >
                <X size={20} />
              </button>
            </div>
          </div>

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
              className="max-h-[75%] w-auto max-w-full object-contain px-4"
              loading="eager"
              decoding="sync"
              style={{ contentVisibility: 'auto' }}
            />
          </Link>

          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
            className="flex h-14 w-14 items-center justify-center text-[var(--text-secondary)] hover:text-white transition-all active:scale-90"
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
                <div className="px-6 py-4 text-[17px] font-bold text-white border-b border-[var(--border)]/30">
                  Welcome <span className="text-[#00ffff]">{userName}</span>
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
