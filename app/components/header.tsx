'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Menu, X, Search, LogOut, User, ChevronDown, Shield } from 'lucide-react';

const GUEST_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Login' },
  { href: '/signup', label: 'Sign Up' },
  { href: '/submit', label: 'Submit' },
  { href: '/classifieds', label: 'Classifieds' },
  { href: '/about', label: 'About Us' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/tos', label: 'Terms of Service' },
  { href: '/contact', label: 'Contact Us' },
];

const USER_MENU_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/tos', label: 'Terms of Service' },
  { href: '/contact', label: 'Contact Us' },
];

const ADMIN_MENU_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/categories', label: 'Subcategories' },
  { href: '/admin/posts', label: 'News Management' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/settings', label: 'Settings' },
];

type HeaderProps = {
  titleColorClass?: string;
};

export default function Header({ titleColorClass = 'text-[#ffd42a]' }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch user name and admin status
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUserName(data.name || null);
        setIsAdmin(data.isAdmin || false);
      })
      .catch(() => {
        setUserName(null);
        setIsAdmin(false);
      });
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setAdminMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLoggedIn = !!userName;
  const navLinks = isLoggedIn ? USER_MENU_ITEMS : GUEST_LINKS;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUserName(null);
    setIsAdmin(false);
    window.location.href = '/';
  };

  const handleAdminLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAdmin(false);
    window.location.href = '/';
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="mx-auto flex h-20 w-full max-w-[800px] items-center justify-between px-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="flex h-12 w-12 items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <Menu size={24} strokeWidth={2.5} />
          </button>
          <Link href="/" className="flex items-center justify-center h-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/banner.png"
              alt="FreshNews.top Logo"
              className="h-full w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-2">
            {/* User Menu Dropdown */}
            {isLoggedIn && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 h-10 px-3 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--border)] transition-colors"
                >
                  <User size={18} />
                  <span className="text-sm font-semibold">Welcome {userName}</span>
                  <ChevronDown size={16} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl py-2 z-50">
                    {USER_MENU_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--border)] hover:text-[#ffd42a] transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      onClick={() => {
                        handleLogout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--border)] hover:text-red-400 transition-colors flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Admin Menu Dropdown */}
            {isAdmin && (
              <div className="relative" ref={adminMenuRef}>
                <button
                  type="button"
                  onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                  className="flex items-center gap-2 h-10 px-3 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--border)] transition-colors"
                >
                  <Shield size={18} />
                  <span className="text-sm font-semibold">Admin Panel</span>
                  <ChevronDown size={16} className={`transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {adminMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl py-2 z-50">
                    {ADMIN_MENU_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setAdminMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--border)] hover:text-[#ffd42a] transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      onClick={() => {
                        handleAdminLogout();
                        setAdminMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--border)] hover:text-red-400 transition-colors flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <button
              type="button"
              aria-label="Search"
              className="flex h-12 w-12 items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              <Search size={24} strokeWidth={2.5} />
            </button>
          </div>
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
                  src="/logos/banner.png"
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
                <div className="px-6 py-3.5 text-[15px] font-bold text-[#ffd42a] border-b border-[var(--border)]/30">
                  Welcome {userName}
                </div>
              )}
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-6 py-3.5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--border)] hover:text-[#ffd42a] transition-colors border-b border-[var(--border)]/30"
                >
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <>
                  <div className="px-6 py-3.5 text-[15px] font-bold text-[#ffd42a] border-b border-[var(--border)]/30 flex items-center gap-2">
                    <Shield size={16} />
                    Admin Panel
                  </div>
                  {ADMIN_MENU_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="block px-6 py-3.5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--border)] hover:text-[#ffd42a] transition-colors border-b border-[var(--border)]/30 pl-10"
                    >
                      {item.label}
                    </Link>
                  ))}
                </>
              )}
              {isLoggedIn && (
                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-6 py-3.5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--border)] hover:text-red-400 transition-colors border-b border-[var(--border)]/30 flex items-center gap-2"
                >
                  <LogOut size={16} />
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
