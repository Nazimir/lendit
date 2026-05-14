import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ItemAd } from '@/components/ItemAd';
import { VerifyGate } from '@/components/VerifyGate';
import { SafetyMenu } from '@/components/SafetyMenu';
import { REQUIRE_PHONE_VERIFICATION } from '@/lib/featureFlags';
import { RequestForm } from './RequestForm';
import type { Item, Profile, BorrowRequest, Loan } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: item } = await supabase.from('items').select('*').eq('id', params.id).single();
  if (!item) notFound();

  if ((item as Item).owner_id === user.id) redirect(`/listings/${params.id}`);

  const [{ data: owner }, { data: me }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', (item as Item).owner_id).single(),
    supabase.from('profiles').select('phone_verified').eq('id', user.id).single()
  ]);

  // My most recent request for this item, if any (regular or chain)
  const { data: mine } = await supabase
    .from('borrow_requests')
    .select('*')
    .eq('item_id', params.id).eq('borrower_id', user.id)
    .order('created_at', { ascending: false }).limit(1);
  const existing = (mine?.[0] || null) as BorrowRequest | null;

  // If item is unavailable, look up the active loan so we can offer a
  // chain handoff request when the lender allows it.
  let activeLoan: Loan | null = null;
  if (!item.is_available) {
    const { data: l } = await supabase
      .from('loans').select('*').eq('item_id', params.id)
      .in('status', ['active', 'pending_return']).order('created_at', { ascending: false }).limit(1).maybeSingle();
    activeLoan = (l as Loan) || null;
  }

  return (
    <main className="max-w-2xl mx-auto pb-8">
      <ItemAd
        item={item as Item}
        owner={(owner as Profile) || null}
        back="/home"
        actionSlot={<SafetyMenu targetKind="item" targetId={item.id} context="this listing" />}
      />

      <div className="px-5 mt-7">
        {REQUIRE_PHONE_VERIFICATION && !me?.phone_verified ? (
          <VerifyGate action="send a borrow request" next={`/items/${params.id}`} />
        ) : (
          <RequestForm
            itemId={item.id}
            ownerId={(item as Item).owner_id}
            existing={existing}
            available={item.is_available}
            chainHandoffsAllowed={(item as Item).chain_handoffs_allowed}
            activeLoanId={activeLoan?.id || null}
            activeBorrowerId={activeLoan?.borrower_id || null}
            currentUserId={user.id}
          />
        )}
      </div>
    </main>
  );
}
