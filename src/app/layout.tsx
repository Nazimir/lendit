import type { Metadata, Viewport } from 'next';
import { Fraunces, Caveat, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['SOFT', 'WONK']
});
const caveat = Caveat({ subsets: ['latin'], variable: '--font-script', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'LendIt',
  description: 'Borrow stuff from your neighbours, free.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'LendIt' }
};

export const viewport: Viewport = {
  themeColor: '#86A789',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${caveat.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-cream-100 text-accent-900">
        {children}
      </body>
    </html>
  );
}
