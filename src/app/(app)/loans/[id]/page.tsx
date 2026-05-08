import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { LoanActions } from './LoanActions';
import { ReviewBlock } from './ReviewBlock';
import { Extensions } from './Extensions';
import { ChainHandoff } from './ChainHandoff';
import { RetractDisputeButton } from './RetractDisputeButton';
import { Lightbox } from '@/components/Lightbox';
import { AwayBadge } from '@/components/AwayBadge';
import { paletteForCategory } from '@/lib/categoryStyle';
import { dateLabel, timeAgo } from '@/lib/utils';
import type { Loan, Item, Profile, Review, LoanExtension, BorrowRequest, Dispute } from '@/lib/types';

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

  const [
    { data: item },
    { data: other },
    { data: reviewsRaw },
    { data: extsRaw },
    { data: chainReqRaw },
    { data: disputeRaw }
  ] = await Promise.all([
    supabase.from('items').select('*').eq('id', loan.item_id).single(),
    supabase.from('profiles').select('*').eq('id', otherId).single(),
    supabase.from('reviews').select('*').eq('loan_id', loan.id),
    supabase.from('loan_extensions').select('*').eq('loan_id', loan.id).order('created_at', { ascending: false }),
    supabase
      .from('borrow_requests').select('*')
      .eq('chain_after_loan_id', loan.id).eq('status', 'accepted')
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from('disputes').select('*').eq('loan_id', loan.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);

  const reviews = (reviewsRaw || []) as Review[];
  const myReview = reviews.find(r => r.reviewer_id === user.id);
  const extensions = (extsRaw || []) as LoanExtension[];
  const chainRequest = (chainReqRaw as BorrowRequest) || null;
  const dispute = (disputeRaw as Dispute) || null;

  // Fetch the next-in-line borrower's profile for the chain handoff card
  let nextBorrower: Profile | null = null;
  if (chainRequest) {
    const { data } = await supabase.from('profiles').select('*').eq('id', chainRequest.borrower_id).single();
    nextBorrower = (data as Profile) || null;
  }

  return (
    <main>
      <PageHeader title="Loan" back="/loans" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        {(() => {
          const palette = paletteForCategory((item as Item)?.category);
          return (
            <div
              className="rounded-3xl p-3 mb-4 border-2 shadow-soft"
              style={{ background: palette.bg, borderColor: palette.accent, color: palette.ink }}
            >
              <div className="flex gap-3 items-center">
                <Link href={`/items/${loan.item_id}`} className="flex gap-3 items-center min-w-0 flex-1 hover:opacity-80 transition">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border" style={{ borderColor: palette.accent }}>
                    {(item as Item)?.photos?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={(item as Item).photos[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-xl line-clamp-1">{(item as Item)?.title}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider mt-0.5 opacity-70">
                      {loan.loan_period_days ? `${loan.loan_period_days}-day loan` : 'Open-ended loan'}
                      {loan.due_at && <> · Due {dateLabel(loan.due_at)}</>}
                    </div>
                  </div>
                </Link>
                <Link href={`/u/${otherId}`} className="flex flex-col items-center gap-1 shrink-0 hover:opacity-80 transition px-1">
                  <Avatar url={(other as Profile)?.photo_url} name={(other as Profile)?.first_name || '?'} size={44} />
                  <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                    {isLender ? 'Borrower' : 'Lender'}
                  </span>
                </Link>
              </div>
              <div
                className="mt-2 pt-2 border-t-2 font-mono text-[10px] uppercase tracking-wider opacity-80 flex items-center gap-2 flex-wrap"
                style={{ borderColor: palette.accent }}
              >
                <span>
                  {isLender ? 'Lending to' : 'Borrowing from'}{' '}
                  <Link href={`/u/${otherId}`} className="font-medium underline">
                    {(other as Profile)?.first_name}
                  </Link>
                </span>
                <AwayBadge awayUntil={(other as Profile)?.away_until} />
              </div>
            </div>
          );
        })()}

        <Link href={`/messages/${otherId}`} className="btn-secondary w-full mb-4">Open message thread</Link>

        {dispute && dispute.status === 'open' && (
          <DisputeBanner
            dispute={dispute}
            iAmOpener={dispute.opened_by === user.id}
            otherName={(other as Profile)?.first_name || 'them'}
          />
        )}

        {dispute && dispute.status === 'resolved' && (
          <div className="card p-4 mb-4 border-2 border-cream-200 bg-cream-100">
            <div className="font-mono text-[10px] uppercase tracking-wider text-gray-600 mb-1">
              Dispute resolved · {timeAgo(dispute.resolved_at || dispute.created_at)}
            </div>
            {dispute.resolution_note && (
              <p className="text-sm text-gray-700">{dispute.resolution_note}</p>
            )}
          </div>
        )}

        <Timeline loan={loan as Loan} />

        <HandoverCountdown loan={loan as Loan} otherAwayUntil={(other as Profile)?.away_until} />

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

        <ChainHandoff
          loanId={loan.id}
          loanItemId={loan.item_id}
          chainRequest={chainRequest}
          nextBorrower={nextBorrower}
          isCurrentBorrower={!isLender}
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

function DisputeBanner({
  dispute, iAmOpener, otherName
}: {
  dispute: Dispute;
  iAmOpener: boolean;
  otherName: string;
}) {
  return (
    <div className="card p-4 mb-4 border-2 border-rose-soft bg-butter-soft/40">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-rose-soft flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5F4E33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg leading-tight">
            {iAmOpener ? 'You opened a dispute on this loan' : `${otherName} opened a dispute on this loan`}
          </h3>
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-600 mt-1">
            Filed {timeAgo(dispute.created_at)} · An admin is reviewing
          </p>
          <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
            {dispute.reason}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            The loan is frozen until an admin resolves it. You can keep messaging in the chat.
          </p>
        </div>
      </div>
      {iAmOpener && (
        <div className="mt-3 pt-3 border-t border-rose-soft/50">
          <RetractDisputeButton disputeId={dispute.id} />
        </div>
      )}
    </div>
  );
}

function HandoverCountdown({
  loan, otherAwayUntil
}: {
  loan: Loan;
  otherAwayUntil: string | null | undefined;
}) {
  if (loan.status !== 'pending_handover') return null;

  const created = new Date(loan.created_at);
  const cancelAt = new Date(created.getTime() + 7 * 86_400_000);
  const now = new Date();
  const daysLeft = Math.ceil((cancelAt.getTime() - now.getTime()) / 86_400_000);

  // If lender is away, the timer is paused. Surface that.
  const lenderAway = otherAwayUntil && new Date(otherAwayUntil) > now;
  if (lenderAway) {
    return (
      <div className="mt-4 card p-3 border-2 border-butter-soft bg-butter-soft/30 text-xs text-gray-700">
        Auto-cancel paused — the lender is in away mode. The timer resumes when they&apos;re back.
      </div>
    );
  }

  if (daysLeft > 4) return null; // only surface in the last 4 days

  return (
    <div className="mt-4 card p-3 border-2 border-rose-soft bg-butter-soft/30 text-xs text-gray-700">
      <strong>Heads up:</strong>{' '}
      this loan will auto-cancel in {daysLeft <= 0 ? 'less than a day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`} if the handover doesn&apos;t happen.
      Confirm with a photo above, or cancel it manually.
    </div>
  );
}

function PhotoGallery({ title, photos }: { title: string; photos: string[] }) {
  if (!photos || photos.length === 0) return null;
  return (
    <section className="mt-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url, i) => (
          <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-cream-200">
            <Lightbox src={url} className="w-full h-full object-cover" />
          </div>
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
