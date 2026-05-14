'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs: { href: string; label: string }[] = [
  { href: '/home',     label: 'Feed' },
  { href: '/listings', label: 'Mine' },
  { href: '/loans',    label: 'Loans' },
  { href: '/messages', label: 'Inbox' },
  { href: '/profile',  label: 'Profile' }
];

// Editorial slab: ink background, paper text, italic Instrument Serif on the
// active tab. No icons — typography carries the difference.
export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 bg-ink text-paper pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="max-w-2xl mx-auto grid grid-cols-5">
        {tabs.map(t => {
          const active = path === t.href || path.startsWith(t.href + '/');
          return (
            <li key={t.href} className="flex">
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex-1 flex items-baseline justify-center py-4 transition',
                  active
                    ? 'font-italic italic text-[20px] text-paper'
                    : 'font-display font-semibold text-[14px] text-paper/55 hover:text-paper/80'
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
