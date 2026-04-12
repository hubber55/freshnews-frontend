import Link from 'next/link';

const FOOTER_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/tos', label: 'Terms of Service' },
  { href: '/contact', label: 'Contact Us' },
];

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-[var(--border)] bg-[var(--bg-card)]">
      <div className="mx-auto max-w-[800px] px-5 py-10">
        {/* Logo */}
        <div className="text-center mb-5">
          <Link href="/">
            <span className="text-[22px] font-extrabold text-[#ffd42a] uppercase tracking-wider" style={{ fontFamily: 'var(--font-en)' }}>
              FRESHNEWS.TOP
            </span>
          </Link>
          <p className="mt-2 text-[13px] text-[var(--text-muted)]">
            Your Trusted Malayalam News Source
          </p>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6">
          {FOOTER_LINKS.map((link) => (
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
    </footer>
  );
}
