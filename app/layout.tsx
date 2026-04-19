import type { Metadata } from 'next';
import './globals.css';
import AuthHashHandler from './components/AuthHashHandler';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://freshnews.top'),
  title: 'FreshNews.top',
  description: 'Latest News- Also Submit your News/ Classifieds for free',
  manifest: '/manifest.json',
  icons: {
    icon: '/logos/favicon_32.png',
    shortcut: '/logos/favicon_16.png',
    apple: '/logos/favicon_128.png',
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: '/logos/favicon_128.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        url: '/logos/favicon_16.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        url: '/logos/favicon_32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '64x64',
        url: '/logos/favicon_64.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '128x128',
        url: '/logos/favicon_128.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '256x256',
        url: '/logos/favicon_256.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        url: '/logos/favicon_512.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '1024x1024',
        url: '/logos/favicon_1024.png',
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
        {children}
      </body>
    </html>
  );
}
