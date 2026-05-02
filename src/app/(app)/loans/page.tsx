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

  const lendingActive = list.filter(l => l.lender_id === user.id && l.status !== 'completed');
  const borrowingActive = list.filter(l => l.borrower_id === user.id && l.status !== 'completed');
  const past = list.filter(l => l.status === 'completed');

  const empty = list.length === 0;

  return (
    <main>
      <PageHeader title="My loans" />
      <div className="px-4 max-w-2xl mx-auto pb-8 space-y-7">
        {empty ? (
          <div className="card p-8 text-center mt-6">
            <p className="text-gray-600">No loans yet. Browse items on the home tab to borrow something.</p>
          </div>
        ) : (
          <>
            <RoleSection
              title="Lending out"
              subtitle="Items of yours that are with someone else"
              accent="#577559"
              loans={lendingActive}
              items={items}
              role="lender"
              emptyMessage="Nothing of yours is on loan right now."
            />

            <RoleSection
              title="Borrowing"
              subtitle="Items you currently have or are about to receive"
              accent="#C7434B"
              loans={borrowingActive}
              items={items}
              role="borrower"
              emptyMessage="You're not borrowing anything at the moment."
            />

            {past.length > 0 && (
              <section>
                <SectionHeader title="Past loans" subtitle="Completed exchanges, both directions" accent="#857150" />
                <ul className="space-y-3 mt-3">
                  {past.map(l => (
                    <LoanRow
                      key={l.id}
                      loan={l}
                      item={items.find(i => i.id === l.item_id)}
                      userId={user.id}
                      showRoleBadge
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function RoleSection({
  title, subtitle, accent, loans, items, role, emptyMessage
}: {
  title: string;
  subtitle: string;
  accent: string;
  loans: Loan[];
  items: Item[];
  role: 'lender' | 'borrower';
  emptyMessage: string;
}) {
  return (
    <section>
      <SectionHeader title={title} subtitle={subtitle} accent={accent} />
      {loans.length === 0 ? (
        <p className="text-sm text-gray-500 mt-3">{emptyMessage}</p>
      ) : (
        <ul className="space-y-3 mt-3">
          {loans.map(l => (
            <LoanRow
              key={l.id}
              loan={l}
              item={items.find(i => i.id === l.item_id)}
              userId={role === 'lender' ? l.lender_id : l.borrower_id}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SectionHeader({ title, subtitle, accent }: { title: string; subtitle: string; accent: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b-2 pb-1.5" style={{ borderColor: accent }}>
      <h2 className="font-display text-2xl tracking-tight leading-none" style={{ color: accent }}>{title}</h2>
      <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">{subtitle}</span>
    </div>
  );
}

function LoanRow({
  loan, item, userId, showRoleBadge = false
}: {
  loan: Loan;
  item: Item | undefined;
  userId: string;
  showRoleBadge?: boolean;
}) {
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
            {loan.due_at && loan.status !== 'completed' && <>Due {dateLabel(loan.due_at)}</>}
            {loan.completed_at && <>Completed {dateLabel(loan.completed_at)}</>}
            {!loan.due_at && !loan.completed_at && <>{loan.loan_period_days}-day loan</>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {showRoleBadge && (
            <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/60">
              {isLender ? 'Lent' : 'Borrowed'}
            </span>
          )}
          <StatusPill status={loan.status} palette={palette} />
        </div>
      </Link>
    </li>
  );
}

function StatusPill({ status, palette }: { status: string; palette: { accent: string; pill: string; ink: string } }) {
  let bg = palette.pill;
  let fg = palette.ink;
  const text = status.replace('_', ' ');
  if (status === 'active') { bg = palette.accent; fg = '#fff'; }
  if (status === 'pending_handover' || status === 'pending_return') { bg = '#F6D77A'; fg = '#1F2A21'; }
  if (status === 'completed') { bg = '#E5E1D6'; fg = '#5F4E33'; }
  if (status === 'disputed') { bg = '#F8B4C8'; fg = '#1F2A21'; }
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full"
      style={{ background: bg, color: fg }}
    >
      {text}
    </span>
  );
}
