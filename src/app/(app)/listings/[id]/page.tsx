import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ItemAd } from '@/components/ItemAd';
import { Mono, Italic } from '@/components/typography';
import { ListingActions } from './ListingActions';
import { RequestList } from './RequestList';
import type { Item, BorrowRequest, Profile, Loan } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MyListingDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: item } = await supabase.from('items').select('*').eq('id', params.id).single();
  if (!item) notFound();
  if ((item as Item).owner_id !== user.id) redirect(`/items/${params.id}`);

  const [{ data: requests }, { data: activeLoanRaw }] = await Promise.all([
    supabase
      .from('borrow_requests')
      .select('*')
      .eq('item_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('loans')
      .select('*')
      .eq('item_id', params.id)
      .in('status', ['pending_handover', 'active', 'pending_return'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const activeLoan = (activeLoanRaw || null) as Loan | null;

  const reqList = (requests || []) as BorrowRequest[];
  const profileIds = new Set<string>(reqList.map(r => r.borrower_id));
  if (activeLoan) profileIds.add(activeLoan.borrower_id);

  let borrowers: Profile[] = [];
  if (profileIds.size > 0) {
    const { data: profs } = await supabase.from('profiles').select('*').in('id', Array.from(profileIds));
    borrowers = (profs || []) as Profile[];
  }

  const activeBorrower = activeLoan ? borrowers.find(b => b.id === activeLoan.borrower_id) || null : null;

  const statusLabel: Record<string, string> = {
    pending_handover: 'Awaiting handover',
    active: 'On loan',
    pending_return: 'Return in progress'
  };

  return (
    <main className="max-w-2xl mx-auto pb-8">
      <ItemAd item={item as Item} owner={null} ownerView back="/listings" />

      {activeLoan && (
        <section className="px-5 mt-7">
          <Mono className="text-ink-soft block">§ 04 — Currently with</Mono>
          <Link
            href={`/loans/${activeLoan.id}`}
            className="mt-3 grid grid-cols-[1fr_auto] gap-3 items-center border-t-[1.5px] border-b-[1.5px] border-ink py-4 hover:bg-paper-soft transition"
          >
            <div className="min-w-0">
              <Mono className="text-ink-soft block">
                {statusLabel[activeLoan.status] || activeLoan.status}
              </Mono>
              <div className="font-display font-bold text-[22px] leading-none tracking-[-0.01em] text-ink mt-1.5">
                With {activeBorrower?.first_name || 'borrower'}
              </div>
              <div className="text-sm text-ink-soft mt-1.5">
                {activeLoan.due_at
                  ? <>Due back <span className="font-bold text-ink">{new Date(activeLoan.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></>
                  : <><Italic>Open-ended</Italic> loan</>}
                {' · Tap to manage or recall'}
              </div>
            </div>
            <span aria-hidden className="font-display font-bold text-2xl text-ink-soft">↗</span>
          </Link>
        </section>
      )}

      {(item as Item).is_available && (
        <section className="px-5 mt-6">
          <Link href={`/lend?item=${(item as Item).id}`} className="btn-primary w-full block text-center">
            Lend this in person now →
          </Link>
        </section>
      )}

      <section className="px-5 mt-4">
        <ListingActions item={item as Item} />
      </section>

      <section className="px-5 mt-9">
        <Mono className="text-ink-soft block">§ 05 — Borrow requests</Mono>
        <div className="mt-3">
          <RequestList requests={reqList} borrowers={borrowers} />
        </div>
      </section>
    </main>
  );
}
