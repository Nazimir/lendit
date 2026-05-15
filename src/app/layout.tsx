import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { RecoveryRedirector } from '@/components/RecoveryRedirector';

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
  title: 'Partaz',
  description: 'Borrow stuff from your neighbours, free.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Partaz' },
  icons: {
    // Standard favicon
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    // iOS home-screen icon — REQUIRED for iOS to launch the PWA in standalone
    // mode rather than as a Safari bookmark
    apple: [
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' }
    ]
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
        {children}
      </body>
    </html>
  );
}
