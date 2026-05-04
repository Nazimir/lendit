-- =====================================================================
-- Drop the phone-verification requirement from the lend-in-person RLS
-- policy while the SMS provider is unavailable in Mauritius.
--
-- This re-creates "br insert as lender for in-person" without the
-- phone_verified check. When the SMS provider is reliable again, run
-- the original lend_in_person_rls.sql to put the check back.
-- =====================================================================

drop policy if exists "br insert as lender for in-person" on public.borrow_requests;

create policy "br insert as lender for in-person"
  on public.borrow_requests for insert
  to authenticated with check (
    auth.uid() = lender_id
  );
