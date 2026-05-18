'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

interface LendPayload {
  // Either pass existing_item_id to lend something already in your listings,
  // or pass title/description/category/photo_urls to create a new item on the fly.
  existing_item_id?: string;
  title?: string;
  description?: string;
  category?: string;
  photo_urls?: string[];
  loan_period_days: number | null; // null = open-ended (no fixed return date)
  recipient_email: string;
  recipient_hint: string;
}

export async function createLending(payload: LendPayload): Promise<
  | { ok: true; mode: 'pending_acceptance'; request_id: string; recipient_first_name: string }
  | { ok: true; mode: 'invite'; invite_url: string; token: string }
  | { error: string }
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const recipient_email = payload.recipient_email.trim().toLowerCase();
  if (payload.loan_period_days !== null && payload.loan_period_days < 1) {
    return { error: 'Loan period must be at least 1 day.' };
  }

  // Resolve the item: either reuse an existing one or create a new one.
  let itemId: string;
  if (payload.existing_item_id) {
    const { data: existing, error: lookupErr } = await supabase
      .from('items')
      .select('id, owner_id, is_available')
      .eq('id', payload.existing_item_id)
      .maybeSingle();
    if (lookupErr || !existing) return { error: 'Could not find that listing.' };
    if (existing.owner_id !== user.id) return { error: "That listing isn't yours." };
    if (!existing.is_available) return { error: 'That item is already on loan or marked unavailable.' };
    itemId = existing.id as string;
  } else {
    const title = (payload.title || '').trim();
    if (!title) return { error: 'Title is required.' };
    if (!payload.photo_urls || payload.photo_urls.length === 0) return { error: 'Add at least one photo.' };

    const { data: itemRow, error: itemErr } = await supabase
      .from('items')
      .insert({
        owner_id: user.id,
        title,
        description: (payload.description || '').trim() || 'In-person loan.',
        category: payload.category || 'Other',
        photos: payload.photo_urls,
        max_loan_days: payload.loan_period_days,
        extensions_allowed: true,
        // Keep the item available until the borrower accepts. The
        // on_request_accepted trigger will atomically flip is_available
        // to false when the loan is created.
        is_available: true,
        // Lend-in-person items are private by default — they're personal
        // trackers for items the owner hand-delivered, not catalogue listings.
        // The owner can flip them to public later from the listing page.
        visibility: 'private'
      })
      .select('id')
      .single();
    if (itemErr || !itemRow) return { error: 'Could not create the listing: ' + (itemErr?.message || 'unknown') };
    itemId = itemRow.id as string;
  }

  // 2. Look for an existing user matching the email.
  let recipientId: string | null = null;
  if (recipient_email) {
    const { data: matchedProfile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', recipient_email)
      .limit(1)
      .maybeSingle();
    if (matchedProfile?.id) recipientId = matchedProfile.id as string;
  }

  if (recipientId && recipientId !== user.id) {
    // 3a. Direct path — pre-fill a borrow request from the recipient's
    // perspective. The recipient must Accept it from their /loans page
    // before a loan is actually created.
    //
    // This closes a trust hole: previously the lender could auto-accept
    // their own pre-filled request, fabricating loans against another
    // user's account. Now both sides confirm.
    const recipientFirstName = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', recipientId)
      .maybeSingle()
      .then(r => (r.data?.first_name as string) || 'them');

    const { data: req, error: reqErr } = await supabase
      .from('borrow_requests')
      .insert({
        item_id: itemId,
        borrower_id: recipientId,
        lender_id: user.id,
        message: payload.loan_period_days
          ? `In-person loan — ${payload.loan_period_days} days.`
          : `In-person loan — open-ended.`,
        status: 'pending',
        initiated_by: 'lender'
      })
      .select('id')
      .single();
    if (reqErr || !req) return { error: 'Could not start the loan: ' + (reqErr?.message || 'unknown') };

    revalidatePath('/listings');
    revalidatePath('/loans');
    return {
      ok: true,
      mode: 'pending_acceptance',
      request_id: req.id as string,
      recipient_first_name: recipientFirstName
    };
  }

  // 3b. Invite path — generate a token and stash a pending invite.
  const token = randomToken();
  const { error: invErr } = await supabase
    .from('lend_invites')
    .insert({
      token,
      lender_id: user.id,
      item_id: itemId,
      loan_period_days: payload.loan_period_days,
      recipient_hint: payload.recipient_hint.trim()
    });
  if (invErr) return { error: 'Could not create invite: ' + invErr.message };

  // The invite path needs the item to remain unclaimed until the friend signs
  // up, so leave it unavailable. Once they claim, the loan is created which
  // keeps it unavailable through the lifecycle.
  revalidatePath('/listings');
  return {
    ok: true,
    mode: 'invite',
    invite_url: `/invite/${token}`,
    token
  };
}

