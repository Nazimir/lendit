'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveDisputeAsCompleted, resolveDisputeAsLost } from './disputeActions';

export function DisputeRow({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(kind: 'completed' | 'lost') {
    const verb = kind === 'completed' ? 'Resolve as completed (item returned)' : 'Resolve as lost (item not returned)';
    if (!confirm(`${verb}? This is final.`)) return;
    setBusy(true); setError(null);
    const result = kind === 'completed'
      ? await resolveDisputeAsCompleted(disputeId, note)
      : await resolveDisputeAsLost(disputeId, note);
    setBusy(false);
    if ('error' in result) { setError(result.error); return; }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <textarea
        className="input min-h-[60px]"
        placeholder="Resolution note (will be visible to both parties)"
        value={note}
        onChange={e => setNote(e.target.value)}
        maxLength={500}
        disabled={busy}
      />
      <div className="flex gap-2">
        <button
          onClick={() => go('completed')}
          disabled={busy}
          className="btn-primary flex-1 text-sm py-2"
        >
          Item returned — complete the loan
        </button>
        <button
          onClick={() => go('lost')}
          disabled={busy}
          className="btn-danger flex-1 text-sm py-2"
        >
          Item lost — close as lost
        </button>
      </div>
      {error && <p className="font-italic italic text-sm text-cat-tools">{error}</p>}
    </div>
  );
}
