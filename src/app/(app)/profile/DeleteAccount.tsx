'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteMyAccount } from './actions';

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 underline hover:text-red-600"
      >
        Delete my account
      </button>
    );
  }

  async function go() {
    setBusy(true); setError(null);
    const result = await deleteMyAccount();
    setBusy(false);
    if ('error' in result) { setError(result.error); return; }
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="card p-4 border-2 border-rose-soft mt-3 space-y-3">
      <h3 className="font-display text-xl">Delete account</h3>
      <p className="text-sm text-gray-700">
        This permanently anonymises your profile and deletes every chat
        message you&apos;ve sent or received, plus all the items you&apos;ve
        listed. Reviews you&apos;ve given or received remain attached to the
        respective loans (with your name shown as &ldquo;Deleted user&rdquo;) so
        the people you transacted with keep an honest record.
      </p>
      <p className="text-sm text-gray-700">
        You cannot delete your account while you have any open loan
        (lending or borrowing). Complete or close them first.
      </p>
      <div>
        <label className="label">Type DELETE to confirm</label>
        <input
          className="input"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="DELETE"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setConfirm(''); setError(null); }}
          disabled={busy}
          className="btn-secondary flex-1"
        >Cancel</button>
        <button
          type="button"
          disabled={busy || confirm !== 'DELETE'}
          onClick={go}
          className="btn-danger flex-1 disabled:opacity-50"
        >{busy ? 'Deleting…' : 'Delete my account'}</button>
      </div>
    </div>
  );
}
