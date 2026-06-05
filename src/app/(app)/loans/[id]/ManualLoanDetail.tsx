'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mono, Italic } from '@/components/typography';
import { dateLabel } from '@/lib/utils';
import type { Loan, Item } from '@/lib/types';

/**
 * Manual loan detail page — for one-sided loans where the OTHER party
 * has no Partaz account. Works in both directions:
 *   - the current user is the lender (logged "I lent X to Sam")
 *   - the current user is the borrower (logged "I borrowed X from Papaya")
 *
 * Strips out everything that requires a counterparty account
 * (messaging, reviews, disputes, extensions, chain handoffs).
 */
export function ManualLoanDetail({
  loan, item, currentUserId
}: {
  loan: Loan;
  item: Item | null;
  currentUserId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Direction: which side am I on? Drives all copy + the claim link wording.
  const iAmLender   = loan.lender_id === currentUserId;
  const counterpartyName =
    iAmLender ? (loan.borrower_name_freetext || 'someone')
              : (loan.lender_name_freetext   || 'someone');

  const isActive    = loan.status === 'active';
  const isCompleted = loan.status === 'completed';
  const overdue     = loan.due_at && isActive && new Date(loan.due_at).getTime() < Date.now();

  async function markReturned() {
    if (!window.confirm(iAmLender ? 'Mark this loan as returned?' : 'Mark this as given back?')) return;
    setBusy(true); setError(null);
    const sb = createClient();
    const { error } = await sb
      .from('loans')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', loan.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function reopen() {
    if (!window.confirm('Reopen this loan? It will go back to "active" status.')) return;
    setBusy(true); setError(null);
    const sb = createClient();
    const { error } = await sb
      .from('loans')
      .update({ status: 'active', completed_at: null })
      .eq('id', loan.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function del() {
    if (!window.confirm('Delete this loan from your records? This cannot be undone.')) return;
    setBusy(true); setError(null);
    const sb = createClient();
    const { error } = await sb.from('loans').delete().eq('id', loan.id);
    if (error) { setError(error.message); setBusy(false); return; }
    router.replace('/loans');
    router.refresh();
  }

  // Adapt copy based on direction
  const verbPast      = iAmLender ? 'Lent' : 'Borrowed';
  const verbPreposition = iAmLender ? 'to' : 'from';
  const headerMode    = iAmLender ? 'Manual lend' : 'Manual borrow';
  const markReturnedLabel = iAmLender ? <>Mark <Italic>returned</Italic></> : <>Mark <Italic>given back</Italic></>;
  const claimPromptVerb   = iAmLender ? 'track it on their side' : 'see they lent it to you';

  return (
    <main className="max-w-2xl mx-auto pb-16">
      {/* Masthead */}
      <header className="px-5 pt-12 pb-5 bg-paper border-b-[1.5px] border-ink">
        <div className="flex justify-between items-center">
          <Link href="/loans" className="text-ink-soft hover:text-ink">
            <Mono>← Sharing</Mono>
          </Link>
          <Mono className="text-ink-soft">{headerMode}</Mono>
        </div>
        <h1 className="mt-3 font-display font-extrabold text-[40px] leading-[0.9] tracking-[-0.04em] text-ink">
          {item?.title || 'Item'}
        </h1>
        <p className="font-display font-medium text-[15px] leading-[1.35] text-ink-soft mt-2">
          {verbPast} {verbPreposition}{' '}
          <span className="text-ink font-bold">{counterpartyName}</span>
          {loan.handover_at && <> · {dateLabel(loan.handover_at)}</>}
        </p>
      </header>

      <section className="px-5 pt-6 space-y-4">
        <StatusCard
          iAmLender={iAmLender}
          status={loan.status}
          dueAt={loan.due_at}
          completedAt={loan.completed_at}
          overdue={!!overdue}
        />

        {((iAmLender && loan.borrower_contact) || (!iAmLender && loan.lender_contact)) && (
          <Row label="Contact">{iAmLender ? loan.borrower_contact : loan.lender_contact}</Row>
        )}

        {loan.handover_at && (
          <Row label={iAmLender ? 'Lent on' : 'Borrowed on'}>{dateLabel(loan.handover_at)}</Row>
        )}

        {loan.due_at && !isCompleted && (
          <Row label={iAmLender ? 'Expected back' : 'Need to return by'}>{dateLabel(loan.due_at)}</Row>
        )}

        {loan.completed_at && (
          <Row label={iAmLender ? 'Returned' : 'Given back'}>{dateLabel(loan.completed_at)}</Row>
        )}

        {loan.notes && (
          <Row label="Notes">
            <span className="whitespace-pre-wrap">{loan.notes}</span>
          </Row>
        )}
      </section>

      {/* Claim link — adoption hook. Available regardless of direction. */}
      {isActive && (
        <section className="px-5 pt-8">
          <ClaimLinkPanel
            loanId={loan.id}
            counterpartyName={counterpartyName}
            claimPromptVerb={claimPromptVerb}
          />
        </section>
      )}

      {/* Actions */}
      <section className="px-5 pt-8 space-y-3">
        {isActive && (
          <button
            type="button"
            onClick={markReturned}
            disabled={busy}
            className="btn-primary w-full flex justify-between items-center"
          >
            <span>{busy ? 'Saving…' : markReturnedLabel}</span>
            <span aria-hidden>✓</span>
          </button>
        )}

        {isCompleted && (
          <button
            type="button"
            onClick={reopen}
            disabled={busy}
            className="btn-secondary w-full flex justify-between items-center"
          >
            <span>Reopen loan</span>
            <span aria-hidden>↺</span>
          </button>
        )}

        <button
          type="button"
          onClick={del}
          disabled={busy}
          className="w-full py-3 font-mono text-[11px] uppercase tracking-mono text-ink-soft hover:text-cat-tools transition-colors"
        >
          Delete loan
        </button>

        {error && <p className="font-italic italic text-sm text-cat-tools">{error}</p>}
      </section>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-dashed border-ink/20 pb-3">
      <div className="font-mono text-[10px] uppercase tracking-mono text-ink-soft mb-1">{label}</div>
      <div className="font-display text-[15px] text-ink">{children}</div>
    </div>
  );
}

function StatusCard({
  iAmLender, status, dueAt, completedAt, overdue
}: {
  iAmLender: boolean;
  status: Loan['status'];
  dueAt: string | null;
  completedAt: string | null;
  overdue: boolean;
}) {
  let bg = 'bg-paper-soft';
  let tone = 'text-ink';
  let label = iAmLender ? 'In their hands' : 'In my hands';
  let sub = '';

  if (status === 'completed' && completedAt) {
    bg = 'bg-cat-kitchen';
    tone = 'text-ink';
    label = iAmLender ? 'Home safe' : 'Returned';
    sub = (iAmLender ? 'Returned ' : 'Gave back ') + dateLabel(completedAt);
  } else if (overdue && dueAt) {
    bg = 'bg-cat-tools/10 border border-cat-tools/40';
    tone = 'text-cat-tools';
    label = 'Overdue';
    sub = `Due ${dateLabel(dueAt)}`;
  } else if (dueAt) {
    sub = `Due ${dateLabel(dueAt)}`;
  } else if (status === 'active') {
    sub = 'Open-ended — no due date set';
  }

  return (
    <div className={`p-4 ${bg}`}>
      <div className={`font-display font-bold text-[22px] tracking-[-0.02em] ${tone}`}>
        {label}.
      </div>
      {sub && (
        <div className={`font-display text-[13px] mt-1 ${tone === 'text-cat-tools' ? 'text-cat-tools' : 'text-ink-soft'}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

/**
 * "Send a claim link" panel. Same mechanism in both directions — generates
 * a single-use token. When the other party clicks, they fill in their side
 * (lender or borrower) based on which one is null on the loan.
 */
function ClaimLinkPanel({
  loanId, counterpartyName, claimPromptVerb
}: {
  loanId: string;
  counterpartyName: string;
  claimPromptVerb: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true); setError(null);
    const sb = createClient();
    const { data, error } = await sb.rpc('create_loan_claim_token', { p_loan_id: loanId });
    setGenerating(false);
    if (error) { setError(error.message); return; }
    const fullUrl = `${window.location.origin}/claim/${data}`;
    setUrl(fullUrl);
    try { await navigator.clipboard.writeText(fullUrl); setCopied(true); } catch { /* manual copy is fine */ }
  }

  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* user can select manually */ }
  }

  const whatsappHref = url
    ? `https://wa.me/?text=${encodeURIComponent(`Hey ${counterpartyName}, I'm using Partaz to track stuff. Wanna ${claimPromptVerb}? ${url}`)}`
    : '#';

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="block w-full text-left border border-dashed border-ink/30 p-4 hover:border-ink/60 transition-colors"
      >
        <div className="font-display font-bold text-[15px] text-ink">
          Invite <Italic>{counterpartyName}</Italic> to track this →
        </div>
        <Mono className="text-ink-soft mt-1 block">
          Optional. They can join Partaz and see their side of the loan.
        </Mono>
      </button>
    );
  }

  return (
    <div className="border border-ink/30 p-4">
      <div className="font-display font-bold text-[16px] text-ink">
        Share a <Italic>claim link</Italic>.
      </div>
      <Mono className="text-ink-soft mt-1 block">
        Single-use. Expires in 7 days. They confirm or reject — your record is untouched either way.
      </Mono>

      {!url && (
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="btn-primary w-full mt-4 flex justify-between items-center"
        >
          <span>{generating ? 'Generating…' : <>Generate <Italic>link</Italic></>}</span>
          <span aria-hidden>→</span>
        </button>
      )}

      {url && (
        <div className="mt-4 space-y-3">
          <input
            type="text"
            readOnly
            value={url}
            onFocus={e => e.currentTarget.select()}
            className="input font-mono text-[12px]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="btn-secondary flex-1 flex justify-center items-center"
            >
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex-1 flex justify-center items-center"
            >
              Send on WhatsApp
            </a>
          </div>
        </div>
      )}

      {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}

      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="w-full mt-3 py-2 font-mono text-[10px] uppercase tracking-mono text-ink-soft hover:text-ink"
      >
        Close
      </button>
    </div>
  );
}
