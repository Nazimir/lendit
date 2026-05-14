import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';
import { Lightbox } from '@/components/Lightbox';
import { AwayBadge } from '@/components/AwayBadge';
import { LoanActions } from './LoanActions';
import { ReviewBlock } from './ReviewBlock';
import { Extensions } from './Extensions';
import { ChainHandoff } from './ChainHandoff';
import { RetractDisputeButton } from './RetractDisputeButton';
import { paletteForCategory } from '@/lib/categoryStyle';
import { grainStyle } from '@/lib/grain';
import { dateLabel, timeAgo } from '@/lib/utils';
import type { Loan, Item, Profile, Review, LoanExtension, BorrowRequest, Dispute, LoanStatus } from '@/lib/types';

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
    { data: me },
    { data: reviewsRaw },
    { data: extsRaw },
    { data: chainReqRaw },
    { data: disputeRaw }
  ] = await Promise.all([
    supabase.from('items').select('*').eq('id', loan.item_id).single(),
    supabase.from('profiles').select('*').eq('id', otherId).single(),
    supabase.from('profiles').select('first_name').eq('id', user.id).single(),
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

  let nextBorrower: Profile | null = null;
  if (chainRequest) {
    const { data } = await supabase.from('profiles').select('*').eq('id', chainRequest.borrower_id).single();
    nextBorrower = (data as Profile) || null;
  }

  const itemObj = item as Item | null;
  const otherProfile = other as Profile | null;
  const myFirstName = (me as { first_name: string } | null)?.first_name || '';
  const borrowerName = isLender ? (otherProfile?.first_name || 'borrower') : myFirstName || 'you';
  const lenderName   = isLender ? (myFirstName || 'you') : (otherProfile?.first_name || 'lender');

  return (
    <main className="max-w-2xl mx-auto pb-8">
      <LoanMasthead
        loan={loan as Loan}
        item={itemObj}
        borrowerName={borrowerName}
        lenderName={lenderName}
      />

      <ItemContextStrip item={itemObj} otherProfile={otherProfile} />

      <div className="px-5">
        <Link
          href={`/messages/${otherId}`}
          className="btn-secondary w-full mt-6 flex justify-between items-center"
        >
          <span>Open message thread</span>
          <span aria-hidden>↗</span>
        </Link>

        {dispute && dispute.status === 'open' && (
          <DisputeBanner
            dispute={dispute}
            iAmOpener={dispute.opened_by === user.id}
            otherName={otherProfile?.first_name || 'them'}
          />
        )}

        {dispute && dispute.status === 'resolved' && (
          <div className="mt-6 border border-ink/20 bg-paper-soft p-4">
            <Mono className="text-ink-soft block mb-1">
              Dispute resolved · {timeAgo(dispute.resolved_at || dispute.created_at)}
            </Mono>
            {dispute.resolution_note && (
              <p className="text-sm text-ink">{dispute.resolution_note}</p>
            )}
          </div>
        )}

        <LoanTimeline loan={loan as Loan} otherName={otherProfile?.first_name || 'them'} itemCategory={itemObj?.category} />

        <HandoverCountdown loan={loan as Loan} otherAwayUntil={otherProfile?.away_until} />

        <div className="mt-7">
          <LoanActions loan={loan as Loan} isLender={isLender} />
        </div>

        <Extensions
          loanId={loan.id}
          isLender={isLender}
          isBorrower={!isLender}
          extensionsAllowed={itemObj?.extensions_allowed ?? false}
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

        {(loan as Loan).handover_photos.length > 0 && (
          <PhotoGallery
            kicker="§ a — Handover photographs"
            photos={(loan as Loan).handover_photos}
            category={itemObj?.category}
          />
        )}
        {(loan as Loan).return_photos.length > 0 && (
          <PhotoGallery
            kicker="§ b — Return photographs"
            photos={(loan as Loan).return_photos}
            category={itemObj?.category}
          />
        )}

        {loan.status === 'completed' && (
          <div className="mt-9">
            <ReviewBlock
              loanId={loan.id}
              myReview={myReview}
              otherName={otherProfile?.first_name || 'them'}
            />
          </div>
        )}

        <div className="mt-8">
          <AwayBadge awayUntil={otherProfile?.away_until} />
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Masthead — full territory, editorial state title
// ─────────────────────────────────────────────────────────────

function LoanMasthead({
  loan, item, borrowerName, lenderName
}: {
  loan: Loan;
  item: Item | null;
  borrowerName: string;
  lenderName: string;
}) {
  const palette = paletteForCategory(item?.category || 'Other');
  const headline = stateHeadline(loan.status);
  const meta = stateMeta(loan);
  const subtitle = stateSubtitle(loan, borrowerName, lenderName);

  return (
    <header
      className="px-5 pt-12 pb-7"
      style={{ background: palette.bg, color: palette.ink, ...grainStyle }}
    >
      <div className="flex justify-between items-center">
        <Wordmark size={20} />
        <Mono style={{ color: palette.ink, opacity: 0.85 }}>{meta}</Mono>
      </div>
      <Link href="/loans" className="mt-5 inline-block hover:opacity-70 transition" style={{ color: palette.ink }}>
        <Mono style={{ color: palette.ink }}>← Back to loans</Mono>
      </Link>
      <Mono className="mt-5 block" style={{ color: palette.ink, opacity: 0.85 }}>
        №&nbsp;{item ? numberFromId(item.id) : '—'} · {item?.category?.toUpperCase() || 'LOAN'}
      </Mono>
      <h1
        className="mt-3 font-display font-extrabold leading-[0.85] tracking-[-0.04em]"
        style={{ color: palette.ink, fontSize: 'clamp(56px, 18vw, 76px)' }}
      >
        {headline}
      </h1>
      <p
        className="mt-4 font-display font-medium leading-[1.35] max-w-[420px]"
        style={{ color: palette.ink, fontSize: 16 }}
      >
        {subtitle}
      </p>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// Item context strip — small horizontal card under the masthead
// ─────────────────────────────────────────────────────────────

function ItemContextStrip({ item, otherProfile }: { item: Item | null; otherProfile: Profile | null }) {
  if (!item) return null;
  return (
    <Link
      href={`/items/${item.id}`}
      className="grid grid-cols-[64px_1fr_auto] gap-3.5 items-center border-b border-ink/20 hover:bg-paper-soft transition px-5 py-3"
    >
      <div className="w-16 h-16 overflow-hidden relative" style={{ background: paletteForCategory(item.category).bg }}>
        {item.photos?.[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photos[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
      </div>
      <div className="min-w-0">
        <Mono className="text-ink-soft block">The item</Mono>
        <div className="font-display font-bold text-[18px] leading-[1.1] text-ink mt-0.5 line-clamp-1">
          {item.title}
        </div>
        {otherProfile && (
          <Mono className="text-ink-soft mt-1 block">
            · {otherProfile.first_name?.toUpperCase()}{otherProfile.suburb ? ` · ${otherProfile.suburb.toUpperCase()}` : ''}
          </Mono>
        )}
      </div>
      <span aria-hidden className="font-display font-bold text-2xl text-ink-soft">↗</span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// Editorial timeline
// ─────────────────────────────────────────────────────────────

type StepState = 'past' | 'current' | 'future';

interface StepData {
  state: StepState;
  label: string;
  when: string | null;
  detail?: string;
  photos?: string[];
  category?: string;
}

function LoanTimeline({ loan, otherName, itemCategory }: { loan: Loan; otherName: string; itemCategory?: string }) {
  const steps = buildSteps(loan, otherName, itemCategory);
  const currentIdx = steps.findIndex(s => s.state === 'current');
  const stepNum = currentIdx >= 0 ? currentIdx + 1 : steps.filter(s => s.state === 'past').length;
  return (
    <section className="mt-7">
      <div className="flex justify-between items-baseline pb-2 mb-5 border-b-[1.5px] border-ink">
        <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-ink">
          The <Italic>story</Italic> so far
        </h2>
        <Mono className="text-ink-soft">{stepNum} / {steps.length}</Mono>
      </div>
      <ol className="relative space-y-5 pl-6">
        <div className="absolute top-3 bottom-3 left-[7px] w-px bg-ink/40" aria-hidden />
        {steps.map((s, i) => <Step key={i} {...s} />)}
      </ol>
    </section>
  );
}

function Step({ state, label, when, detail, photos, category }: StepData) {
  const isCurrent = state === 'current';
  const isFuture  = state === 'future';
  return (
    <li className="relative" style={{ opacity: isFuture ? 0.42 : 1 }}>
      <div
        className="absolute w-[14px] h-[14px] rounded-full border-[1.5px] border-ink"
        style={{
          top: 8,
          left: -24,
          background: isFuture ? '#F2ECE0' : '#16130D'
        }}
        aria-hidden
      />
      {when && <Mono className="text-ink-soft block">{when}</Mono>}
      <div
        className={
          'mt-0.5 ' + (
            isCurrent
              ? 'font-italic italic text-[34px] leading-[0.95] tracking-[-0.01em] text-ink'
              : 'font-display font-bold text-[20px] leading-[1.05] tracking-[-0.02em] text-ink'
          )
        }
      >
        {label}{isCurrent ? '.' : ''}
      </div>
      {detail && (
        <p className="font-italic italic text-[14px] text-ink-soft mt-2 leading-[1.35] max-w-[320px]">
          &ldquo;{detail}&rdquo;
        </p>
      )}
      {photos && photos.length > 0 && category && (
        <div className="mt-3 flex gap-2 overflow-x-auto -mr-5 pr-5">
          {photos.map((url, i) => (
            <div
              key={i}
              className="shrink-0 w-[170px] aspect-square overflow-hidden rounded-3xl"
              style={{ background: paletteForCategory(category).bg, ...grainStyle }}
            >
              <Lightbox src={url} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

function buildSteps(loan: Loan, _otherName: string, category?: string): StepData[] {
  const status = loan.status;
  const dateFmt = (iso: string | null) => iso ? dateLabel(iso).toUpperCase() : '—';

  // Terminal-state short circuits
  if (status === 'cancelled') {
    return [
      { state: 'past', label: 'Loan started', when: dateFmt(loan.created_at) },
      { state: 'current', label: 'Cancelled', when: dateFmt(loan.updated_at), detail: 'Handover never happened. Item back in catalogue.' }
    ];
  }
  if (status === 'disputed') {
    return [
      { state: 'past', label: 'Loan started', when: dateFmt(loan.created_at) },
      ...(loan.handover_at ? [{ state: 'past' as StepState, label: 'Handed over', when: dateFmt(loan.handover_at), photos: loan.handover_photos, category }] : []),
      { state: 'current', label: 'Disputed', when: dateFmt(loan.updated_at), detail: 'An admin is reviewing.' }
    ];
  }
  if (status === 'lost') {
    return [
      { state: 'past', label: 'Loan started', when: dateFmt(loan.created_at) },
      ...(loan.handover_at ? [{ state: 'past' as StepState, label: 'Handed over', when: dateFmt(loan.handover_at), photos: loan.handover_photos, category }] : []),
      { state: 'current', label: 'Lost', when: dateFmt(loan.updated_at), detail: 'The item didn’t come back.' }
    ];
  }

  // Normal flow
  const dueLabel = loan.due_at ? dateFmt(loan.due_at) : 'OPEN-ENDED';

  const steps: StepData[] = [
    {
      state: 'past',
      label: 'Loan started',
      when: dateFmt(loan.created_at)
    },
    {
      state: loan.handover_at ? 'past' : (status === 'pending_handover' ? 'current' : 'future'),
      label: 'Handed over',
      when: loan.handover_at ? dateFmt(loan.handover_at) : null,
      photos: loan.handover_at ? loan.handover_photos : undefined,
      category
    },
    {
      state: loan.due_at ? (Date.now() > new Date(loan.due_at).getTime() ? 'past' : (status === 'active' ? 'current' : 'past')) : (status === 'active' ? 'current' : 'past'),
      label: loan.due_at ? 'Due back' : 'On loan',
      when: dueLabel
    },
    {
      state: loan.return_initiated_at ? 'past' : (status === 'pending_return' ? 'current' : 'future'),
      label: 'Returned',
      when: loan.return_initiated_at ? dateFmt(loan.return_initiated_at) : null,
      photos: loan.return_initiated_at ? loan.return_photos : undefined,
      category
    },
    {
      state: status === 'completed' ? 'past' : 'future',
      label: 'Complete',
      when: loan.completed_at ? dateFmt(loan.completed_at) : null
    }
  ];

  return steps;
}

// ─────────────────────────────────────────────────────────────
// Headline / meta / subtitle generators
// ─────────────────────────────────────────────────────────────

function stateHeadline(status: LoanStatus): React.ReactNode {
  switch (status) {
    case 'pending_handover': return <>awaiting <Italic>handover.</Italic></>;
    case 'active':           return <>in <Italic>hand.</Italic></>;
    case 'pending_return':   return <>on <Italic>return.</Italic></>;
    case 'completed':        return <><Italic>complete.</Italic></>;
    case 'cancelled':        return <><Italic>cancelled.</Italic></>;
    case 'disputed':         return <><Italic>disputed.</Italic></>;
    case 'lost':             return <><Italic>lost.</Italic></>;
  }
}

function stateMeta(loan: Loan): string {
  if (loan.status === 'active' && loan.handover_at) {
    const day = Math.floor((Date.now() - new Date(loan.handover_at).getTime()) / 86_400_000) + 1;
    return loan.loan_period_days
      ? `LOAN · DAY ${day} OF ${loan.loan_period_days}`
      : `LOAN · DAY ${day}`;
  }
  const human: Record<LoanStatus, string> = {
    pending_handover: 'AWAITING HANDOVER',
    active:           'IN PROGRESS',
    pending_return:   'RETURN PENDING',
    completed:        'COMPLETED',
    cancelled:        'CANCELLED',
    disputed:         'DISPUTED',
    lost:             'LOST'
  };
  return human[loan.status];
}

function stateSubtitle(loan: Loan, borrowerName: string, lenderName: string): React.ReactNode {
  switch (loan.status) {
    case 'pending_handover':
      return <>For <strong className="font-bold">{borrowerName}</strong>, kept by <strong className="font-bold">{lenderName}</strong> until handover.</>;
    case 'active':
      return <>With <strong className="font-bold">{borrowerName}</strong>, kept by <strong className="font-bold">{lenderName}</strong>{loan.due_at ? <> — due back <Italic>{dateLabel(loan.due_at)}</Italic>.</> : <> — <Italic>open-ended</Italic>.</>}</>;
    case 'pending_return':
      return <>Coming back to <strong className="font-bold">{lenderName}</strong>. Awaiting their confirmation.</>;
    case 'completed':
      return loan.completed_at
        ? <>Returned <Italic>{dateLabel(loan.completed_at)}</Italic>. Karma earned.</>
        : <>Returned safely. Karma earned.</>;
    case 'cancelled':
      return <>The handover never happened. Item back in <strong className="font-bold">{lenderName}</strong>&apos;s catalogue.</>;
    case 'disputed':
      return <>An admin is reviewing. You can keep messaging in the chat.</>;
    case 'lost':
      return <>The item didn&apos;t come back.</>;
  }
}

// ─────────────────────────────────────────────────────────────
// Dispute banner, countdown, photo gallery (restyled)
// ─────────────────────────────────────────────────────────────

function DisputeBanner({
  dispute, iAmOpener, otherName
}: {
  dispute: Dispute;
  iAmOpener: boolean;
  otherName: string;
}) {
  return (
    <div className="mt-6 border-[1.5px] border-cat-tools p-4">
      <div className="flex items-start gap-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D8421C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-[18px] leading-tight text-ink">
            {iAmOpener ? 'You opened a dispute' : `${otherName} opened a dispute`}
          </h3>
          <Mono className="text-ink-soft mt-1.5 block">
            Filed {timeAgo(dispute.created_at)} · admin reviewing
          </Mono>
          <p className="font-italic italic text-[14px] text-ink-soft mt-2.5 leading-[1.35] whitespace-pre-wrap">
            &ldquo;{dispute.reason}&rdquo;
          </p>
          <p className="text-xs text-ink-soft mt-2.5">
            Loan is frozen until resolved. Keep messaging in the chat.
          </p>
        </div>
      </div>
      {iAmOpener && (
        <div className="mt-3 pt-3 border-t border-ink/15">
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
  const lenderAway = otherAwayUntil && new Date(otherAwayUntil) > now;

  if (lenderAway) {
    return (
      <div className="mt-5 border border-ink/20 bg-paper-soft p-3">
        <Mono className="text-ink-soft block">
          Auto-cancel paused · lender is in away mode
        </Mono>
        <p className="text-sm text-ink-soft mt-1">
          The timer resumes when they&apos;re back.
        </p>
      </div>
    );
  }
  if (daysLeft > 4) return null;
  return (
    <div className="mt-5 border-[1.5px] border-cat-kitchen bg-cat-kitchen/30 p-3">
      <Mono className="text-ink block">
        Heads up · auto-cancel in {daysLeft <= 0 ? 'less than a day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
      </Mono>
      <p className="text-sm text-ink mt-1">
        Confirm handover with a photo, or cancel it manually.
      </p>
    </div>
  );
}

function PhotoGallery({
  kicker, photos, category
}: {
  kicker: string;
  photos: string[];
  category?: string;
}) {
  if (!photos || photos.length === 0) return null;
  const palette = paletteForCategory(category || 'Other');
  return (
    <section className="mt-7">
      <Mono className="text-ink-soft block mb-3">{kicker}</Mono>
      <div className="grid grid-cols-3 gap-2.5">
        {photos.map((url, i) => (
          <div
            key={i}
            className="aspect-square overflow-hidden rounded-3xl"
            style={{ background: palette.bg, ...grainStyle }}
          >
            <Lightbox src={url} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Editorial 3-digit "issue number" derived deterministically from the
 * item's UUID. Stable for the life of the item, no DB column needed.
 */
function numberFromId(id: string): string {
  const hex = id.replace(/-/g, '').slice(0, 6);
  const n = parseInt(hex, 16) % 999;
  return n.toString().padStart(3, '0');
}
