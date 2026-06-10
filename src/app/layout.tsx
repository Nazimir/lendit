import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { RecoveryRedirector } from '@/components/RecoveryRedirector';
import { AuthErrorBanner } from '@/components/AuthErrorBanner';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800']
});
const italic = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-italic',
  display: 'swap',
  weight: '400',
  style: 'italic'
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500']
});

export const metadata: Metadata = {
  metadataBase: new URL('https://partaz.app'),
  title: 'Partaz',
  description: 'Borrow stuff from your neighbours, free.',
  openGraph: {
    title: 'Partaz',
    description: 'Borrow stuff from your neighbours, free.',
    url: 'https://partaz.app',
    siteName: 'Partaz',
    type: 'website',
    images: [{ url: '/og-card.png', width: 1200, height: 630, alt: 'Partaz' }]
  },
  twitter: {
    card: 'summary',
    title: 'Partaz',
    description: 'Borrow stuff from your neighbours, free.'
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Partaz' },
  icons: {
    // Standard favicon — proper small sizes so browser tabs render crisply
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    // iOS home-screen icon — REQUIRED for iOS to launch the PWA in standalone
    // mode rather than as a Safari bookmark
    apple: [{ url: '/apple-icon-180.png', sizes: '180x180' }]
  }
};

export const viewport: Viewport = {
  themeColor: '#F2ECE0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${italic.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-paper text-ink">
        <RecoveryRedirector />
        <AuthErrorBanner />
        {children}
      </body>
    </html>
  );
}
