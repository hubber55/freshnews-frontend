import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FreshNews.top',
  description: 'Latest Malayalam news updates',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}