'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { dismissReport, actionReport, banUser, hideItem, deleteMessage } from './actions';
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
    <div className="border-t border-cream-200 pt-3 space-y-2">
      <input
        className="input text-sm"
        placeholder="Resolution note (optional)"
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
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
