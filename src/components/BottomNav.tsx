'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs: { href: string; label: string; icon: (active: boolean) => JSX.Element }[] = [
  { href: '/home', label: 'Home', icon: a => Icon('home', a) },
  { href: '/listings', label: 'Listings', icon: a => Icon('listings', a) },
  { href: '/loans', label: 'Loans', icon: a => Icon('loans', a) },
  { href: '/messages', label: 'Messages', icon: a => Icon('messages', a) },
  { href: '/profile', label: 'Profile', icon: a => Icon('profile', a) }
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-cream-200 pb-[env(safe-area-inset-bottom)]">
      <ul className="max-w-2xl mx-auto grid grid-cols-5">
        {tabs.map(t => {
          const active = path === t.href || path.startsWith(t.href + '/');
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition',
                  active ? 'text-accent-600' : 'text-gray-500'
                )}
              >
                {t.icon(active)}
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Icon(name: string, active: boolean) {
  const stroke = active ? '#577559' : '#6B7280';
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>;
    case 'listings':
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 14h8" /></svg>;
    case 'loans':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'messages':
      return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>;
    case 'profile':
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
    default:
      return <svg {...common} />;
  }
}
