import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { LoanActions } from './LoanActions';
import { ReviewBlock } from './ReviewBlock';
import { dateLabel } from '@/lib/utils';
import type { Loan, Item, Profile, Review } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function LoanDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: loan } = await supabase.from('loans').select('*').eq('id', params.id).single();
  if (!loan) notFound();
  if (![loan.lender_id, loan.borrower_id].includes(user.id)) redirect('/loans');

  const isLender = loan.lender_id === user.id;
  const otherId = isLender ? loan.borrower_id : loan.lender_id;

  const [{ data: item }, { data: other }, { data: reviewsRaw }] = await Promise.all([
    supabase.from('items').select('*').eq('id', loan.item_id).single(),
    supabase.from('profiles').select('*').eq('id', otherId).single(),
    supabase.from('reviews').select('*').eq('loan_id', loan.id)
  ]);

  const reviews = (reviewsRaw || []) as Review[];
  const myReview = reviews.find(r => r.reviewer_id === user.id);

  return (
    <main>
      <PageHeader title="Loan" back="/loans" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        <div className="card p-4 flex gap-3 items-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-cream-200 overflow-hidden shrink-0">
            {(item as Item)?.photos?.[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={(item as Item).photos[0]} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium">{(item as Item)?.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {isLender ? 'Lending to' : 'Borrowing from'} {(other as Profile)?.first_name}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {loan.loan_period_days}-day loan
              {loan.due_at && <> · Due {dateLabel(loan.due_at)}</>}
            </div>
          </div>
          <Avatar url={(other as Profile)?.photo_url} name={(other as Profile)?.first_name || '?'} size={44} />
        </div>

        <Link href={`/messages/loan/${loan.id}`} className="btn-secondary w-full mb-4">Open message thread</Link>

        <Timeline loan={loan as Loan} />

        <div className="mt-5">
          <LoanActions loan={loan as Loan} isLender={isLender} />
        </div>

        {loan.status === 'completed' && (
          <div className="mt-7">
            <ReviewBlock loanId={loan.id} myReview={myReview} otherName={(other as Profile)?.first_name || 'them'} />
          </div>
        )}
      </div>
    </main>
  );
}

function Timeline({ loan }: { loan: Loan }) {
  const steps: { label: string; done: boolean; ts?: string | null }[] = [
    { label: 'Request accepted', done: true, ts: loan.created_at },
    { label: 'Handed over', done: !!loan.handover_at, ts: loan.handover_at },
    { label: 'Return initiated', done: !!loan.return_initiated_at, ts: loan.return_initiated_at },
    { label: 'Completed', done: loan.status === 'completed', ts: loan.completed_at }
  ];
  return (
    <ol className="card p-4 space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-3">
          <div className={'w-3 h-3 rounded-full ' + (s.done ? 'bg-accent-400' : 'bg-cream-200')} />
          <div className="flex-1 text-sm">{s.label}</div>
          {s.done && s.ts && <div className="text-xs text-gray-500">{dateLabel(s.ts)}</div>}
        </li>
      ))}
    </ol>
  );
}
