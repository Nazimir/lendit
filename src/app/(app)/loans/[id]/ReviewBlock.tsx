'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Review } from '@/lib/types';

const EDIT_WINDOW_HOURS = 48;

export function ReviewBlock({ loanId, myReview, otherName }: {
  loanId: string; myReview: Review | undefined; otherName: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [stars, setStars] = useState(myReview?.stars ?? 5);
  const [comment, setComment] = useState(myReview?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tick once a minute so the "X minutes left to edit" countdown stays fresh
  // and the form auto-locks when the window closes without a page refresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // ============ Submitted view (read-only or edit-eligible) ============
  if (myReview && !editing) {
    const editable = withinEditWindow(myReview.created_at);
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Your review</div>
          <div className="text-xs text-gray-500">
            {myReview.edited_at && <span className="mr-2 italic">(edited)</span>}
            {editable
              ? <button type="button" onClick={() => setEditing(true)} className="underline text-gray-700 hover:text-black">Edit</button>
              : <span>Locked</span>}
          </div>
        </div>
        <StarsInput value={myReview.stars} onChange={() => {}} readOnly />
        {myReview.comment && (
          <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{myReview.comment}</p>
        )}
        {editable && (
          <p className="text-xs text-gray-500 mt-3">
            Reviews lock {EDIT_WINDOW_HOURS}h after posting. {minutesLeft(myReview.created_at)} left.
          </p>
        )}
      </div>
    );
  }

  // ============ Edit / create form ============
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setError('Not signed in.'); setBusy(false); return; }

    if (myReview) {
      // Edit existing — RLS blocks if past the 48h window or not the reviewer.
      const { error } = await sb
        .from('reviews')
        .update({ stars, comment, edited_at: new Date().toISOString() })
        .eq('id', myReview.id);
      setBusy(false);
      if (error) { setError(error.message); return; }
      setEditing(false);
      router.refresh();
      return;
    }

    // First-time post
    const { data: loan } = await sb.from('loans').select('borrower_id,lender_id').eq('id', loanId).single();
    if (!loan) { setError('Loan not found.'); setBusy(false); return; }
    // Reviews only fire for two-sided completed loans, so both ids are non-null here.
    const reviewee = user.id === loan.borrower_id ? loan.lender_id! : loan.borrower_id!;
    const { error } = await sb.from('reviews').insert({
      loan_id: loanId, reviewer_id: user.id, reviewee_id: reviewee, stars, comment
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  function cancelEdit() {
    if (!myReview) return;
    setStars(myReview.stars);
    setComment(myReview.comment);
    setEditing(false);
    setError(null);
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <h3 className="font-medium">
        {myReview ? `Edit your review of ${otherName}` : `Leave a review for ${otherName}`}
      </h3>
      <StarsInput value={stars} onChange={setStars} />
      <textarea
        className="input min-h-[88px]"
        maxLength={500}
        placeholder="Optional — what was the experience like?"
        value={comment}
        onChange={e => setComment(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        {myReview && (
          <button type="button" onClick={cancelEdit} className="btn-secondary flex-1" disabled={busy}>
            Cancel
          </button>
        )}
        <button className="btn-primary flex-1" disabled={busy}>
          {busy ? 'Saving…' : myReview ? 'Save changes' : 'Post review'}
        </button>
      </div>
      {myReview && (
        <p className="text-xs text-gray-500">
          You can edit for {minutesLeft(myReview.created_at)} more, then this review locks.
        </p>
      )}
    </form>
  );
}

function StarsInput({ value, onChange, readOnly }: { value: number; onChange: (n: number) => void; readOnly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readOnly}
          onClick={() => onChange(i)}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          className="p-1"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill={i <= value ? '#F6D77A' : 'none'} stroke="#F6D77A" strokeWidth="1.5">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// =====================================================================
// Edit-window helpers
// =====================================================================

function withinEditWindow(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const cutoff  = created + EDIT_WINDOW_HOURS * 3600 * 1000;
  return Date.now() < cutoff;
}

function minutesLeft(createdAt: string): string {
  const created = new Date(createdAt).getTime();
  const cutoff  = created + EDIT_WINDOW_HOURS * 3600 * 1000;
  const msLeft  = cutoff - Date.now();
  if (msLeft <= 0) return '0 min';
  const minutes = Math.floor(msLeft / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins  = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}
