'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { blockUser, unblockUser, fileReport } from '@/lib/safetyActions';
import type { ReportTargetKind } from '@/lib/types';

const REASONS = [
  'Inappropriate content',
  'Suspicious or scammy',
  'Harassment or abuse',
  'Stolen or counterfeit item',
  'Prohibited item',
  'Spam',
  'Other'
];

export function SafetyMenu({
  targetKind,
  targetId,
  // For "user" targets, optionally enable a Block action
  blockableUserId,
  alreadyBlocked = false,
  context
}: {
  targetKind: ReportTargetKind;
  targetId: string;
  blockableUserId?: string;
  alreadyBlocked?: boolean;
  // Short label like "this user" or "this listing", used in confirmation messages
  context: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<'none' | 'report' | 'block'>('none');
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / esc
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label="Safety options"
          className="w-9 h-9 rounded-full hover:bg-cream-200 flex items-center justify-center text-gray-500"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
          </svg>
        </button>
        {open && (
          <div className="absolute right-0 top-10 z-20 w-48 card p-1 shadow-md">
            <button
              type="button"
              onClick={() => { setOpen(false); setModal('report'); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-cream-200 rounded-xl"
            >
              Report {context}
            </button>
            {blockableUserId && (
              <button
                type="button"
                onClick={() => { setOpen(false); setModal('block'); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-cream-200 rounded-xl text-red-700"
              >
                {alreadyBlocked ? 'Unblock user' : 'Block user'}
              </button>
            )}
          </div>
        )}
      </div>

      {modal === 'report' && (
        <ReportModal
          onClose={() => setModal('none')}
          targetKind={targetKind}
          targetId={targetId}
          context={context}
        />
      )}
      {modal === 'block' && blockableUserId && (
        <BlockModal
          onClose={() => setModal('none')}
          userId={blockableUserId}
          alreadyBlocked={alreadyBlocked}
          onDone={() => router.refresh()}
        />
      )}
    </>
  );
}

function ReportModal({
  onClose, targetKind, targetId, context
}: {
  onClose: () => void;
  targetKind: ReportTargetKind;
  targetId: string;
  context: string;
}) {
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fileReport({ target_kind: targetKind, target_id: targetId, reason, detail });
    setBusy(false);
    if ('error' in res) { setError(res.error); return; }
    setDone(true);
    setTimeout(() => onClose(), 1500);
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="card p-5 max-w-md w-full">
        <h2 className="font-display text-2xl">Report {context}</h2>
        <p className="text-sm text-gray-600 mt-1">
          Reports go to Partaz moderators. They&apos;re confidential — the
          reported user isn&apos;t told who reported them.
        </p>
        {done ? (
          <p className="text-accent-700 mt-4">Thanks. We&apos;ll take a look.</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div>
              <label className="label">Reason</label>
              <select className="input" value={reason} onChange={e => setReason(e.target.value)} required>
                <option value="">Pick one…</option>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Anything else (optional)</label>
              <textarea
                className="input min-h-[80px]"
                maxLength={500}
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder="What happened?"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} disabled={busy} className="btn-secondary flex-1">Cancel</button>
              <button className="btn-primary flex-1" disabled={busy || !reason}>{busy ? 'Sending…' : 'Send report'}</button>
            </div>
          </form>
        )}
      </div>
    </Backdrop>
  );
}

function BlockModal({
  onClose, userId, alreadyBlocked, onDone
}: {
  onClose: () => void;
  userId: string;
  alreadyBlocked: boolean;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true); setError(null);
    const res = alreadyBlocked
      ? await unblockUser(userId)
      : await blockUser(userId);
    setBusy(false);
    if ('error' in res) { setError(res.error); return; }
    onDone();
    onClose();
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="card p-5 max-w-md w-full space-y-3">
        <h2 className="font-display text-2xl">
          {alreadyBlocked ? 'Unblock this user?' : 'Block this user?'}
        </h2>
        <p className="text-sm text-gray-700">
          {alreadyBlocked
            ? 'They will be able to message you and request your items again.'
            : 'They won’t be able to message you or request your items. Existing chat history is hidden until you unblock.'}
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary flex-1">Cancel</button>
          <button
            type="button"
            onClick={go}
            disabled={busy}
            className={(alreadyBlocked ? 'btn-primary' : 'btn-danger') + ' flex-1'}
          >
            {busy ? 'Working…' : alreadyBlocked ? 'Unblock' : 'Block'}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
    >
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}
