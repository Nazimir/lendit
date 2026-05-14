'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { dismissReport, actionReport, banUser, hideItem, deleteMessage, reopenReport } from './actions';
import type { ReportTargetKind } from '@/lib/types';

export function ReportRow({
  reportId, targetKind, targetId, targetUserId
}: {
  reportId: string;
  targetKind: ReportTargetKind;
  targetId: string;
  targetUserId: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<{ ok: true } | { error: string }>) {
    setBusy(true); setError(null);
    const res = await fn();
    setBusy(false);
    if ('error' in res) { setError(res.error); return; }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <input
        className="input"
        placeholder="Resolution note (optional)"
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      {error && <p className="font-italic italic text-sm text-cat-tools">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => dismissReport(reportId, note))}
          className="btn-secondary text-sm py-1.5 px-3"
        >Dismiss</button>

        {targetKind === 'profile' && targetUserId && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(async () => {
              const r = await banUser(targetUserId, note || 'Violation of platform policy');
              if ('error' in r) return r;
              return await actionReport(reportId, note || 'Banned target user');
            })}
            className="btn-danger text-sm py-1.5 px-3"
          >Ban user + close</button>
        )}

        {targetKind === 'item' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(async () => {
              const r = await hideItem(targetId);
              if ('error' in r) return r;
              return await actionReport(reportId, note || 'Hid item');
            })}
            className="btn-danger text-sm py-1.5 px-3"
          >Hide item + close</button>
        )}

        {targetKind === 'message' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(async () => {
              const r = await deleteMessage(targetId);
              if ('error' in r) return r;
              return await actionReport(reportId, note || 'Deleted message');
            })}
            className="btn-danger text-sm py-1.5 px-3"
          >Delete message + close</button>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => actionReport(reportId, note || 'Acknowledged'))}
          className="btn-primary text-sm py-1.5 px-3"
        >Mark actioned</button>
      </div>
    </div>
  );
}

export function ReopenButton({
  reportId, itemToUnhideId
}: { reportId: string; itemToUnhideId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (!confirm(itemToUnhideId
      ? 'Reopen this report and re-publish the hidden item?'
      : 'Reopen this report?')) return;
    setBusy(true); setError(null);
    const res = await reopenReport(reportId, itemToUnhideId);
    setBusy(false);
    if ('error' in res) { setError(res.error); return; }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {error && <p className="font-italic italic text-xs text-cat-tools">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={go}
        className="font-mono text-[10px] uppercase tracking-mono px-3 py-1.5 rounded-full border border-ink/20 text-ink-soft hover:text-ink hover:border-ink/40 transition"
      >
        {busy ? 'Reopening…' : itemToUnhideId ? 'Reopen + un-hide item' : 'Reopen'}
      </button>
    </div>
  );
}
