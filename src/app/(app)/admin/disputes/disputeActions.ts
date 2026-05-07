'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return { ok: false as const, error: 'Not authorised.', supabase: null, user: null };
  }
  return { ok: true as const, user, supabase };
}

/**
 * Resolve a dispute by force-completing the loan. Use this when the admin
 * agrees the item was returned and the lender simply hadn't confirmed,
 * or any case where the loan should end "successfully".
 *
 * The on_loan_completed trigger frees the item and grants karma.
 */
export async function resolveDisputeAsCompleted(
  disputeId: string,
  note: string
): Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const { data: d } = await auth.supabase.from('disputes').select('*').eq('id', disputeId).single();
  if (!d) return { error: 'Dispute not found.' };
  if (d.status !== 'open') return { error: 'This dispute is already resolved.' };

  // Update the loan status; trigger handles item + karma side effects.
  const { error: lErr } = await auth.supabase.from('loans').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', d.loan_id);
  if (lErr) return { error: lErr.message };

  // Mark the dispute resolved.
  const { error: dErr } = await auth.supabase.from('disputes').update({
    status: 'resolved',
    resolution_note: `Resolved as completed by admin. ${note}`.trim(),
    resolved_at: new Date().toISOString()
  }).eq('id', disputeId);
  if (dErr) return { error: dErr.message };

  revalidatePath('/admin');
  revalidatePath('/admin/disputes');
  revalidatePath(`/loans/${d.loan_id}`);
  return { ok: true };
}

/**
 * Resolve a dispute by marking the loan as lost. Use this when the admin
 * concludes the item was not returned. Item stays unavailable; no karma.
 */
export async function resolveDisputeAsLost(
  disputeId: string,
  note: string
): Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const { data: d } = await auth.supabase.from('disputes').select('*').eq('id', disputeId).single();
  if (!d) return { error: 'Dispute not found.' };
  if (d.status !== 'open') return { error: 'This dispute is already resolved.' };

  const { error: lErr } = await auth.supabase.from('loans').update({
    status: 'lost',
    updated_at: new Date().toISOString()
  }).eq('id', d.loan_id);
  if (lErr) return { error: lErr.message };

  const { error: dErr } = await auth.supabase.from('disputes').update({
    status: 'resolved',
    resolution_note: `Resolved as lost by admin. ${note}`.trim(),
    resolved_at: new Date().toISOString()
  }).eq('id', disputeId);
  if (dErr) return { error: dErr.message };

  revalidatePath('/admin');
  revalidatePath('/admin/disputes');
  revalidatePath(`/loans/${d.loan_id}`);
  return { ok: true };
}
