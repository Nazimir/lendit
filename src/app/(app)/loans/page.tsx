import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Mono, Italic } from '@/components/typography';
import { paletteForCategory } from '@/lib/categoryStyle';
import { territoryForUser } from '@/lib/personalTerritory';
import type { Loan, Item, Profile } from '@/lib/types';

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
  const itemIds = Array.from(new Set(list.map(l => l.item_id)));
  const counterpartyIds = Array.from(new Set(
    list.map(l => l.lender_id === user.id ? l.borrower_id : l.lender_id)
  ));

  const [{ data: itemsRaw }, { data: profilesRaw }] = await Promise.all([
    itemIds.length
      ? supabase.from('items').select('*').in('id', itemIds)
      : Promise.resolve({ data: [] }),
    counterpartyIds.length
      ? supabase.from('profiles').select('id,first_name').in('id', counterpartyIds)
      : Promise.resolve({ data: [] })
  ]);
  const items = (itemsRaw || []) as Item[];
  const profileById = new Map<string, Pick<Profile, 'id' | 'first_name'>>(
    ((profilesRaw || []) as Pick<Profile, 'id' | 'first_name'>[]).map(p => [p.id, p])
  );

  // Group loans: out = in-hand right now; coming = handover pending / chain
  // approved; past = ended (completed/cancelled/lost).
  const out     = list.filter(l => l.status === 'active' || l.status === 'pending_return');
  const coming  = list.filter(l => l.status === 'pending_handover');
  const disputed= list.filter(l => l.status === 'disputed');
  const past    = list.filter(l => ['completed', 'cancelled', 'lost'].includes(l.status));

  const lentTotal     = list.filter(l => l.lender_id === user.id && l.status === 'completed').length;
  const borrowedTotal = list.filter(l => l.borrower_id === user.id && l.status === 'completed').length;

  const isoWeek = isoWeekNumber(new Date());

  return (
    <main className="max-w-2xl mx-auto pb-8">
      <header className="px-5 pt-12 pb-5 bg-paper border-b-[1.5px] border-ink">
        <div className="flex justify-between items-center">
          <Mono className="text-ink-soft">The · Ledger</Mono>
          <Mono className="text-ink-soft">WK {isoWeek}</Mono>
        </div>
        <h1 className="mt-3 font-display font-extrabold text-[56px] leading-[0.85] tracking-[-0.045em] text-ink">
          In <Italic>circulation</Italic>.
        </h1>
        <p className="font-display font-medium text-[15px] leading-[1.35] text-ink-soft mt-2.5">
          What you have. What you owe. What came home <Italic>safely</Italic>.
        </p>
      </header>

      {list.length === 0 ? (
        <section className="px-5 py-12 text-center">
          <p className="font-italic italic text-[18px] text-ink-soft">
            No loans yet. Browse the feed to borrow something — or list yours so neighbours can ask.
          </p>
          <Link href="/home" className="btn-primary inline-flex mt-6">Open the feed</Link>
        </section>
      ) : (
        <>
          {disputed.length > 0 && (
            <LedgerGroup
              title="Disputed"
              subtitle="Frozen · admin reviewing"
              count={disputed.length}
              loans={disputed}
              items={items}
              userId={user.id}
              tone="alert"
              profileById={profileById}
            />
          )}
          {out.length > 0 && (
            <LedgerGroup
              title="Out"
              subtitle="In hand · keep them safe"
              count={out.length}
              loans={out}
              items={items}
              userId={user.id}
              profileById={profileById}
            />
          )}
          {coming.length > 0 && (
            <LedgerGroup
              title="Coming"
              subtitle="Awaiting handover"
              count={coming.length}
              loans={coming}
              items={items}
              userId={user.id}
              muted
              profileById={profileById}
            />
          )}
          {past.length > 0 && (
            <LedgerGroup
              title="Past"
              subtitle="Home safe"
              count={past.length}
              loans={past}
              items={items}
              userId={user.id}
              muted
              profileById={profileById}
            />
          )}
          <section className="px-5 pt-6 pb-2 mt-4 border-t border-ink/20">
            <div className="font-display font-bold text-[22px] leading-[0.95] tracking-[-0.02em] text-ink">
              +{lentTotal + borrowedTotal} <Italic>completed</Italic> loans.
            </div>
            <Mono className="text-ink-soft mt-2 block">
              · LENT {lentTotal}× · BORROWED {borrowedTotal}× ·
            </Mono>
          </section>
        </>
      )}
    </main>
  );
}

