'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Megaphone, PlusCircle, User } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useAuth } from './AuthProvider';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  // Don't show bottom nav on admin pages or login/signup
  const hideOnPaths = ['/admin', '/login', '/signup'];
  if (hideOnPaths.some(p => pathname.startsWith(p))) {
    return null;
  }

  const navItems = [
    {
      label: 'Home',
      href: '/',
      icon: Home,
      active: pathname === '/'
    },
    {
      label: 'Classifieds',
      href: '/classifieds',
      icon: Megaphone,
      active: pathname.startsWith('/classifieds')
    },
    {
      label: 'Submit',
      href: '/submit?type=ad',
      icon: PlusCircle,
      active: pathname === '/submit',
      isCenter: true
    },
    {
      label: 'Profile',
      href: isLoggedIn ? '/profile' : '/login?redirect=/profile',
      icon: User,
      active: pathname === '/profile'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Background with 50% transparency and glassmorphism */}
      <div className="absolute inset-0 bg-[var(--bg-card)]/50 backdrop-blur-lg border-t border-[var(--border)] shadow-[0_-5px_15px_rgba(0,0,0,0.2)]" />
      
      <div className="relative flex items-center justify-around h-14 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-full transition-all active:scale-90 relative pt-1`}
            >
              <div className={`${item.active ? 'text-[#ffd42a]' : 'text-[#00ffff]'}`}>
                <Icon size={20} strokeWidth={item.active ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-bold mt-0.5 ${item.active ? 'text-[#ffd42a]' : 'text-[#00ffff]'}`}>
                {item.label}
              </span>
              {item.active && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[#ffd42a]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
