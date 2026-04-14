import type { Metadata } from 'next';
import './globals.css';
import AuthHashHandler from './components/AuthHashHandler';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://freshnews.top'),
  title: 'FreshNews.top',
  description: 'Latest News- Also Submit your News/ Classifieds for free',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}
