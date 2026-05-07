'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Lender cancels a pending_handover loan because the handover never happened.
 * The item is freed back to the catalogue (via the on_loan_cancelled trigger).
 */
export async function cancelPendingHandover(loanId: string): Promise<{ ok: true } | { error: string }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: loan } = await sb.from('loans').select('*').eq('id', loanId).single();
  if (!loan) return { error: 'Loan not found.' };
  if (loan.lender_id !== user.id) return { error: 'Only the lender can cancel this loan.' };
  if (loan.status !== 'pending_handover') {
    return { error: 'This loan can no longer be cancelled — the handover already happened or it ended differently.' };
  }

  const { error } = await sb.from('loans').update({
    status: 'cancelled',
    updated_at: new Date().toISOString()
  }).eq('id', loanId);
  if (error) return { error: error.message };

  // Drop a chat note so the borrower knows.
  await sb.from('messages').insert({
    sender_id: user.id,
    recipient_id: loan.borrower_id,
    body: "I've cancelled this loan because the handover didn't happen. The item is back in my catalogue.",
    context_item_id: loan.item_id
  });

  revalidatePath(`/loans/${loanId}`);
  return { ok: true };
}

/**
 * Either party opens a dispute. Loan transitions to 'disputed' (frozen),
 * a dispute record is created, and a chat message is posted for visibility.
 */
export async function openDispute(loanId: string, reason: string): Promise<{ ok: true } | { error: string }> {
  const trimmed = reason.trim();
  if (trimmed.length < 5) return { error: 'Please describe what happened (at least a few words).' };
  if (trimmed.length > 1000) return { error: 'Please keep this under 1000 characters.' };

  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: loan } = await sb.from('loans').select('*').eq('id', loanId).single();
  if (!loan) return { error: 'Loan not found.' };
  if (![loan.lender_id, loan.borrower_id].includes(user.id)) {
    return { error: "You're not a participant of this loan." };
  }
  if (['completed', 'cancelled', 'lost'].includes(loan.status)) {
    return { error: 'This loan is already closed — no dispute can be opened.' };
  }
  if (loan.status === 'disputed') {
    return { error: 'A dispute is already open on this loan.' };
  }

  // 1. Insert the dispute record
  const { error: dErr } = await sb.from('disputes').insert({
    loan_id: loanId,
    opened_by: user.id,
    reason: trimmed
  });
  if (dErr) return { error: dErr.message };

  // 2. Freeze the loan
  const { error: lErr } = await sb.from('loans').update({
    status: 'disputed',
    updated_at: new Date().toISOString()
  }).eq('id', loanId);
  if (lErr) return { error: lErr.message };

  // 3. Post a chat message for visibility
  const otherId = loan.lender_id === user.id ? loan.borrower_id : loan.lender_id;
  await sb.from('messages').insert({
    sender_id: user.id,
    recipient_id: otherId,
    body: `I've opened a dispute on this loan.\n\nReason: ${trimmed}\n\nAn admin will review and reach out.`,
    context_item_id: loan.item_id
  });

  revalidatePath(`/loans/${loanId}`);
  return { ok: true };
}

/**
 * Original opener retracts a dispute that's still open. Loan goes back to
 * the previous lifecycle state (active or pending_return — we infer from
 * what's been recorded).
 */
export async function retractDispute(disputeId: string): Promise<{ ok: true } | { error: string }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: d } = await sb.from('disputes').select('*').eq('id', disputeId).single();
  if (!d) return { error: 'Dispute not found.' };
  if (d.opened_by !== user.id) return { error: 'Only the person who opened this dispute can retract it.' };
  if (d.status !== 'open') return { error: 'This dispute has already been resolved.' };

  const { data: loan } = await sb.from('loans').select('*').eq('id', d.loan_id).single();
  if (!loan) return { error: 'Loan not found.' };

  // Infer prior state: if return was initiated, go back to pending_return,
  // otherwise active. (Pending_handover disputes are uncommon — fall back to active.)
  const priorStatus = loan.return_initiated_at ? 'pending_return' : 'active';

  const { error: lErr } = await sb.from('loans').update({
    status: priorStatus,
    updated_at: new Date().toISOString()
  }).eq('id', d.loan_id);
  if (lErr) return { error: lErr.message };

  await sb.from('disputes').update({
    status: 'resolved',
    resolution_note: 'Retracted by opener',
    resolved_at: new Date().toISOString()
  }).eq('id', disputeId);

  revalidatePath(`/loans/${d.loan_id}`);
  return { ok: true };
}
