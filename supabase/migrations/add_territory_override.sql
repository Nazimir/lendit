-- =====================================================================
-- Add `territory_override` to profiles so users can pick (or randomise)
-- their personal colour instead of accepting the hash-derived default.
--
-- NULL = use hash-based territory (default behaviour).
-- Any other value = use this exact category name as the user's territory.
-- =====================================================================

alter table public.profiles
  add column if not exists territory_override text;
