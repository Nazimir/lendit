'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

interface LendPayload {
  title: string;
  description: string;
  category: string;
  loan_period_days: number;
  photo_urls: string[];
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

  const title = payload.title.trim();
  const recipient_email = payload.recipient_email.trim().toLowerCase();
  if (!title) return { error: 'Title is required.' };
  if (payload.photo_urls.length === 0) return { error: 'Add at least one photo.' };
  if (payload.loan_period_days < 1) return { error: 'Loan period must be at least 1 day.' };

  // 1. Create the item, marked unavailable up-front (we're handing it over now).
  const { data: itemRow, error: itemErr } = await supabase
    .from('items')
    .insert({
      owner_id: user.id,
      title,
      description: payload.description.trim() || 'In-person loan.',
      category: payload.category,
      photos: payload.photo_urls,
      max_loan_days: payload.loan_period_days,
      extensions_allowed: true,
      is_available: false
    })
    .select('id')
    .single();
  if (itemErr || !itemRow) return { error: 'Could not create the listing: ' + (itemErr?.message || 'unknown') };
  const itemId = itemRow.id as string;

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
