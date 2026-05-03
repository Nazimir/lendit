-- =====================================================================
-- Lend-in-person: RLS policies
--
-- Two flows need to bypass the standard "only borrower can insert" rule:
--
--   1. Direct path (lend/actions.ts → createLending)
--      The lender inserts a borrow_request directly because they know the
--      recipient personally and have already handed over the item.
--
--   2. Invite path (invite/[token]/page.tsx → claimInvite)
--      The recipient signs up via an invite link and inserts as borrower.
--      They may not be phone-verified yet — that's fine, the lender already
--      vouched for them by generating the invite.
--
-- In both cases the trust comes from the real-world handover, not the app,
-- so we don't require the borrower to be phone-verified.
-- =====================================================================

-- 1. Lender can insert when they are the lender (direct path)
drop policy if exists "br insert as lender for in-person" on public.borrow_requests;

create policy "br insert as lender for in-person"
  on public.borrow_requests for insert
  to authenticated with check (
    auth.uid() = lender_id
    and coalesce(
      (select phone_verified from public.profiles where id = auth.uid()),
      false
    ) = true
  );

-- 2. Borrower can insert via a matching pending invite (invite path)
-- This allows someone who hasn't verified their phone yet to claim a loan
-- the lender has already prepared for them.
drop policy if exists "br insert as borrower via invite" on public.borrow_requests;

create policy "br insert as borrower via invite"
  on public.borrow_requests for insert
  to authenticated with check (
    auth.uid() = borrower_id
    and exists (
      select 1 from public.lend_invites li
      where li.lender_id = borrow_requests.lender_id
        and li.item_id   = borrow_requests.item_id
        and li.status    = 'pending'
        and li.expires_at > now()
    )
  );
