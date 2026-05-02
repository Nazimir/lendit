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
  | { ok: true; mode: 'direct'; loan_id: string }
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
        is_available: false
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
    // 3a. Direct path — create a borrow request that's already accepted, which
    // triggers loan creation via the on_request_accepted trigger.
    const { data: req, error: reqErr } = await supabase
      .from('borrow_requests')
      .insert({
        item_id: itemId,
        borrower_id: recipientId,
        lender_id: user.id,
        message: `Lent in person — ${payload.loan_period_days}-day loan.`,
        status: 'pending'
      })
      .select('id')
      .single();
    if (reqErr || !req) return { error: 'Could not start the loan: ' + (reqErr?.message || 'unknown') };

    const { error: acceptErr } = await supabase
      .from('borrow_requests')
      .update({ status: 'accepted' })
      .eq('id', req.id);
    if (acceptErr) return { error: 'Could not accept the loan: ' + acceptErr.message };

    const { data: createdLoan } = await supabase
      .from('loans')
      .select('id')
      .eq('request_id', req.id)
      .maybeSingle();

    revalidatePath('/listings');
    revalidatePath('/loans');
    return { ok: true, mode: 'direct', loan_id: (createdLoan?.id as string) || '' };
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
