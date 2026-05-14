import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic, Rule } from '@/components/typography';
import { DisputeRow } from './DisputeRow';
import { timeAgo, dateLabel } from '@/lib/utils';
import type { Dispute, Loan, Item, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUSES: { key: string; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' }
];

export default async function AdminDisputesPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!isAdmin(user.email)) notFound();

  const status = searchParams.status === 'all' ? null : (searchParams.status || 'open');
  const activeStatus = status || 'open';

  let query = supabase.from('disputes').select('*').order('created_at', { ascending: false }).limit(100);
  if (status) query = query.eq('status', status);
  const { data: rawDisputes } = await query;
  const disputes = (rawDisputes || []) as Dispute[];

  const loanIds = Array.from(new Set(disputes.map(d => d.loan_id)));
  const openerIds = Array.from(new Set(disputes.map(d => d.opened_by)));

  const [{ data: loansRaw }, { data: openerProfilesRaw }] = await Promise.all([
    loanIds.length
      ? supabase.from('loans').select('*').in('id', loanIds)
      : Promise.resolve({ data: [] }),
    openerIds.length
      ? supabase.from('profiles').select('*').in('id', openerIds)
      : Promise.resolve({ data: [] })
  ]);

  const loans = (loansRaw || []) as Loan[];
  const itemIds = Array.from(new Set(loans.map(l => l.item_id)));
  const partyIds = Array.from(new Set([
    ...loans.map(l => l.lender_id),
    ...loans.map(l => l.borrower_id),
    ...openerIds
  ]));

  const [{ data: itemsRaw }, { data: profilesRaw }] = await Promise.all([
    itemIds.length
      ? supabase.from('items').select('*').in('id', itemIds)
      : Promise.resolve({ data: [] }),
    partyIds.length
      ? supabase.from('profiles').select('*').in('id', partyIds)
      : Promise.resolve({ data: [] })
  ]);

  const items = (itemsRaw || []) as Item[];
  const profiles = (profilesRaw || []) as Profile[];

  const loanById = new Map(loans.map(l => [l.id, l]));
  const itemById = new Map(items.map(i => [i.id, i]));
  const profileById = new Map(profiles.map(p => [p.id, p]));

  return (
    <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
      <div className="w-full max-w-3xl mx-auto">
        {/* Masthead */}
        <div className="flex justify-between items-center mb-10">
          <Wordmark size={22} />
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-ink-soft hover:text-ink">
              <Mono>← Desk</Mono>
            </Link>
            <Mono className="text-ink-soft">Admin · Disputes</Mono>
          </div>
        </div>

        {/* Headline */}
        <div>
          <h1 className="font-display font-extrabold text-[64px] leading-[0.85] tracking-[-0.045em] text-ink text-balance">
            Things to <Italic>untangle</Italic>.
          </h1>
          <p className="font-display font-medium text-[16px] leading-[1.4] text-ink-soft mt-4 text-pretty">
            Both parties hit a wall. Decide whether the item came back, or call it lost.
          </p>
        </div>

        {/* Section tabs */}
        <nav className="flex gap-2 mt-8">
          <SectionTab href="/admin">Reports</SectionTab>
          <SectionTab href="/admin/disputes" active>Disputes</SectionTab>
        </nav>

        {/* Status filter */}
        <div className="flex gap-2 mt-4">
          {STATUSES.map(s => (
            <FilterChip
              key={s.key}
              href={s.key === 'open' ? '/admin/disputes' : `/admin/disputes?status=${s.key}`}
              active={activeStatus === s.key}
            >
              {s.label}
            </FilterChip>
          ))}
        </div>

        {disputes.length === 0 ? (
          <div className="mt-10 border-y-[1.5px] border-ink py-8">
            <h2 className="font-display font-bold text-[24px] leading-tight tracking-[-0.02em] text-ink">
              Quiet on <Italic>this</Italic> front.
            </h2>
            <Mono className="text-ink-soft mt-2 block">
              No disputes need attention right now.
            </Mono>
          </div>
        ) : (
          <ul className="mt-10 border-y-[1.5px] border-ink">
            {disputes.map((d, idx) => {
              const num = (idx + 1).toString().padStart(2, '0');
              const loan = loanById.get(d.loan_id);
              const item = loan ? itemById.get(loan.item_id) : null;
              const opener = profileById.get(d.opened_by);
              const lender = loan ? profileById.get(loan.lender_id) : null;
              const borrower = loan ? profileById.get(loan.borrower_id) : null;

              return (
                <li key={d.id} className="border-t border-ink/15 first:border-t-0 py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Mono className="text-ink-soft block">
                        № {num} · Opened {timeAgo(d.created_at)} by {opener?.first_name || 'unknown'}
                      </Mono>
                      <h3 className="font-display font-bold text-[22px] leading-tight tracking-[-0.02em] text-ink mt-1 line-clamp-1">
                        {item?.title || 'Loan'}
                      </h3>
                      <p className="text-sm text-ink-soft whitespace-pre-wrap mt-2 leading-relaxed">{d.reason}</p>
                    </div>
                    <DisputeStatusPill status={d.status} />
                  </div>

                  {loan && item && (
                    <div className="mt-4 border border-ink/15 rounded-2xl p-4 space-y-1.5">
                      <DetailLine label="Loan status" value={loan.status} />
                      <DetailLine
                        label="Lender"
                        link={`/u/${loan.lender_id}`}
                        value={lender?.first_name || 'unknown'}
                      />
                      <DetailLine
                        label="Borrower"
                        link={`/u/${loan.borrower_id}`}
                        value={borrower?.first_name || 'unknown'}
                      />
                      <DetailLine label="Loan started" value={dateLabel(loan.created_at)} />
                      {loan.handover_at && (
                        <DetailLine
                          label="Handover"
                          value={`${dateLabel(loan.handover_at)}${loan.handover_photos.length > 0 ? ` · ${loan.handover_photos.length} photo(s)` : ''}`}
                        />
                      )}
                      {loan.return_initiated_at && (
                        <DetailLine label="Return marked" value={dateLabel(loan.return_initiated_at)} />
                      )}
                    </div>
                  )}

                  {d.status === 'open' && (
                    <div className="mt-4">
                      <Rule />
                      <div className="pt-4">
                        <DisputeRow disputeId={d.id} />
                      </div>
                    </div>
                  )}

                  {d.status === 'resolved' && d.resolution_note && (
                    <div className="mt-4 pt-4 border-t border-ink/15">
                      <Mono className="text-ink-soft block mb-1">Resolution note</Mono>
                      <p className="text-sm text-ink italic font-italic leading-relaxed">{d.resolution_note}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function SectionTab({
  href, children, active
}: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={
        'font-mono text-[10px] uppercase tracking-mono px-3 py-1.5 rounded-full transition ' +
        (active
          ? 'bg-ink text-paper'
          : 'border border-ink/20 text-ink-soft hover:text-ink hover:border-ink/40')
      }
    >
      {children}
    </Link>
  );
}

function FilterChip({
  href, children, active
}: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={
        'font-mono text-[10px] uppercase tracking-mono px-3 py-1.5 rounded-full transition ' +
        (active
          ? 'bg-ink/10 text-ink'
          : 'text-ink-soft hover:text-ink')
      }
    >
      {children}
    </Link>
  );
}

function DisputeStatusPill({ status }: { status: string }) {
  const style =
    status === 'open' ? 'bg-cat-tools text-paper'
    : 'bg-ink/10 text-ink';
  return (
    <span className={`font-mono text-[10px] uppercase tracking-mono px-2 py-1 rounded-full shrink-0 ${style}`}>
      {status}
    </span>
  );
}

function DetailLine({
  label, value, link
}: { label: string; value: string; link?: string }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <Mono className="text-ink-soft min-w-[88px]">{label}</Mono>
      {link ? (
        <Link href={link} className="text-ink underline">{value}</Link>
      ) : (
        <span className="text-ink">{value}</span>
      )}
    </div>
  );
}
