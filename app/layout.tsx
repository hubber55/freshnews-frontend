import type { Metadata } from 'next';
import './globals.css';
import AuthHashHandler from './components/AuthHashHandler';
import SlowNetworkBanner from './components/SlowNetworkBanner';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#ffd42a" />
        <meta name="monetag" content="efbbd56f8d306f8f6c34678415ffa024" />
        
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
            `,
          }}
        />
      </head>
      <body>
        <AuthHashHandler />
        <SlowNetworkBanner />
        {children}
      </body>
    </html>
  );
}
