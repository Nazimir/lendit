'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Pass an active loan directly from the current borrower to the next borrower
 * who's been pre-approved by the owner via a chain request.
 *
 * Atomically:
 *  - Closes the current loan (status=completed, return_photos, completed_at)
 *  - Marks the chain request as fulfilled (status=cancelled)
 *  - Creates a new active loan for the next borrower (handover_at, due_at, photos)
 *  - Drops a chat note to the owner with the handover photo as context
 */
export async function passToNextBorrower(args: {
  loanId: string;
  chainRequestId: string;
  photoUrls: string[];
}): Promise<{ ok: true; new_loan_id: string } | { error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  // Load the active loan and verify the user is the current borrower.
  const { data: loan } = await supabase.from('loans').select('*').eq('id', args.loanId).single();
  if (!loan) return { error: 'Loan not found.' };
  if (loan.borrower_id !== user.id) return { error: "You're not the current borrower." };
  if (loan.status !== 'active' && loan.status !== 'pending_return') {
    return { error: 'This loan is not currently active.' };
  }

  // Load the chain request and verify state.
  const { data: chainReq } = await supabase
    .from('borrow_requests').select('*').eq('id', args.chainRequestId).single();
  if (!chainReq) return { error: 'Chain request not found.' };
  if (chainReq.status !== 'accepted') return { error: 'That request has not been approved by the owner.' };
  if (chainReq.item_id !== loan.item_id) return { error: 'The request is for a different item.' };
  if (chainReq.lender_id !== loan.lender_id) return { error: 'The request belongs to a different lender.' };

  if (args.photoUrls.length === 0) return { error: 'Please attach at least one handover photo.' };

  // 1. Close the current loan.
  const now = new Date().toISOString();
  const { error: closeErr } = await supabase.from('loans').update({
    status: 'completed',
    return_photos: args.photoUrls,
    completed_at: now,
    return_initiated_at: now
  }).eq('id', args.loanId);
  if (closeErr) return { error: 'Could not close current loan: ' + closeErr.message };

  // 2. Mark the chain request as fulfilled (cancelled = no longer actionable).
  await supabase.from('borrow_requests').update({ status: 'cancelled' }).eq('id', args.chainRequestId);

  // 3. Compute due date for the next loan.
  const { data: item } = await supabase.from('items').select('max_loan_days').eq('id', loan.item_id).single();
  const periodDays = item?.max_loan_days ?? null;
  const due = periodDays ? new Date(Date.now() + periodDays * 86_400_000) : null;

  // 4. Create the next loan, already active (the handoff photo IS the handover).
  const { data: newLoan, error: createErr } = await supabase.from('loans').insert({
    item_id: loan.item_id,
    borrower_id: chainReq.borrower_id,
    lender_id: loan.lender_id,
    request_id: chainReq.id,
    status: 'active',
    loan_period_days: periodDays,
    handover_photos: args.photoUrls,
    handover_at: now,
    due_at: due ? due.toISOString() : null
  }).select('id').single();
  if (createErr || !newLoan) return { error: 'Could not start the next loan: ' + (createErr?.message || 'unknown') };

  // 5. Notify the owner in chat.
  await supabase.from('messages').insert({
    sender_id: user.id,
    recipient_id: loan.lender_id,
    body: `Just passed the item to the next borrower — handover photo attached. The new loan is now active.`,
    context_item_id: loan.item_id
  });

  // 6. Notify the next borrower in chat.
  await supabase.from('messages').insert({
    sender_id: user.id,
    recipient_id: chainReq.borrower_id,
    body: `Handed it over to you — your loan is active and tracked in your loans tab.`,
    context_item_id: loan.item_id
  });

  revalidatePath('/loans');
  revalidatePath(`/loans/${args.loanId}`);
  revalidatePath(`/items/${loan.item_id}`);
  return { ok: true, new_loan_id: newLoan.id as string };
}

/**
 * Cancel a queued chain request — used by the next-up borrower if they no
 * longer want it, or by the owner via the request list.
 */
export async function cancelChainRequest(requestId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: req } = await supabase
    .from('borrow_requests').select('*').eq('id', requestId).single();
  if (!req) return { error: 'Request not found.' };
  if (req.borrower_id !== user.id && req.lender_id !== user.id) {
    return { error: 'Not your request to cancel.' };
  }

  const { error } = await supabase
    .from('borrow_requests').update({ status: 'cancelled' }).eq('id', requestId);
  if (error) return { error: error.message };

  revalidatePath('/loans');
  return { ok: true };
}
