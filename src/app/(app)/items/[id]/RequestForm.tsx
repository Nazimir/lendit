'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { timeUntil } from '@/lib/utils';
import type { BorrowRequest } from '@/lib/types';

export function RequestForm({
  itemId, ownerId, existing, available
}: { itemId: string; ownerId: string; existing: BorrowRequest | null; available: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existing && (existing.status === 'pending')) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="pill-butter">Request pending</span>
          <span className="text-xs text-gray-500">Expires in {timeUntil(existing.expires_at)}</span>
        </div>
        <p className="text-sm text-gray-600 mt-3">You&apos;ve already asked. The lender will see your message.</p>
        <Link href={`/messages/${ownerId}`} className="btn-secondary mt-3 w-full">Open thread</Link>
      </div>
    );
  }

  if (existing && existing.status === 'accepted') {
    return (
      <div className="card p-4 text-center">
        <p className="text-accent-700 font-medium">Accepted — see your loans tab.</p>
        <Link href="/loans" className="btn-primary mt-3 w-full">Go to loans</Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setError('Not signed in.'); setBusy(false); return; }
    const { error } = await sb.from('borrow_requests').insert({
      item_id: itemId, borrower_id: user.id, lender_id: ownerId, message
    });
    if (error) { setError(error.message); setBusy(false); return; }

    // Also drop the request message into the chat so the lender sees it in
    // their inbox, with no extra step needed. Tag it with the item so the
    // chat can render a context card linking back to the listing.
    if (message.trim()) {
      await sb.from('messages').insert({
        sender_id: user.id,
        recipient_id: ownerId,
        body: message.trim(),
        context_item_id: itemId
      });
    }

    setBusy(false);
    router.replace(`/messages/${ownerId}`);
    router.refresh();
  }

  if (!available) {
    return (
      <div className="card p-4 text-center">
        <p className="text-gray-600">This item isn&apos;t available right now.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <h3 className="font-medium">Send a borrow request</h3>
      <textarea
        className="input min-h-[88px]"
        placeholder="Hi! I&apos;d love to borrow this for a weekend trip…"
        required maxLength={500}
        value={message} onChange={e => setMessage(e.target.value)}
      />
      <p className="text-xs text-gray-500">Expires in 48 hours if the lender doesn&apos;t reply.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
    </form>
  );
}
