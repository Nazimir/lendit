'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { retractDispute } from './lifecycleActions';

export function RetractDisputeButton({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (!confirm('Retract this dispute? The loan will resume in its previous state.')) return;
    setBusy(true); setError(null);
    const result = await retractDispute(disputeId);
    setBusy(false);
    if ('error' in result) { setError(result.error); return; }
    router.refresh();
  }

  return (
    <div>
      <button onClick={go} disabled={busy} className="btn-secondary w-full text-sm py-2">
        {busy ? 'Retracting…' : 'Retract this dispute'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
