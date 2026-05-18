-- =====================================================================
-- IN-PERSON LOAN ACCEPTANCE
--
-- Closes a trust hole in the in-person lend flow. Previously, the lender
-- could create a loan against another user's account in a single tap
-- (the request was auto-accepted on the lender's side and a loan was
-- created in pending_handover). The borrower had no chance to confirm
-- they actually received the item — meaning a lender could fabricate
-- karma, lent count, and even reviews against the borrower's account.
--
-- New flow: when the lender taps "Lend in person" with an email that
-- matches an existing Partaz user, we still create a borrow_request,
-- but we mark it as `initiated_by = 'lender'` and leave the status as
-- 'pending'. The borrower sees an "Awaiting your confirmation" entry
-- on /loans and can Accept or Decline. The existing F.2 expiry job
-- (expire_old_borrow_requests) handles 48-hour timeouts uniformly,
-- since this is still a pending borrow_request.
--
-- When the borrower accepts (request → 'accepted'), the existing
-- on_request_accepted trigger creates the loan in pending_handover,
-- and the rest of the loan lifecycle continues as today.
-- =====================================================================

-- 1. Column ----------------------------------------------------------
alter table public.borrow_requests
  add column if not exists initiated_by text not null default 'borrower'
    check (initiated_by in ('borrower', 'lender'));

create index if not exists br_initiated_by_idx
  on public.borrow_requests (initiated_by);

-- Existing requests stay as 'borrower'-initiated (the default).
-- No backfill needed.
