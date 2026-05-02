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

  async function uploadFiles(files: File[], kind: 'handover' | 'return'): Promise<string[]> {
    const sb = createClient();
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isHeic = /\.hei[cf]$/i.test(file.name) || /heic|heif/i.test(file.type);
      setProgress(
        files.length > 1
          ? `${isHeic ? 'Converting & uploading' : 'Uploading'} photo ${i + 1} of ${files.length}…`
          : `${isHeic ? 'Converting & uploading photo' : 'Uploading photo'}…`
      );
      const normalized = await normalizeImage(file);
      const ext = (normalized.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${loan.id}/${kind}-${Date.now()}-${i}.${ext}`;
      const { error: upErr } = await sb.storage.from('loan-photos').upload(path, normalized, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from('loan-photos').getPublicUrl(path);
      urls.push(pub.publicUrl);
    }
    return urls;
  }

  async function confirmHandover(files: File[]) {
    setBusy(true); setError(null);
    try {
      const urls = await uploadFiles(files, 'handover');
      setProgress('Starting the loan clock…');
      const now = new Date();
      const due = new Date(now.getTime() + loan.loan_period_days * 86_400_000);
      const sb = createClient();
      const { error } = await sb.from('loans').update({
        status: 'active',
        handover_photos: urls,
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

  async function recallItem() {
    if (!confirm('Recall this item? The borrower will be notified that you need it back. They\'ll arrange to return it as soon as possible.')) return;
    setBusy(true); setError(null);
    setProgress('Sending recall…');
    const sb = createClient();
    const { error } = await sb.from('loans').update({
      status: 'pending_return',
      return_initiated_at: new Date().toISOString()
    }).eq('id', loan.id);
    if (error) { setError(error.message); setBusy(false); setProgress(null); return; }

    // Drop a chat message so the borrower sees the recall in their inbox.
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      await sb.from('messages').insert({
        sender_id: user.id,
        recipient_id: loan.borrower_id,
        body: 'I need this item back — can we arrange the return as soon as possible?',
        context_item_id: loan.item_id
      });
    }
    setBusy(false); setProgress(null);
    router.refresh();
  }

  async function confirmReturn(files: File[]) {
    setBusy(true); setError(null);
    try {
      const urls = await uploadFiles(files, 'return');
      setProgress('Completing the loan…');
      const sb = createClient();
      const { error } = await sb.from('loans').update({
        status: 'completed',
        return_photos: urls,
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
      <MultiPhotoPicker
        label="Confirm handover with photo(s)"
        helper="Take or upload one or more photos as you hand the item over. Add extras if you want to document any pre-existing damage. This starts the loan clock."
        onFiles={confirmHandover}
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
    body = (
      <div className="space-y-2">
        <Hint>Loan is active. The borrower can mark it returned when ready — or you can recall it if you need it back sooner.</Hint>
        <button onClick={recallItem} disabled={busy} className="btn-secondary w-full">
          Recall — I need it back
        </button>
      </div>
    );
  } else if (loan.status === 'pending_return' && isLender) {
    body = (
      <MultiPhotoPicker
        label="Confirm return with photo(s)"
        helper="Photo(s) of the item back in your possession. Add extras to document any new damage if needed. This completes the loan."
        onFiles={confirmReturn}
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

function MultiPhotoPicker({ label, helper, onFiles, disabled }: {
  label: string; helper: string; onFiles: (files: File[]) => void; disabled?: boolean;
}) {
  const [selected, setSelected] = useState<File[]>([]);
  const id = 'photos-' + label.replace(/\s+/g, '-');

  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">{helper}</p>
      <input
        id={id}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={e => {
          const list = Array.from(e.target.files || []);
          setSelected(prev => [...prev, ...list]);
          e.target.value = ''; // allow picking the same file again later
        }}
      />
      {selected.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {selected.map((f, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-cream-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setSelected(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <label
          htmlFor={id}
          className={'btn-secondary flex-1 cursor-pointer' + (disabled ? ' opacity-50 pointer-events-none' : '')}
        >
          {selected.length === 0 ? 'Choose photo(s)' : 'Add more'}
        </label>
        <button
          type="button"
          disabled={disabled || selected.length === 0}
          onClick={() => onFiles(selected)}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {disabled ? 'Working…' : label}
        </button>
      </div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600">{children}</p>;
}
