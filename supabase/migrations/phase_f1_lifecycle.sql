-- =====================================================================
-- Phase F.1 — stuck-loan escape hatches
--
-- New loan states:
--   'cancelled' — the loan ended before handover. Item freed.
--   'lost'      — the loan was handed over but never returned. Item stays
--                 marked unavailable; admin sets this from a dispute.
--
-- Plus admin RLS so admins can read & resolve disputes from the
-- moderation queue.
--
-- IMPORTANT: ALTER TYPE ... ADD VALUE cannot run inside a transaction.
-- If Supabase's SQL editor wraps your script in one, run the
-- 'alter type' lines on their own first, then run the rest.
-- =====================================================================

-- 1. New loan statuses ------------------------------------------------
alter type loan_status add value if not exists 'cancelled';
alter type loan_status add value if not exists 'lost';

-- 2. When a loan transitions to 'cancelled', free the item back to the
--    catalogue. No karma — this is not a successful loan.
create or replace function public.on_loan_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.items
      set is_available = true, updated_at = now()
      where id = new.item_id;
  end if;
  return new;
end;
$$;

drop trigger if exists loans_on_cancelled on public.loans;
create trigger loans_on_cancelled
  after update on public.loans
  for each row execute function public.on_loan_cancelled();

-- 3. When a loan is marked 'lost', the item is gone for good. Keep it
--    unavailable. We don't grant karma. Reputation impact for the
--    borrower can come later when we have a richer reputation model.
create or replace function public.on_loan_lost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'lost' and old.status <> 'lost' then
    update public.items
      set is_available = false, updated_at = now()
      where id = new.item_id;
  end if;
  return new;
end;
$$;

drop trigger if exists loans_on_lost on public.loans;
create trigger loans_on_lost
  after update on public.loans
  for each row execute function public.on_loan_lost();

-- 4. Admin can read & update all disputes (for the moderation queue).
drop policy if exists "disputes admin read all" on public.disputes;
create policy "disputes admin read all"
  on public.disputes for select
  to authenticated using (
    coalesce((select is_admin from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "disputes admin update" on public.disputes;
create policy "disputes admin update"
  on public.disputes for update
  to authenticated using (
    coalesce((select is_admin from public.profiles where id = auth.uid()), false)
  );

-- 5. Admin can read & update all loans (resolving disputes requires
--    setting status to 'completed' or 'lost').
drop policy if exists "loans admin read" on public.loans;
create policy "loans admin read"
  on public.loans for select
  to authenticated using (
    coalesce((select is_admin from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "loans admin update" on public.loans;
create policy "loans admin update"
  on public.loans for update
  to authenticated using (
    coalesce((select is_admin from public.profiles where id = auth.uid()), false)
  );

-- 6. Update the items SELECT policy so:
--    - borrowers of disputed loans can still see the item
--    - admins can read every item (incl. private ones) for moderation
drop policy if exists "items read public own or borrowed" on public.items;
drop policy if exists "items read public own or borrowed or admin" on public.items;

create policy "items read public own or borrowed or admin"
  on public.items for select
  to authenticated using (
    visibility = 'public'
    or owner_id = auth.uid()
    or exists (
      select 1 from public.loans l
      where l.item_id = items.id
        and l.borrower_id = auth.uid()
        and l.status in ('pending_handover', 'active', 'pending_return', 'disputed')
    )
    or coalesce((select is_admin from public.profiles where id = auth.uid()), false)
  );
