import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { dateLabel } from '@/lib/utils';
import type { Loan, Item } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function LoansPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: loans } = await supabase
    .from('loans').select('*')
    .or(`borrower_id.eq.${user.id},lender_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  const list = (loans || []) as Loan[];
  const ids = Array.from(new Set(list.map(l => l.item_id)));
  let items: Item[] = [];
  if (ids.length > 0) {
    const { data: its } = await supabase.from('items').select('*').in('id', ids);
    items = (its || []) as Item[];
  }

  const active = list.filter(l => l.status !== 'completed');
  const past = list.filter(l => l.status === 'completed');

  return (
    <main>
      <PageHeader title="My loans" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        {active.length === 0 && past.length === 0 ? (
          <div className="card p-8 text-center mt-6">
            <p className="text-gray-600">No loans yet. Browse items on the home tab to borrow something.</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="mt-2">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Active</h2>
                <ul className="space-y-3">
                  {active.map(l => <LoanRow key={l.id} loan={l} item={items.find(i => i.id === l.item_id)} userId={user.id} />)}
                </ul>
              </section>
            )}
            {past.length > 0 && (
              <section className="mt-7">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Past</h2>
                <ul className="space-y-3">
                  {past.map(l => <LoanRow key={l.id} loan={l} item={items.find(i => i.id === l.item_id)} userId={user.id} />)}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function LoanRow({ loan, item, userId }: { loan: Loan; item: Item | undefined; userId: string }) {
  const isLender = loan.lender_id === userId;
  return (
    <li>
      <Link href={`/loans/${loan.id}`} className="card p-3 flex items-center gap-3 hover:shadow-md transition">
        <div className="w-14 h-14 rounded-2xl bg-cream-200 overflow-hidden shrink-0">
          {item?.photos?.[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium line-clamp-1">{item?.title || 'Item'}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {isLender ? 'Lending' : 'Borrowing'}
            {loan.due_at && loan.status !== 'completed' && <> · Due {dateLabel(loan.due_at)}</>}
            {loan.completed_at && <> · Completed {dateLabel(loan.completed_at)}</>}
          </div>
        </div>
        <span className={pillFor(loan.status)}>{loan.status.replace('_', ' ')}</span>
      </Link>
    </li>
  );
}

function pillFor(status: string) {
  if (status === 'active') return 'pill-accent';
  if (status === 'pending_handover' || status === 'pending_return') return 'pill-butter';
  if (status === 'completed') return 'pill-muted';
  if (status === 'disputed') return 'pill-rose';
  return 'pill-muted';
}
