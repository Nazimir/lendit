'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/Avatar';
import { Stars } from '@/components/Stars';
import { timeUntil } from '@/lib/utils';
import type { BorrowRequest, Profile } from '@/lib/types';

export function RequestList({ requests, borrowers }: { requests: BorrowRequest[]; borrowers: Profile[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function update(id: string, status: 'accepted' | 'declined') {
    setBusy(id);
    const sb = createClient();
    const { error } = await sb.from('borrow_requests').update({ status }).eq('id', id);
    setBusy(null);
    if (error) { alert(error.message); return; }
    router.refresh();
    if (status === 'accepted') router.push('/loans');
  }

  if (requests.length === 0) {
    return <p className="text-gray-500 text-sm">No requests yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {requests.map(r => {
        const b = borrowers.find(p => p.id === r.borrower_id);
        const expired = new Date(r.expires_at).getTime() < Date.now();
        const status = r.status === 'pending' && expired ? 'expired' : r.status;
        return (
          <li key={r.id} className="card p-4">
            <div className="flex items-start gap-3">
              <Avatar url={b?.photo_url || null} name={b?.first_name || '?'} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{b?.first_name || 'Borrower'}</div>
                  <RequestStatusPill status={status} />
                </div>
                {b && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span>{b.suburb}</span>
                    <span>·</span>
                    <Stars value={b.reputation_score} size={12} />
                    <span>{b.reputation_score.toFixed(1)}</span>
                  </div>
                )}
                {r.message && <p className="text-sm mt-2 text-gray-700 whitespace-pre-wrap">{r.message}</p>}
                {status === 'pending' && (
                  <p className="text-xs text-gray-500 mt-2">Expires in {timeUntil(r.expires_at)}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  {status === 'pending' && (
                    <>
                      <button disabled={busy === r.id} onClick={() => update(r.id, 'accepted')} className="btn-primary py-2 px-4 text-sm">Accept</button>
                      <button disabled={busy === r.id} onClick={() => update(r.id, 'declined')} className="btn-secondary py-2 px-4 text-sm">Decline</button>
                    </>
                  )}
                  <Link href={`/messages/${r.borrower_id}`} className="btn-ghost py-2 px-4 text-sm">Message</Link>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RequestStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'pill-butter',
    accepted: 'pill-accent',
    declined: 'pill-rose',
    cancelled: 'pill-muted',
    expired: 'pill-muted'
  };
  return <span className={map[status] || 'pill-muted'}>{status}</span>;
}
