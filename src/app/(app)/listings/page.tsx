import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { paletteForCategory } from '@/lib/categoryStyle';
import type { Item, BorrowRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MyListingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: items } = await supabase
    .from('items').select('*').eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  const itemList = (items || []) as Item[];

  // Pending request counts per item
  let pendingByItem: Record<string, number> = {};
  if (itemList.length > 0) {
    const ids = itemList.map(i => i.id);
    const { data: reqs } = await supabase
      .from('borrow_requests')
      .select('id,item_id,status')
      .in('item_id', ids).eq('status', 'pending');
    pendingByItem = (reqs as BorrowRequest[] || []).reduce((acc, r) => {
      acc[r.item_id] = (acc[r.item_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  return (
    <main>
      <PageHeader title="My listings" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        <div className="flex gap-2 mb-4">
          <Link href="/listings/new" className="btn-primary flex-1 text-center">+ New listing</Link>
          <Link href="/lend" className="btn-secondary flex-1 text-center">Lend in person</Link>
        </div>
        {itemList.length === 0 ? (
          <div className="card p-8 text-center mt-2">
            <p className="text-gray-600 mb-4">You haven&apos;t listed anything yet.</p>
            <Link href="/listings/new" className="btn-primary">List your first item</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {itemList.map(it => {
              const palette = paletteForCategory(it.category);
              return (
                <li key={it.id}>
                  <Link
                    href={`/listings/${it.id}`}
                    className="rounded-3xl p-3 flex gap-3 items-center border-2 shadow-soft hover:-translate-y-0.5 transition block"
                    style={{ background: palette.bg, borderColor: palette.accent, color: palette.ink }}
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border" style={{ borderColor: palette.accent }}>
                      {it.photos[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.photos[0]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-lg leading-tight line-clamp-1">{it.title}</div>
                      <div className="font-mono text-[10px] uppercase tracking-wider mt-0.5 opacity-70">
                        {it.category} · {it.max_loan_days ? `${it.max_loan_days}d max` : 'open-ended'}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {it.is_available
                          ? <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: palette.accent, color: '#fff' }}>Available</span>
                          : <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-soft text-accent-900">On loan</span>}
                        {pendingByItem[it.id] > 0 && (
                          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-butter-soft text-accent-900">
                            {pendingByItem[it.id]} pending
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
