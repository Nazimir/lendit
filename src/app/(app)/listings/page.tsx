import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
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
      <PageHeader
        title="My listings"
        action={<Link href="/listings/new" className="btn-primary text-sm py-2 px-4">+ New</Link>}
      />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        {itemList.length === 0 ? (
          <div className="card p-8 text-center mt-8">
            <p className="text-gray-600 mb-4">You haven&apos;t listed anything yet.</p>
            <Link href="/listings/new" className="btn-primary">List your first item</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {itemList.map(it => (
              <li key={it.id}>
                <Link href={`/listings/${it.id}`} className="card p-3 flex gap-3 items-center hover:shadow-md transition">
                  <div className="w-16 h-16 rounded-2xl bg-cream-200 overflow-hidden shrink-0">
                    {it.photos[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.photos[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium line-clamp-1">{it.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {it.category} · {it.max_loan_days}d max
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {it.is_available
                        ? <span className="pill-accent">Available</span>
                        : <span className="pill-rose">On loan</span>}
                      {pendingByItem[it.id] > 0 && (
                        <span className="pill-butter">{pendingByItem[it.id]} pending request{pendingByItem[it.id] > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
