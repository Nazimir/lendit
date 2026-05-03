-- =====================================================================
-- search_items_fuzzy(terms text[])
-- Typo-tolerant + synonym-aware search across items.
--
-- Called from the home page like:
--   supabase.rpc('search_items_fuzzy', { terms: ['glasses','spectacles',...] })
--
-- Returns rows shaped like the items_with_owner view, so the frontend
-- can treat them as ItemWithOwner[].
--
-- Match logic:
--   1. Substring (ilike) on title or description       — exact / partial hit
--   2. Trigram word_similarity on title  > 0.25        — typo tolerance
--   3. Trigram word_similarity on description > 0.35   — broader fallback
--
-- Items the caller can't see are filtered by RLS automatically because
-- the function runs as security invoker.
-- =====================================================================

create extension if not exists pg_trgm;

drop function if exists public.search_items_fuzzy(text[]);

create or replace function public.search_items_fuzzy(terms text[])
returns setof public.items_with_owner
language sql
stable
security invoker
set search_path = public
as $$
  select v.*
  from public.items_with_owner v,
  lateral (
    select
      exists (
        select 1 from unnest(terms) as t
        where length(t) > 0
          and (lower(v.title)       like '%' || lower(t) || '%'
            or lower(v.description) like '%' || lower(t) || '%')
      ) as has_sub,
      coalesce((
        select max(word_similarity(lower(t), lower(v.title)))
        from unnest(terms) as t where length(t) > 0
      ), 0) as t_score,
      coalesce((
        select max(word_similarity(lower(t), lower(v.description)))
        from unnest(terms) as t where length(t) > 0
      ), 0) as d_score
  ) s
  where s.has_sub or s.t_score > 0.25 or s.d_score > 0.35
  order by s.has_sub desc, (s.t_score * 2 + s.d_score) desc, v.created_at desc
  limit 60;
$$;

grant execute on function public.search_items_fuzzy(text[]) to authenticated;

-- Trigram indexes to keep this fast as the catalogue grows
create index if not exists items_title_trgm on public.items using gin (lower(title) gin_trgm_ops);
create index if not exists items_desc_trgm  on public.items using gin (lower(description) gin_trgm_ops);
