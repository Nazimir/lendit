-- =====================================================================
-- Phase F.2 — automation
--
-- Enables pg_cron, adds an away_until column to profiles, and schedules
-- two hourly background jobs:
--
--   1. expire_old_borrow_requests() — flips pending → expired after 48h
--   2. auto_cancel_stuck_handovers() — cancels pending_handover loans
--      that have been sitting for 7+ days. The on_loan_cancelled trigger
--      from F.1 frees the item back to the catalogue.
--
-- Both jobs SKIP loans/requests where the lender is currently in away
-- mode (away_until > now()). When the lender comes back, the timers
-- effectively resume from where they stopped.
--
-- NO auto-completion of pending_return is included. That's parked until
-- real-world usage tells us it's worth the risk.
-- =====================================================================

-- 1. Enable pg_cron ----------------------------------------------------
create extension if not exists pg_cron with schema extensions;

-- 2. Away mode column on profiles -------------------------------------
alter table public.profiles
  add column if not exists away_until timestamptz;

-- 3. Auto-expire stale borrow requests --------------------------------
create or replace function public.expire_old_borrow_requests()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.borrow_requests br
  set status = 'expired', updated_at = now()
  where br.status = 'pending'
    and br.expires_at < now()
    and not exists (
      select 1 from public.profiles p
      where p.id = br.lender_id
        and p.away_until is not null
        and p.away_until > now()
    );
end;
$$;

-- 4. Auto-cancel pending_handover loans older than 7 days -------------
-- Posts a chat message from the lender's id with a clear "[Auto-cancelled
-- by system]" prefix so the borrower understands why the loan vanished.
-- The on_loan_cancelled trigger frees the item.
create or replace function public.auto_cancel_stuck_handovers()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan record;
begin
  for v_loan in
    select l.id, l.lender_id, l.borrower_id, l.item_id
    from public.loans l
    where l.status = 'pending_handover'
      and l.created_at < now() - interval '7 days'
      and not exists (
        select 1 from public.profiles p
        where p.id = l.lender_id
          and p.away_until is not null
          and p.away_until > now()
      )
  loop
    update public.loans
      set status = 'cancelled', updated_at = now()
      where id = v_loan.id;

    insert into public.messages (sender_id, recipient_id, body, context_item_id)
    values (
      v_loan.lender_id,
      v_loan.borrower_id,
      '[Auto-cancelled by system] This loan was cancelled because the handover did not happen within 7 days of acceptance. The item is back in the lender''s catalogue.',
      v_loan.item_id
    );
  end loop;
end;
$$;

-- 5. Schedule the cron job (hourly, on the hour) ----------------------
-- Unschedule any existing copy first so re-running this migration is safe.
do $$
begin
  perform cron.unschedule('lendit-lifecycle');
exception when others then
  -- ignore if it wasn't scheduled
  null;
end;
$$;

select cron.schedule(
  'lendit-lifecycle',
  '0 * * * *',  -- every hour, on the hour
  $cron$
    select public.expire_old_borrow_requests();
    select public.auto_cancel_stuck_handovers();
  $cron$
);
