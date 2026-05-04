-- =====================================================================
-- Add a "visibility" column to items so owners can keep some listings
-- private. Private items are visible only to:
--   - the owner
--   - someone with an active loan of the item (so loan / messages pages
--     can still load the item details on the borrower's side)
--
-- Useful for: tracking items you've lent in person to friends without
-- exposing them to the broader community feed.
-- =====================================================================

alter table public.items
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private'));

create index if not exists items_visibility_idx
  on public.items (visibility);

-- Replace the broad "items read all" SELECT policy with one that
-- respects visibility.
drop policy if exists "items read all" on public.items;
drop policy if exists "items read public own or borrowed" on public.items;

create policy "items read public own or borrowed"
  on public.items for select
  to authenticated using (
    visibility = 'public'
    or owner_id = auth.uid()
    or exists (
      select 1 from public.loans l
      where l.item_id = items.id
        and l.borrower_id = auth.uid()
        and l.status in ('pending_handover', 'active', 'pending_return')
    )
  );
