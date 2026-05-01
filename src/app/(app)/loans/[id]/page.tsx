import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { LoanActions } from './LoanActions';
import { ReviewBlock } from './ReviewBlock';
import { Extensions } from './Extensions';
import { dateLabel } from '@/lib/utils';
import type { Loan, Item, Profile, Review, LoanExtension } from '@/lib/types';

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

  const [{ data: item }, { data: other }, { data: reviewsRaw }, { data: extsRaw }] = await Promise.all([
    supabase.from('items').select('*').eq('id', loan.item_id).single(),
    supabase.from('profiles').select('*').eq('id', otherId).single(),
    supabase.from('reviews').select('*').eq('loan_id', loan.id),
    supabase.from('loan_extensions').select('*').eq('loan_id', loan.id).order('created_at', { ascending: false })
  ]);

  const reviews = (reviewsRaw || []) as Review[];
  const myReview = reviews.find(r => r.reviewer_id === user.id);
  const extensions = (extsRaw || []) as LoanExtension[];

  return (
    <main>
      <PageHeader title="Loan" back="/loans" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        <div className="card p-3 mb-4">
          <div className="flex gap-3 items-center">
            <Link href={`/items/${loan.item_id}`} className="flex gap-3 items-center min-w-0 flex-1 hover:opacity-80 transition">
              <div className="w-16 h-16 rounded-2xl bg-cream-200 overflow-hidden shrink-0">
                {(item as Item)?.photos?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(item as Item).photos[0]} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium line-clamp-1">{(item as Item)?.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {loan.loan_period_days}-day loan
                  {loan.due_at && <> · Due {dateLabel(loan.due_at)}</>}
                </div>
              </div>
            </Link>
            <Link href={`/u/${otherId}`} className="flex flex-col items-center gap-1 shrink-0 hover:opacity-80 transition px-1">
              <Avatar url={(other as Profile)?.photo_url} name={(other as Profile)?.first_name || '?'} size={44} />
              <span className="text-[11px] text-gray-500">
                {isLender ? 'Borrower' : 'Lender'}
              </span>
            </Link>
          </div>
          <div className="mt-2 pt-2 border-t border-cream-200 text-xs text-gray-600">
            {isLender ? 'Lending to' : 'Borrowing from'}{' '}
            <Link href={`/u/${otherId}`} className="font-medium text-accent-700 hover:underline">
              {(other as Profile)?.first_name}
            </Link>
          </div>
        </div>

        <Link href={`/messages/${otherId}`} className="btn-secondary w-full mb-4">Open message thread</Link>

        <Timeline loan={loan as Loan} />

        <div className="mt-5">
          <LoanActions loan={loan as Loan} isLender={isLender} />
        </div>

        <Extensions
          loanId={loan.id}
          isLender={isLender}
          isBorrower={!isLender}
          extensionsAllowed={(item as Item)?.extensions_allowed ?? false}
          loanStatus={loan.status}
          dueAt={loan.due_at}
          extensions={extensions}
        />

        <PhotoGallery title="Handover photos" photos={(loan as Loan).handover_photos} />
        <PhotoGallery title="Return photos" photos={(loan as Loan).return_photos} />

        {loan.status === 'completed' && (
          <div className="mt-7">
            <ReviewBlock loanId={loan.id} myReview={myReview} otherName={(other as Profile)?.first_name || 'them'} />
          </div>
        )}
      </div>
    </main>
  );
}

function PhotoGallery({ title, photos }: { title: string; photos: string[] }) {
  if (!photos || photos.length === 0) return null;
  return (
    <section className="mt-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded-2xl overflow-hidden bg-cream-200 hover:opacity-90 transition">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
          </a>
        ))}
      </div>
    </section>
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
