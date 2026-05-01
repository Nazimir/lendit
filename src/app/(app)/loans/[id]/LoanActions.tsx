'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { normalizeImage } from '@/lib/imageUpload';
import { ProgressBanner } from '@/components/Spinner';
import type { Loan } from '@/lib/types';

export function LoanActions({ loan, isLender }: { loan: Loan; isLender: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadPhoto(file: File, kind: 'handover' | 'return') {
    const sb = createClient();
    const isHeic = /\.hei[cf]$/i.test(file.name) || /heic|heif/i.test(file.type);
    setProgress(isHeic ? 'Converting & uploading photo…' : 'Uploading photo…');
    const normalized = await normalizeImage(file);
    const ext = (normalized.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${loan.id}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('loan-photos').upload(path, normalized, { upsert: false });
    if (upErr) throw upErr;
    const { data: pub } = sb.storage.from('loan-photos').getPublicUrl(path);
    return pub.publicUrl;
  }

  async function confirmHandover(file: File) {
    setBusy(true); setError(null);
    try {
      const url = await uploadPhoto(file, 'handover');
      setProgress('Starting the loan clock…');
      const now = new Date();
      const due = new Date(now.getTime() + loan.loan_period_days * 86_400_000);
      const sb = createClient();
      const { error } = await sb.from('loans').update({
        status: 'active',
        handover_photo_url: url,
        handover_at: now.toISOString(),
        due_at: due.toISOString()
      }).eq('id', loan.id);
      if (error) throw error;
      router.refresh();
    } catch (e: any) { setError(e.message || 'Failed'); }
    finally { setBusy(false); setProgress(null); }
  }

  async function initiateReturn() {
    setBusy(true); setError(null);
    setProgress('Marking as returned…');
    const sb = createClient();
    const { error } = await sb.from('loans').update({
      status: 'pending_return',
      return_initiated_at: new Date().toISOString()
    }).eq('id', loan.id);
    setBusy(false); setProgress(null);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function confirmReturn(file: File) {
    setBusy(true); setError(null);
    try {
      const url = await uploadPhoto(file, 'return');
      setProgress('Completing the loan…');
      const sb = createClient();
      const { error } = await sb.from('loans').update({
        status: 'completed',
        return_photo_url: url,
        completed_at: new Date().toISOString()
      }).eq('id', loan.id);
      if (error) throw error;
      router.refresh();
    } catch (e: any) { setError(e.message || 'Failed'); }
    finally { setBusy(false); setProgress(null); }
  }

  // Pick which actions to show based on status + role
  let body: React.ReactNode = null;

  if (loan.status === 'pending_handover' && isLender) {
    body = (
      <PhotoButton
        label="Confirm handover with photo"
        helper="Take or upload a photo of the item as you hand it over. This starts the loan clock."
        onFile={confirmHandover}
        disabled={busy}
      />
    );
  } else if (loan.status === 'pending_handover' && !isLender) {
    body = <Hint>Waiting for the lender to confirm handover with a photo.</Hint>;
  } else if (loan.status === 'active' && !isLender) {
    body = (
      <button onClick={initiateReturn} disabled={busy} className="btn-primary w-full">
        I&apos;ve returned the item
      </button>
    );
  } else if (loan.status === 'active' && isLender) {
    body = <Hint>Loan is active. The borrower can mark it returned when ready.</Hint>;
  } else if (loan.status === 'pending_return' && isLender) {
    body = (
      <PhotoButton
        label="Confirm return with photo"
        helper="Photo of the item back in your possession. This completes the loan."
        onFile={confirmReturn}
        disabled={busy}
      />
    );
  } else if (loan.status === 'pending_return' && !isLender) {
    body = <Hint>Waiting for the lender to confirm receipt with a photo.</Hint>;
  } else if (loan.status === 'completed') {
    body = <Hint>This loan is complete. Karma earned.</Hint>;
  }

  return (
    <div className="card p-4 space-y-3">
      {body}
      {progress && <ProgressBanner message={progress} />}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function PhotoButton({ label, helper, onFile, disabled }: {
  label: string; helper: string; onFile: (f: File) => void; disabled?: boolean;
}) {
  const id = 'photo-' + label.replace(/\s+/g, '-');
  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">{helper}</p>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      <label htmlFor={id} className={'btn-primary w-full cursor-pointer' + (disabled ? ' opacity-50 pointer-events-none' : '')}>
        {disabled ? 'Working…' : label}
      </label>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600">{children}</p>;
}