function LedgerGroup({
  title, subtitle, count, loans, items, userId, muted, tone, profileById
}: {
  title: string;
  subtitle: string;
  count: number;
  loans: Loan[];
  items: Item[];
  userId: string;
  muted?: boolean;
  tone?: 'alert';
  profileById: Map<string, Pick<Profile, 'id' | 'first_name'>>;
}) {
  return (
    <section className={'px-5 pt-6' + (muted ? ' opacity-80' : '')}>
      <div className="flex justify-between items-baseline pb-2 border-b-[1.5px] border-ink">
        <h2 className={'font-display font-extrabold text-[30px] tracking-[-0.03em] ' + (tone === 'alert' ? 'text-cat-tools' : 'text-ink')}>
          {title}<Italic>.</Italic>
        </h2>
        <Mono className="text-ink-soft">{count} · {subtitle.toUpperCase()}</Mono>
      </div>
      <ul className="flex flex-col">
        {loans.map(l => (
          <LedgerRow
            key={l.id}
            loan={l}
            item={items.find(i => i.id === l.item_id)}
            counterpartyName={profileById.get(l.lender_id === userId ? l.borrower_id : l.lender_id)?.first_name || 'someone'}
            userId={userId}
          />
        ))}
      </ul>
    </section>
  );
}

function LedgerRow({
  loan, item, userId, counterpartyName
}: {
  loan: Loan;
  item: Item | undefined;
  userId: string;
  counterpartyName: string;
}) {
  const isLender = loan.lender_id === userId;
  // Strip colour comes from the COUNTERPARTY'S personal territory, not from
  // the item's category. Two benefits:
  //   1. Consecutive items with the same category no longer look identical
  //      in the ledger — variety comes from the people, not the things.
  //   2. You start to recognise neighbours by colour over time.
  const counterpartyId = isLender ? loan.borrower_id : loan.lender_id;
  const stripPalette = paletteForCategory(territoryForUser(counterpartyId));
  const stateLabel = stateText(loan);
  const isOverdue = loan.due_at && loan.status === 'active' && new Date(loan.due_at).getTime() < Date.now();
  const isDisputed = loan.status === 'disputed';
  const shortNo = item ? numberFromId(item.id) : '—';

  return (
    <li>
      <Link
        href={`/loans/${loan.id}`}
        className="grid grid-cols-[14px_48px_1fr_auto] gap-3 items-center py-3.5 border-b border-dashed border-ink/30 hover:bg-paper-soft transition px-1 -mx-1"
      >
        <div className="w-3 h-12" style={{ background: stripPalette.bg }} aria-hidden />
        <div className="font-display font-extrabold text-[22px] leading-[0.85] tracking-[-0.04em] text-ink-soft">
          {shortNo}
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold text-[17px] leading-[1.1] tracking-[-0.02em] text-ink line-clamp-1">
            {item?.title || 'Item'}
          </div>
          <div className="mt-0.5 font-display font-medium text-[13px] text-ink-soft">
            {isLender ? <>To <strong className="font-bold text-ink">{counterpartyName}</strong></> : <>From <strong className="font-bold text-ink">{counterpartyName}</strong></>}
            {' · '}
            <span className={isOverdue || isDisputed ? 'text-cat-tools font-mono uppercase tracking-mono text-[10px]' : 'font-mono uppercase tracking-mono text-[10px] text-ink-soft'}>
              {stateLabel}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className={'font-italic italic text-[15px] leading-none ' + (isOverdue ? 'text-cat-tools' : 'text-ink')}>
            {dueText(loan)}
          </span>
        </div>
      </Link>
    </li>
  );
}

function stateText(loan: Loan): string {
  switch (loan.status) {
    case 'pending_handover': return 'AWAITING HANDOVER';
    case 'active':           return 'IN HAND';
    case 'pending_return':   return 'RETURN PENDING';
    case 'completed':        return 'COMPLETE';
    case 'cancelled':        return 'CANCELLED';
    case 'disputed':         return 'DISPUTED';
    case 'lost':             return 'LOST';
  }
}

function dueText(loan: Loan): string {
  if (loan.status === 'completed' && loan.completed_at) {
    return `Returned ${shortDate(loan.completed_at)}`;
  }
  if (loan.status === 'cancelled') return 'Cancelled';
  if (loan.status === 'lost') return 'Lost';
  if (loan.status === 'disputed') return 'Frozen';
  if (loan.due_at) {
    const diff = Math.ceil((new Date(loan.due_at).getTime() - Date.now()) / 86_400_000);
    if (diff < 0) return `${shortDate(loan.due_at)} · ${diff}d`;
    if (diff === 0) return 'today';
    return `${shortDate(loan.due_at)} · ${diff}d`;
  }
  return 'open-ended';
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short' });
}

function numberFromId(id: string): string {
  const hex = id.replace(/-/g, '').slice(0, 6);
  const n = parseInt(hex, 16) % 999;
  return n.toString().padStart(3, '0');
}

// ISO week number — used in the editorial top-right meta.
function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
}
