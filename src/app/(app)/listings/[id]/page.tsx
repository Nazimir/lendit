import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { ItemAd } from '@/components/ItemAd';
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

  // Profiles for borrow requests AND for the current borrower (if any)
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
    <main>
      <PageHeader title="Your listing" back="/listings" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        {(item as Item).visibility === 'private' && (
          <div className="card p-3 mb-3 flex items-center gap-2 border-2 border-cream-200 bg-cream-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5F4E33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <div className="text-xs text-gray-700">
              <strong className="font-medium">Private listing.</strong>{' '}
              Only you (and the current borrower, if any) can see this. It won&apos;t appear in search or on your public profile.
            </div>
          </div>
        )}
        <ItemAd item={item as Item} owner={null} ownerView />

        {activeLoan && (
          <Link
            href={`/loans/${activeLoan.id}`}
            className="card p-4 mt-5 flex items-center gap-3 hover:-translate-y-0.5 transition block border-2 border-butter-soft"
          >
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-wider text-accent-700">
                {statusLabel[activeLoan.status] || activeLoan.status}
              </div>
              <div className="font-display text-lg leading-tight mt-0.5">
                {activeBorrower ? `With ${activeBorrower.first_name}` : 'On loan'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {activeLoan.due_at
                  ? `Due back ${new Date(activeLoan.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                  : 'Open-ended loan'}
                {' · '}
                Tap to manage or recall
              </div>
            </div>
            <span aria-hidden className="text-accent-700">→</span>
          </Link>
        )}

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
