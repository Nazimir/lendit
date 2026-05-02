'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { timeUntil } from '@/lib/utils';
import type { BorrowRequest } from '@/lib/types';

export function RequestForm({
  itemId, ownerId, existing, available,
  chainHandoffsAllowed, activeLoanId, activeBorrowerId, currentUserId
}: {
  itemId: string;
  ownerId: string;
  existing: BorrowRequest | null;
  available: boolean;
  chainHandoffsAllowed: boolean;
  activeLoanId: string | null;
  activeBorrowerId: string | null;
  currentUserId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already have a request in flight for this item?
  if (existing && existing.status === 'pending') {
    const isChain = !!existing.chain_after_loan_id;
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="pill-butter">{isChain ? 'Chain request pending' : 'Request pending'}</span>
          <span className="text-xs text-gray-500">Expires in {timeUntil(existing.expires_at)}</span>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          {isChain
            ? "You've asked the lender to pass this to you next. They'll see your request and decide."
            : "You've already asked. The lender will see your message."}
        </p>
        <Link href={`/messages/${ownerId}`} className="btn-secondary mt-3 w-full">Open thread</Link>
      </div>
    );
  }

  if (existing && existing.status === 'accepted') {
    const isChain = !!existing.chain_after_loan_id;
    return (
      <div className="card p-4 text-center">
        <p className="text-accent-700 font-medium">
          {isChain
            ? 'Approved — you\'re queued to take this next.'
            : 'Accepted — see your loans tab.'}
        </p>
        {isChain ? (
          <p className="text-xs text-gray-600 mt-2">
            The current borrower will pass it to you directly when they&apos;re done.
          </p>
        ) : (
          <Link href="/loans" className="btn-primary mt-3 w-full">Go to loans</Link>
        )}
      </div>
    );
  }

  // Item not available — show chain request UI if enabled and not the current borrower
  if (!available) {
    const amCurrentBorrower = activeBorrowerId === currentUserId;
    if (amCurrentBorrower) {
      return (
        <div className="card p-4 text-center">
          <p className="text-gray-700">You currently have this item. See your loans tab.</p>
          <Link href="/loans" className="btn-primary mt-3 w-full">Go to loans</Link>
        </div>
      );
    }

    if (!chainHandoffsAllowed || !activeLoanId) {
      return (
        <div className="card p-4 text-center">
          <p className="text-gray-600">This item isn&apos;t available right now.</p>
        </div>
      );
    }

    async function submitChain(e: React.FormEvent) {
      e.preventDefault();
      setBusy(true); setError(null);
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setError('Not signed in.'); setBusy(false); return; }
      const { error } = await sb.from('borrow_requests').insert({
        item_id: itemId,
        borrower_id: user.id,
        lender_id: ownerId,
        message,
        chain_after_loan_id: activeLoanId
      });
      if (error) { setError(error.message); setBusy(false); return; }

      if (message.trim()) {
        await sb.from('messages').insert({
          sender_id: user.id,
          recipient_id: ownerId,
          body: `(Chain handoff request) ${message.trim()}`,
          context_item_id: itemId
        });
      }
      setBusy(false);
      router.replace(`/messages/${ownerId}`);
      router.refresh();
    }

    return (
      <form onSubmit={submitChain} className="card p-4 space-y-3 border-2 border-butter-soft">
        <div>
          <h3 className="font-display text-xl">Could I take it next?</h3>
          <p className="text-sm text-gray-600 mt-1">
            This item is currently with another borrower. With your request, the owner can approve
            you to receive it directly when the current borrower is done — no return trip needed.
          </p>
        </div>
        <textarea
          className="input min-h-[88px]"
          placeholder="Hi! Once Sam's done with this, I&apos;d love to borrow it for…"
          required maxLength={500}
          value={message} onChange={e => setMessage(e.target.value)}
        />
        <p className="text-xs text-gray-500">
          The owner reviews you (your profile, reviews) and decides. If approved, you&apos;ll be
          queued. The current borrower hands the item directly to you.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Sending…' : 'Request to take it next'}
        </button>
      </form>
    );
  }

  // Standard borrow request flow
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
