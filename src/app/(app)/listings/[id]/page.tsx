import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { ItemAd } from '@/components/ItemAd';
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
      <PageHeader title="Your listing" back="/listings" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        <ItemAd item={item as Item} owner={null} ownerView />

        {(item as Item).is_available && (
          <Link
            href={`/lend?item=${(item as Item).id}`}
            className="btn-primary w-full mt-5 block text-center"
          >
            Lend this in person now
          </Link>
        )}

        <div className="mt-3">
          <ListingActions item={item as Item} />
        </div>

        <h3 className="font-display text-2xl mt-8 mb-3">Borrow requests</h3>
        <RequestList requests={reqList} borrowers={borrowers} />
      </div>
    </main>
  );
}
