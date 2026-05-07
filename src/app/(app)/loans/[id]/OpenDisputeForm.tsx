'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { openDispute } from './lifecycleActions';

export function OpenDisputeForm({
  loanId,
  promptLabel,
  hint
}: {
  loanId: string;
  promptLabel: string;
  hint: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary w-full"
      >
        {promptLabel}
      </button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const result = await openDispute(loanId, reason);
    setBusy(false);
    if ('error' in result) { setError(result.error); return; }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3 border-2 border-rose-soft">
      <div>
        <h4 className="font-display text-lg">Open a dispute</h4>
        <p className="text-xs text-gray-600 mt-1">{hint}</p>
      </div>
      <textarea
        className="input min-h-[88px]"
        placeholder="Describe what happened. The admin reviewing this will see exactly what you write."
        required
        minLength={5}
        maxLength={1000}
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setReason(''); setError(null); }}
          disabled={busy}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
        <button className="btn-primary flex-1" disabled={busy || reason.trim().length < 5}>
          {busy ? 'Opening…' : 'Open dispute'}
        </button>
      </div>
    </form>
  );
}
