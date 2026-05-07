'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelPendingHandover } from './lifecycleActions';

export function CancelHandoverButton({ loanId }: { loanId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (!confirm("Cancel this loan? The item goes back to your catalogue. The borrower will see a note in your chat thread.")) return;
    setBusy(true); setError(null);
    const result = await cancelPendingHandover(loanId);
    setBusy(false);
    if ('error' in result) { setError(result.error); return; }
    router.refresh();
  }

  return (
    <div>
      <button onClick={go} disabled={busy} className="btn-secondary w-full">
        {busy ? 'Cancelling…' : "Cancel — handover didn't happen"}
      </button>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
