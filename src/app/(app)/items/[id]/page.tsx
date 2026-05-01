import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { ItemAd } from '@/components/ItemAd';
import { RequestForm } from './RequestForm';
import type { Item, Profile, BorrowRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: item } = await supabase.from('items').select('*').eq('id', params.id).single();
  if (!item) notFound();

  if ((item as Item).owner_id === user.id) redirect(`/listings/${params.id}`);

  const { data: owner } = await supabase.from('profiles').select('*').eq('id', (item as Item).owner_id).single();

  const { data: mine } = await supabase
    .from('borrow_requests')
    .select('*')
    .eq('item_id', params.id).eq('borrower_id', user.id)
    .order('created_at', { ascending: false }).limit(1);

  const existing = (mine?.[0] || null) as BorrowRequest | null;

  return (
    <main>
      <PageHeader title="Listing" back="/home" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        <ItemAd item={item as Item} owner={(owner as Profile) || null} />

        <div className="mt-6">
          <RequestForm
            itemId={item.id}
            ownerId={(item as Item).owner_id}
            existing={existing}
            available={item.is_available}
          />
        </div>
      </div>
    </main>
  );
}