export async function claimInvite(token: string): Promise<
  | { ok: true; loan_id: string }
  | { error: string }
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: invite } = await supabase
    .from('lend_invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle();
  if (!invite) return { error: 'Invite not found or already used.' };
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { error: 'This invite has expired.' };
  }
  if (invite.lender_id === user.id) {
    return { error: "You can't claim your own invite — share it with someone else." };
  }

  // Create accepted request + loan via trigger
  const { data: req, error: reqErr } = await supabase
    .from('borrow_requests')
    .insert({
      item_id: invite.item_id,
      borrower_id: user.id,
      lender_id: invite.lender_id,
      message: 'In-person loan via invite link.',
      status: 'pending'
    })
    .select('id')
    .single();
  if (reqErr || !req) return { error: 'Could not create the loan: ' + (reqErr?.message || 'unknown') };

  const { error: acceptErr } = await supabase
    .from('borrow_requests')
    .update({ status: 'accepted' })
    .eq('id', req.id);
  if (acceptErr) return { error: 'Could not accept the loan: ' + acceptErr.message };

  const { data: loan } = await supabase
    .from('loans')
    .select('id')
    .eq('request_id', req.id)
    .maybeSingle();

  await supabase.from('lend_invites').update({
    status: 'claimed',
    claimed_by: user.id,
    claimed_at: new Date().toISOString(),
    loan_id: loan?.id ?? null
  }).eq('id', invite.id);

  revalidatePath('/loans');
  return { ok: true, loan_id: (loan?.id as string) || '' };
}

function randomToken(): string {
  // Lowercase + digits, 12 chars, plenty of entropy and easy to type if needed.
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// =====================================================================
// In-person request lifecycle (post-trust-fix)
//
// Once a lender pre-fills a borrow_request via createLending, the
// borrower must call acceptInPersonRequest or declineInPersonRequest
// from their /loans page. The lender can cancel or nudge while pending.
// =====================================================================

export async function acceptInPersonRequest(requestId: string): Promise<
  | { ok: true; loan_id: string }
  | { error: string }
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  // Verify the request exists, is pending, was lender-initiated, and
  // the caller is the named borrower. RLS already restricts read/update
  // to participants, but we check explicitly for clearer error messages.
  const { data: req } = await supabase
    .from('borrow_requests')
    .select('id, status, initiated_by, borrower_id, expires_at')
    .eq('id', requestId)
    .maybeSingle();
  if (!req) return { error: 'Request not found.' };
  if (req.borrower_id !== user.id) return { error: 'Only the named borrower can accept this.' };
  if (req.initiated_by !== 'lender') return { error: "That isn't an in-person loan request." };
  if (req.status !== 'pending') return { error: `This request is already ${req.status}.` };
  if (new Date(req.expires_at).getTime() < Date.now()) {
    return { error: 'This request has expired. Ask the lender to resend.' };
  }

  // Flip to accepted. The on_request_accepted trigger creates the loan
  // in pending_handover and atomically claims the item.
  const { error: upErr } = await supabase
    .from('borrow_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);
  if (upErr) return { error: 'Could not accept: ' + upErr.message };

  const { data: loan } = await supabase
    .from('loans')
    .select('id')
    .eq('request_id', requestId)
    .maybeSingle();

  revalidatePath('/loans');
  return { ok: true, loan_id: (loan?.id as string) || '' };
}

export async function declineInPersonRequest(requestId: string): Promise<
  { ok: true } | { error: string }
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: req } = await supabase
    .from('borrow_requests')
    .select('id, status, initiated_by, borrower_id')
    .eq('id', requestId)
    .maybeSingle();
  if (!req) return { error: 'Request not found.' };
  if (req.borrower_id !== user.id) return { error: 'Only the named borrower can decline this.' };
  if (req.initiated_by !== 'lender') return { error: "That isn't an in-person loan request." };
  if (req.status !== 'pending') return { error: `This request is already ${req.status}.` };

  const { error: upErr } = await supabase
    .from('borrow_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);
  if (upErr) return { error: 'Could not decline: ' + upErr.message };

  revalidatePath('/loans');
  return { ok: true };
}

export async function cancelInPersonRequest(requestId: string): Promise<
  { ok: true } | { error: string }
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: req } = await supabase
    .from('borrow_requests')
    .select('id, status, initiated_by, lender_id')
    .eq('id', requestId)
    .maybeSingle();
  if (!req) return { error: 'Request not found.' };
  if (req.lender_id !== user.id) return { error: 'Only the lender can cancel this.' };
  if (req.initiated_by !== 'lender') return { error: "That isn't an in-person loan request." };
  if (req.status !== 'pending') return { error: `This request is already ${req.status}.` };

  const { error: upErr } = await supabase
    .from('borrow_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId);
  if (upErr) return { error: 'Could not cancel: ' + upErr.message };

  revalidatePath('/loans');
  return { ok: true };
}

/**
 * Resend a nudge to the recipient. Right now this is in-app only — it
 * bumps `updated_at` so the row sorts to the top and shows as "Nudged
 * just now". Once SMTP (Resend) is wired up, this is the hook that
 * fires the reminder email; once push notifications exist, this is
 * where we'd enqueue a push.
 */
export async function nudgeInPersonRequest(requestId: string): Promise<
  { ok: true } | { error: string }
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: req } = await supabase
    .from('borrow_requests')
    .select('id, status, initiated_by, lender_id')
    .eq('id', requestId)
    .maybeSingle();
  if (!req) return { error: 'Request not found.' };
  if (req.lender_id !== user.id) return { error: 'Only the lender can nudge.' };
  if (req.initiated_by !== 'lender') return { error: "That isn't an in-person loan request." };
  if (req.status !== 'pending') return { error: `This request is already ${req.status}.` };

  const { error: upErr } = await supabase
    .from('borrow_requests')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (upErr) return { error: 'Could not nudge: ' + upErr.message };

  // TODO: send transactional email once Resend SMTP is configured.
  // TODO: enqueue a push notification once we have a push service.

  revalidatePath('/loans');
  return { ok: true };
}
