import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { ListingActions } from './ListingActions';
import { RequestList } from './RequestList';
import type { Item, BorrowRequest, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MyListingDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: item } = await supabase.from('items').select('*').eq('id', params.id).single();
  if (!item) notFound();
  if ((item as Item).owner_id !== user.id) redirect(`/items/${params.id}`);

  const { data: requests } = await supabase
    .from('borrow_requests')
    .select('*')
    .eq('item_id', params.id)
    .order('created_at', { ascending: false });

  let borrowers: Profile[] = [];
  const reqList = (requests || []) as BorrowRequest[];
  if (reqList.length > 0) {
    const ids = Array.from(new Set(reqList.map(r => r.borrower_id)));
    const { data: profs } = await supabase.from('profiles').select('*').in('id', ids);
    borrowers = (profs || []) as Profile[];
  }

  return (
    <main>
      <PageHeader title="Listing" back="/listings" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        {item.photos[0] && (
          <div className="card overflow-hidden mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.photos[0]} alt="" className="w-full aspect-[4/3] object-cover" />
          </div>
        )}
        <h2 className="text-xl font-semibold">{item.title}</h2>
        <p className="text-gray-600 mt-1 whitespace-pre-wrap">{item.description}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="pill-muted">{item.category}</span>
          <span className="pill-muted">Up to {item.max_loan_days}d</span>
          {item.extensions_allowed && <span className="pill-accent">Extensions OK</span>}
          {item.is_available ? <span className="pill-accent">Available</span> : <span className="pill-rose">On loan</span>}
        </div>

        <div className="mt-6">
          <ListingActions item={item as Item} />
        </div>

        <h3 className="font-semibold mt-8 mb-3">Borrow requests</h3>
        <RequestList requests={reqList} borrowers={borrowers} />
      </div>
    </main>
  );
}
