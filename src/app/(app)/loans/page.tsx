import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { dateLabel } from '@/lib/utils';
import { paletteForCategory } from '@/lib/categoryStyle';
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
                <h2 className="font-mono text-[10px] font-semibold text-gray-700 mb-3 uppercase tracking-wider">Active</h2>
                <ul className="space-y-3">
                  {active.map(l => <LoanRow key={l.id} loan={l} item={items.find(i => i.id === l.item_id)} userId={user.id} />)}
                </ul>
              </section>
            )}
            {past.length > 0 && (
              <section className="mt-7">
                <h2 className="font-mono text-[10px] font-semibold text-gray-700 mb-3 uppercase tracking-wider">Past</h2>
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
  const palette = paletteForCategory(item?.category);
  return (
    <li>
      <Link
        href={`/loans/${loan.id}`}
        className="rounded-3xl p-3 flex items-center gap-3 border-2 shadow-soft hover:-translate-y-0.5 transition block"
        style={{ background: palette.bg, borderColor: palette.accent, color: palette.ink }}
      >
        <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border" style={{ borderColor: palette.accent }}>
          {item?.photos?.[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg leading-tight line-clamp-1">{item?.title || 'Item'}</div>
          <div className="font-mono text-[10px] uppercase tracking-wider mt-0.5 opacity-70">
            {isLender ? 'Lending' : 'Borrowing'}
            {loan.due_at && loan.status !== 'completed' && <> · Due {dateLabel(loan.due_at)}</>}
            {loan.completed_at && <> · Completed {dateLabel(loan.completed_at)}</>}
          </div>
        </div>
        <StatusPill status={loan.status} palette={palette} />
      </Link>
    </li>
  );
}

function StatusPill({ status, palette }: { status: string; palette: { accent: string; pill: string; ink: string } }) {
  let bg = palette.pill;
  let fg = palette.ink;
  let text = status.replace('_', ' ');
  if (status === 'active') { bg = palette.accent; fg = '#fff'; }
  if (status === 'pending_handover' || status === 'pending_return') { bg = '#F6D77A'; fg = '#1F2A21'; }
  if (status === 'completed') { bg = '#E5E1D6'; fg = '#5F4E33'; }
  if (status === 'disputed') { bg = '#F8B4C8'; fg = '#1F2A21'; }
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full shrink-0"
      style={{ background: bg, color: fg }}
    >
      {text}
    </span>
  );
}
