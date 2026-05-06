import type { Metadata } from 'next';
import './globals.css';
import AuthHashHandler from './components/AuthHashHandler';
import SlowNetworkBanner from './components/SlowNetworkBanner';
import BottomNav from './components/BottomNav';
import { createAdminClient } from '@/lib/supabase-admin';
import Script from 'next/script';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://freshnews.top'),
  title: 'FreshNews.top',
  description: 'Latest News- Also Submit your News/ Classifieds for free',
  manifest: '/manifest.json',
  icons: {
    icon: '/logos/favicon_32.png?v=2',
    shortcut: '/logos/favicon_16.png?v=2',
    apple: '/logos/favicon_128.png?v=2',
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: '/logos/favicon_128.png?v=2',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        url: '/logos/favicon_16.png?v=2',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        url: '/logos/favicon_32.png?v=2',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '64x64',
        url: '/logos/favicon_64.png?v=2',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '128x128',
        url: '/logos/favicon_128.png?v=2',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '256x256',
        url: '/logos/favicon_256.png?v=2',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        url: '/logos/favicon_512.png?v=2',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '1024x1024',
        url: '/logos/favicon_1024.png?v=2',
      },
    ],
  },
};

type HeaderInsert = {
  id?: string;
  name?: string;
  enabled?: boolean;
  placement?: 'head' | 'body';
  scope?: 'all' | 'home';
  code?: string;
};

function safeParseHeaderInserts(value: unknown): HeaderInsert[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as HeaderInsert[]) : [];
  } catch {
    return [];
  }
}

function extractScripts(html: string) {
  const scripts: Array<{ attrs: Record<string, string>; inline: string }> = [];
  const remainderParts: string[] = [];

  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html)) !== null) {
    remainderParts.push(html.slice(lastIndex, match.index));
    lastIndex = re.lastIndex;

    const rawAttrs = match[1] ?? '';
    const inline = match[2] ?? '';
    const attrs: Record<string, string> = {};

    const attrRe = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRe.exec(rawAttrs)) !== null) {
      const name = attrMatch[1];
      const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
      attrs[name] = value;
    }

    scripts.push({ attrs, inline });
  }

  remainderParts.push(html.slice(lastIndex));
  return { scripts, remainder: remainderParts.join('').trim() };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);

  let settingsMap = new Map<string, string>();
  if (hasSupabaseEnv) {
    const adminSupabase = createAdminClient();
    const { data: settings } = await adminSupabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['header_inserts', 'bidvertiser_verification_code']);

    settingsMap = new Map((settings ?? []).map((s) => [s.key, s.value]));
  }

  const headerInserts = safeParseHeaderInserts(settingsMap.get('header_inserts'));

  // Backward compatibility: if a single legacy BidVertiser value exists, include it as an "all pages" head insert.
  const legacyBidVertiser = typeof settingsMap.get('bidvertiser_verification_code') === 'string'
    ? settingsMap.get('bidvertiser_verification_code')!.trim()
    : '';

  const normalizedInserts: HeaderInsert[] = [
    ...(legacyBidVertiser ? [{
      id: 'legacy-bidvertiser',
      name: 'BidVertiser Verification (Legacy)',
      enabled: true,
      placement: 'head',
      scope: 'all',
      code: legacyBidVertiser,
    } satisfies HeaderInsert] : []),
    ...headerInserts,
  ]
    .filter((ins) => (ins?.enabled ?? true) && (ins?.scope ?? 'all') === 'all' && typeof ins?.code === 'string' && ins.code.trim())
    .map((ins) => ({
      ...ins,
      placement: ins.placement ?? 'head',
      scope: ins.scope ?? 'all',
      code: ins.code!.trim(),
    }));

  const headHtml = normalizedInserts.filter((i) => i.placement === 'head').map((i) => i.code!).join('\n');
  const bodyHtml = normalizedInserts.filter((i) => i.placement === 'body').map((i) => i.code!).join('\n');

  const { scripts: headScripts, remainder: headRemainder } = extractScripts(headHtml);

  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#ffd42a" />
        <meta name="monetag" content="efbbd56f8d306f8f6c34678415ffa024" />

        {/* Managed header inserts (Admin Settings) */}
        {headScripts.map((script, index) => {
          const { src, ...rest } = script.attrs;
          const key = `hdr-script-${index}-${src ?? 'inline'}`;
          return (
            <Script
              key={key}
              src={src || undefined}
              {...rest}
              strategy="beforeInteractive"
              dangerouslySetInnerHTML={src ? undefined : { __html: script.inline }}
            />
          );
        })}
        {headRemainder ? (
          // For non-script verification snippets (e.g. HTML comments), keep them in head via noscript.
          <noscript dangerouslySetInnerHTML={{ __html: headRemainder }} />
        ) : null}
        
        {/* Preload critical resources */}
        <link rel="preload" href="/logos/freshnews_header.png" as="image" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://luvdgrpykesexfuqgvvt.supabase.co" />
        
        {/* Preconnect to common external image domains for faster loading */}
        <link rel="preconnect" href="https://news.google.com" />
        <link rel="preconnect" href="https://img.dtnext.in" />
        <link rel="preconnect" href="https://images.malayalam.news" />
        <link rel="preconnect" href="https://img.onmanorama.com" />
        <link rel="preconnect" href="https://img.mathrubhumi.com" />
        <link rel="dns-prefetch" href="https://akm-img-a-in.tosshub.com" />
        <link rel="dns-prefetch" href="https://static.asianetnews.com" />
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Capture PWA install prompt immediately on page load
              window.deferredInstallPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.deferredInstallPrompt = e;
                console.log('[PWA] Install prompt captured');
              });

              // Register Service Worker
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('[PWA] ServiceWorker registered');
                  }).catch(function(err) {
                    console.log('[PWA] ServiceWorker registration failed: ', err);
                  });
                });
              }
            `
          }}
        />
      </head>
      <body className="pb-14">
        {bodyHtml ? (
          <div aria-hidden="true" className="hidden" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        ) : null}
        <AuthHashHandler />
        <SlowNetworkBanner />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
