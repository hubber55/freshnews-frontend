'use client';

import Link from 'next/link';
import Script from 'next/script';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const GUEST_FOOTER_LINKS = [
  { href: '/login', label: 'Login / Sign Up' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About Us' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/tos', label: 'Terms of Service' },
  { href: '/contact', label: 'Contact Us' },
];

const AUTHED_FOOTER_LINKS = [
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About Us' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/tos', label: 'Terms of Service' },
  { href: '/contact', label: 'Contact Us' },
];

import { useAuth } from './AuthProvider';

export default function Footer() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const footerLinks = isLoggedIn ? AUTHED_FOOTER_LINKS : GUEST_FOOTER_LINKS;

  return (
    <footer className="mt-10 border-t border-[var(--border)] bg-[var(--bg-card)]">
      <div className="mx-auto max-w-[800px] px-5 py-10">
        {/* Logo */}
        <div className="text-center mb-5">
          <Link href="/">
            <Image
              src="/logos/favicon_32.png"
              alt="FreshNews.top Favicon"
              width={32}
              height={32}
            />
          </Link>
          <p className="mt-2 text-[13px] text-[var(--text-muted)]">
            Your Trusted Malayalam News Source
          </p>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-[var(--text-secondary)] hover:text-[#ffd42a] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Divider */}
        <div className="border-t border-[var(--border)] pt-5 text-center">
          <p className="text-[12px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
            © {new Date().getFullYear()} FreshNews.top. All Rights Reserved.
          </p>
        </div>
      </div>

      {/* Statcounter code for fresh News */}
      <Script id="statcounter-config" strategy="afterInteractive">
        {`
          var sc_project=12790414; 
          var sc_invisible=1; 
          var sc_security="4b11f9fd"; 
        `}
      </Script>
      <Script
        src="https://www.statcounter.com/counter/counter.js"
        strategy="afterInteractive"
      />
      <noscript>
        <div className="statcounter">
          <a
            title="Web Analytics Made Easy - Statcounter"
            href="https://statcounter.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              className="statcounter"
              src="https://c.statcounter.com/12790414/0/4b11f9fd/1/"
              alt="Web Analytics Made Easy - Statcounter"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </a>
        </div>
      </noscript>
    </footer>
  );
}
