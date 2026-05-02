'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { dateLabel, timeAgo } from '@/lib/utils';
import type { LoanExtension } from '@/lib/types';

export function Extensions({
  loanId, isLender, isBorrower, extensionsAllowed, loanStatus, dueAt, extensions
}: {
  loanId: string;
  isLender: boolean;
  isBorrower: boolean;
  extensionsAllowed: boolean;
  loanStatus: 'pending_handover' | 'active' | 'pending_return' | 'completed' | 'disputed';
  dueAt: string | null;
  extensions: LoanExtension[];
}) {
  const router = useRouter();
  const pending = extensions.find(e => e.status === 'pending');
  const decided = extensions.filter(e => e.status !== 'pending');

  const canRequest =
    isBorrower &&
    extensionsAllowed &&
    !pending &&
    (loanStatus === 'active' || loanStatus === 'pending_return');

  return (
    <section className="mt-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Extensions</h3>

      {pending && (
        <PendingCard
          extension={pending}
          isLender={isLender}
          dueAt={dueAt}
          onChange={() => router.refresh()}
        />
      )}

      {canRequest && (
        <RequestForm loanId={loanId} dueAt={dueAt} onCreated={() => router.refresh()} />
      )}

      {!canRequest && !pending && isBorrower && extensionsAllowed && loanStatus === 'completed' && (
        <p className="text-sm text-gray-500">Loan is completed.</p>
      )}

      {!extensionsAllowed && isBorrower && (
        <p className="text-sm text-gray-500">The lender hasn&apos;t enabled extensions for this item.</p>
      )}

      {decided.length > 0 && (
        <ul className="mt-3 space-y-2">
          {decided.map(e => (
            <li key={e.id} className="card p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>{e.additional_days} extra day{e.additional_days > 1 ? 's' : ''} requested</span>
                <span className={
                  e.status === 'approved' ? 'pill-accent' :
                  e.status === 'denied' ? 'pill-rose' : 'pill-muted'
                }>{e.status}</span>
              </div>
              {e.reason && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{e.reason}</p>}
              <p className="text-[11px] text-gray-400 mt-1">{timeAgo(e.decided_at || e.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RequestForm({ loanId, dueAt, onCreated }: { loanId: string; dueAt: string | null; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState('3');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return <button className="btn-secondary w-full" onClick={() => setOpen(true)}>Request extension</button>;
  }

  const numDays = Math.max(1, Math.min(60, parseInt(days || '1', 10) || 1));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setError('Not signed in.'); setBusy(false); return; }
    const { error } = await sb.from('loan_extensions').insert({
      loan_id: loanId,
      requested_by: user.id,
      additional_days: numDays,
      reason: reason.trim()
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setOpen(false);
    onCreated();
  }

  const newDue = dueAt
    ? new Date(new Date(dueAt).getTime() + numDays * 86_400_000)
    : null;

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <h4 className="font-medium">Request more time</h4>
      <div>
        <label className="label">How many extra days?</label>
        <input
          type="number" min={1} max={60} className="input"
          value={days}
          onChange={e => setDays(e.target.value)}
          onBlur={e => { if (!e.target.value) setDays('1'); }}
          required
        />
        {newDue && (
          <p className="text-xs text-gray-500 mt-1">
            New due date would be {newDue.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.
          </p>
        )}
      </div>
      <div>
        <label className="label">Reason (optional)</label>
        <textarea
          className="input min-h-[72px]"
          maxLength={300}
          placeholder="e.g. trip got delayed, need it through the weekend…"
          value={reason} onChange={e => setReason(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
        <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
      </div>
    </form>
  );
}

function PendingCard({ extension, isLender, dueAt, onChange }: {
  extension: LoanExtension;
  isLender: boolean;
  dueAt: string | null;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(status: 'approved' | 'denied') {
    setBusy(true); setError(null);
    const sb = createClient();
    const { error } = await sb.from('loan_extensions').update({ status }).eq('id', extension.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    onChange();
  }

  async function cancel() {
    setBusy(true); setError(null);
    const sb = createClient();
    const { error } = await sb.from('loan_extensions').update({ status: 'cancelled' }).eq('id', extension.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    onChange();
  }

  const newDue = dueAt
    ? new Date(new Date(dueAt).getTime() + extension.additional_days * 86_400_000)
    : null;

  return (
    <div className="card p-4 space-y-3 border-2 border-butter-soft">
      <div className="flex items-center justify-between">
        <span className="font-medium">Extension requested</span>
        <span className="pill-butter">pending</span>
      </div>
      <div className="text-sm text-gray-700">
        <span className="font-medium">{extension.additional_days}</span> extra day{extension.additional_days > 1 ? 's' : ''}.
        {newDue && <> New due date: <span className="font-medium">{dateLabel(newDue.toISOString())}</span>.</>}
      </div>
      {extension.reason && <p className="text-sm text-gray-600 whitespace-pre-wrap">{extension.reason}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {isLender ? (
        <div className="flex gap-2">
          <button onClick={() => decide('approved')} disabled={busy} className="btn-primary flex-1">Approve</button>
          <button onClick={() => decide('denied')} disabled={busy} className="btn-secondary flex-1">Decline</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <p className="text-sm text-gray-500 flex-1 self-center">Waiting for the lender to respond.</p>
          <button onClick={cancel} disabled={busy} className="btn-secondary text-sm">Cancel request</button>
        </div>
      )}
    </div>
  );
}
