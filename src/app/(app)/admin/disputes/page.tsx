import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { DisputeRow } from './DisputeRow';
import { timeAgo, dateLabel } from '@/lib/utils';
import type { Dispute, Loan, Item, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminDisputesPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!isAdmin(user.email)) notFound();

  const status = searchParams.status === 'all' ? null : (searchParams.status || 'open');

  let query = supabase.from('disputes').select('*').order('created_at', { ascending: false }).limit(100);
  if (status) query = query.eq('status', status);
  const { data: rawDisputes } = await query;
  const disputes = (rawDisputes || []) as Dispute[];

  // Fetch related loans + items + profiles
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
    <main>
      <PageHeader title="Admin · Disputes" back="/admin" />
      <div className="px-4 max-w-3xl mx-auto pb-8">
        <div className="flex gap-2 mb-4">
          <Link href="/admin" className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full bg-cream-200 text-gray-600">
            Reports
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full bg-accent-400 text-white">
            Disputes
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          {['open', 'resolved', 'all'].map(s => (
            <Link
              key={s}
              href={s === 'open' ? '/admin/disputes' : `/admin/disputes?status=${s}`}
              className={
                'font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full ' +
                ((status || 'open') === s ? 'bg-accent-400 text-white' : 'bg-cream-200 text-gray-600')
              }
            >
              {s}
            </Link>
          ))}
        </div>

        {disputes.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-600">No disputes here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {disputes.map(d => {
              const loan = loanById.get(d.loan_id);
              const item = loan ? itemById.get(loan.item_id) : null;
              const opener = profileById.get(d.opened_by);
              const lender = loan ? profileById.get(loan.lender_id) : null;
              const borrower = loan ? profileById.get(loan.borrower_id) : null;

              return (
                <li key={d.id} className="card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                        Opened {timeAgo(d.created_at)} by {opener?.first_name || 'unknown'}
                      </div>
                      <div className="font-display text-xl mt-0.5 line-clamp-1">
                        {item?.title || 'Loan'}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2">{d.reason}</p>
                    </div>
                    <span className={
                      'font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ' +
                      (d.status === 'open' ? 'bg-rose-soft text-accent-900' : 'bg-cream-200 text-gray-600')
                    }>{d.status}</span>
                  </div>

                  {loan && item && (
                    <div className="card p-3 bg-cream-100 text-xs space-y-1">
                      <div>
                        <span className="text-gray-500">Loan status:</span>{' '}
                        <span className="font-medium">{loan.status}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Lender:</span>{' '}
                        <Link href={`/u/${loan.lender_id}`} className="text-accent-600 underline">
                          {lender?.first_name || 'unknown'}
                        </Link>
                      </div>
                      <div>
                        <span className="text-gray-500">Borrower:</span>{' '}
                        <Link href={`/u/${loan.borrower_id}`} className="text-accent-600 underline">
                          {borrower?.first_name || 'unknown'}
                        </Link>
                      </div>
                      <div>
                        <span className="text-gray-500">Loan started:</span>{' '}
                        {dateLabel(loan.created_at)}
                      </div>
                      {loan.handover_at && (
                        <div>
                          <span className="text-gray-500">Handover:</span>{' '}
                          {dateLabel(loan.handover_at)}
                          {loan.handover_photos.length > 0 && ` · ${loan.handover_photos.length} photo(s)`}
                        </div>
                      )}
                      {loan.return_initiated_at && (
                        <div>
                          <span className="text-gray-500">Return marked:</span>{' '}
                          {dateLabel(loan.return_initiated_at)}
                        </div>
                      )}
                    </div>
                  )}

                  {d.status === 'open' && <DisputeRow disputeId={d.id} />}

                  {d.status === 'resolved' && d.resolution_note && (
                    <p className="text-xs text-gray-500 italic">Note: {d.resolution_note}</p>
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
