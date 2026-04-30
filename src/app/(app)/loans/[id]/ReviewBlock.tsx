'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Review } from '@/lib/types';

export function ReviewBlock({ loanId, myReview, otherName }: {
  loanId: string; myReview: Review | undefined; otherName: string;
}) {
  const router = useRouter();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (myReview) {
    return (
      <div className="card p-4">
        <div className="text-sm font-medium mb-2">Your review</div>
        <StarsInput value={myReview.stars} onChange={() => {}} readOnly />
        {myReview.comment && <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{myReview.comment}</p>}
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setError('Not signed in.'); setBusy(false); return; }
    const { data: loan } = await sb.from('loans').select('borrower_id,lender_id').eq('id', loanId).single();
    if (!loan) { setError('Loan not found.'); setBusy(false); return; }
    const reviewee = user.id === loan.borrower_id ? loan.lender_id : loan.borrower_id;
    const { error } = await sb.from('reviews').insert({
      loan_id: loanId, reviewer_id: user.id, reviewee_id: reviewee, stars, comment
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <h3 className="font-medium">Leave a review for {otherName}</h3>
      <StarsInput value={stars} onChange={setStars} />
      <textarea
        className="input min-h-[88px]"
        maxLength={500}
        placeholder="Optional — what was the experience like?"
        value={comment}
        onChange={e => setComment(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Posting…' : 'Post review'}</button>
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
