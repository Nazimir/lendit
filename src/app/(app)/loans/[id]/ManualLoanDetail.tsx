'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mono, Italic } from '@/components/typography';
import { dateLabel } from '@/lib/utils';
import type { Loan, Item } from '@/lib/types';

/**
 * Manual loan detail page — for one-sided loans where the borrower has
 * no Partaz account. Strips out everything that requires a counterparty
 * (messaging, reviews, disputes, extensions, chain handoffs) and shows
 * a clean "this is what I lent, here are my notes, here's the way to
 * mark it returned" view.
 *
 * Phase 2 will add a "Send claim link" action here.
 */
export function ManualLoanDetail({ loan, item }: { loan: Loan; item: Item | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive    = loan.status === 'active';
  const isCompleted = loan.status === 'completed';
  const overdue     = loan.due_at && isActive && new Date(loan.due_at).getTime() < Date.now();

  async function markReturned() {
    if (!confirm('Mark this loan as returned?')) return;
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
    if (!confirm('Reopen this loan? It will go back to "active" status.')) return;
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
    if (!confirm('Delete this loan from your ledger? This cannot be undone.')) return;
    setBusy(true); setError(null);
    const sb = createClient();
    const { error } = await sb.from('loans').delete().eq('id', loan.id);
    if (error) { setError(error.message); setBusy(false); return; }
    router.replace('/loans');
    router.refresh();
  }

  return (
    <main className="max-w-2xl mx-auto pb-16">
      {/* Masthead */}
      <header className="px-5 pt-12 pb-5 bg-paper border-b-[1.5px] border-ink">
        <div className="flex justify-between items-center">
          <Link href="/loans" className="text-ink-soft hover:text-ink">
            <Mono>← Ledger</Mono>
          </Link>
          <Mono className="text-ink-soft">Manual loan</Mono>
        </div>
        <h1 className="mt-3 font-display font-extrabold text-[40px] leading-[0.9] tracking-[-0.04em] text-ink">
          {item?.title || 'Item'}
        </h1>
        <p className="font-display font-medium text-[15px] leading-[1.35] text-ink-soft mt-2">
          {isLenderVerb(loan.status)} to{' '}
          <span className="text-ink font-bold">{loan.borrower_name_freetext || 'someone'}</span>
          {loan.handover_at && <> · {dateLabel(loan.handover_at)}</>}
        </p>
      </header>

      <section className="px-5 pt-6 space-y-4">
        <StatusCard
          status={loan.status}
          dueAt={loan.due_at}
          completedAt={loan.completed_at}
          overdue={!!overdue}
        />

        {loan.borrower_contact && (
          <Row label="Contact">{loan.borrower_contact}</Row>
        )}

        {loan.handover_at && (
          <Row label="Lent on">{dateLabel(loan.handover_at)}</Row>
        )}

        {loan.due_at && !isCompleted && (
          <Row label="Expected back">{dateLabel(loan.due_at)}</Row>
        )}

        {loan.completed_at && (
          <Row label="Returned">{dateLabel(loan.completed_at)}</Row>
        )}

        {loan.notes && (
          <Row label="Notes">
            <span className="whitespace-pre-wrap">{loan.notes}</span>
          </Row>
        )}
      </section>

      {/* Actions */}
      <section className="px-5 pt-8 space-y-3">
        {isActive && (
          <button
            type="button"
            onClick={markReturned}
            disabled={busy}
            className="btn-primary w-full flex justify-between items-center"
          >
            <span>{busy ? 'Saving…' : <>Mark <Italic>returned</Italic></>}</span>
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
          Delete from ledger
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
  status, dueAt, completedAt, overdue
}: {
  status: Loan['status'];
  dueAt: string | null;
  completedAt: string | null;
  overdue: boolean;
}) {
  let bg = 'bg-paper-soft';
  let tone = 'text-ink';
  let label = 'In hand';
  let sub = '';

  if (status === 'completed' && completedAt) {
    bg = 'bg-cat-kitchen';
    tone = 'text-ink';
    label = 'Home safe';
    sub = `Returned ${dateLabel(completedAt)}`;
  } else if (overdue && dueAt) {
    bg = 'bg-cat-tools/10 border border-cat-tools/40';
    tone = 'text-cat-tools';
    label = 'Overdue';
    sub = `Due ${dateLabel(dueAt)}`;
  } else if (dueAt) {
    label = 'In hand';
    sub = `Due ${dateLabel(dueAt)}`;
  } else if (status === 'active') {
    label = 'In hand';
    sub = 'Open-ended — no due date set';
  }

  return (
    <div className={`p-4 ${bg}`}>
      <div className={`font-display font-bold text-[22px] tracking-[-0.02em] ${tone}`}>
        {label}.
      </div>
      {sub && <div className={`font-display text-[13px] mt-1 ${tone === 'text-cat-tools' ? 'text-cat-tools' : 'text-ink-soft'}`}>{sub}</div>}
    </div>
  );
}

function isLenderVerb(status: Loan['status']): string {
  switch (status) {
    case 'completed': return 'Was lent';
    case 'cancelled': return 'Was meant for';
    case 'lost':      return 'Was lent';
    default:          return 'Lent';
  }
}
