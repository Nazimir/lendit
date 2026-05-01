-- =====================================================================
-- LendIt — full database schema
-- Run this once in the Supabase SQL Editor.
-- =====================================================================

-- Extensions ----------------------------------------------------------
create extension if not exists "uuid-ossp";

-- =====================================================================
-- PROFILES
-- One row per signed-up user. Linked to Supabase's built-in auth.users.
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  photo_url text,
  suburb text not null,
  email text not null,
  phone text,
  reputation_score numeric(3,2) default 0.00,  -- avg of review stars, 0–5
  karma_points int default 0,                  -- +1 per completed loan as lender
  social_linked boolean default false,         -- phase 2
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index profiles_suburb_idx on public.profiles (suburb);

-- Auto-create a profile row when a new auth user signs up -------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, suburb, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', 'New user'),
    coalesce(new.raw_user_meta_data->>'suburb', ''),
    new.email,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- ITEMS
-- Things people are willing to lend.
-- =====================================================================
create table public.items (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  photos text[] not null default '{}',         -- public URLs in storage
  max_loan_days int not null check (max_loan_days > 0),
  extensions_allowed boolean not null default false,
  is_available boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index items_owner_idx on public.items (owner_id);
create index items_available_idx on public.items (is_available) where is_available = true;
-- Full text search on title + description
create index items_search_idx on public.items using gin (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
);

-- =====================================================================
-- BORROW REQUESTS
-- A borrower asking a lender for an item. 48 hour expiry.
-- =====================================================================
create type request_status as enum ('pending','accepted','declined','cancelled','expired');

create table public.borrow_requests (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references public.items(id) on delete cascade,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  lender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '',
  status request_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index br_borrower_idx on public.borrow_requests (borrower_id);
create index br_lender_idx on public.borrow_requests (lender_id);
create index br_item_idx on public.borrow_requests (item_id);
create index br_status_idx on public.borrow_requests (status);

-- =====================================================================
-- LOANS
-- Created when a borrow request is accepted. Tracks the full lifecycle.
-- =====================================================================
create type loan_status as enum (
  'pending_handover',  -- accepted, awaiting lender's handover photo
  'active',            -- handed over, clock running
  'pending_return',    -- borrower marked returned, awaiting lender's confirmation photo
  'completed',         -- both confirmed
  'disputed'           -- phase 2
);

create table public.loans (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references public.items(id) on delete restrict,
  borrower_id uuid not null references public.profiles(id) on delete restrict,
  lender_id uuid not null references public.profiles(id) on delete restrict,
  request_id uuid references public.borrow_requests(id) on delete set null,
  status loan_status not null default 'pending_handover',
  loan_period_days int not null,
  handover_photo_url text,
  handover_at timestamptz,
  due_at timestamptz,
  return_initiated_at timestamptz,
  return_photo_url text,
  completed_at timestamptz,
  extensions_used int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index loans_borrower_idx on public.loans (borrower_id);
create index loans_lender_idx on public.loans (lender_id);
create index loans_status_idx on public.loans (status);
create index loans_due_idx on public.loans (due_at);

-- =====================================================================
-- MESSAGES
-- Threads tied to either a borrow request or a loan.
-- =====================================================================
create type thread_kind as enum ('request','loan');

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  thread_kind thread_kind not null,
  thread_id uuid not null,           -- points at a borrow_requests.id or loans.id
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create index messages_thread_idx on public.messages (thread_kind, thread_id, created_at);
create index messages_sender_idx on public.messages (sender_id);

-- =====================================================================
-- REVIEWS
-- One per (loan, reviewer). Both sides leave one.
-- =====================================================================
create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text not null default '',
  created_at timestamptz default now(),
  unique (loan_id, reviewer_id)
);

create index reviews_reviewee_idx on public.reviews (reviewee_id);
create index reviews_loan_idx on public.reviews (loan_id);

-- Update reviewee's reputation score when a new review lands ---------
create or replace function public.recalc_reputation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles p
  set reputation_score = (
    select coalesce(round(avg(stars)::numeric, 2), 0)
    from public.reviews r where r.reviewee_id = p.id
  )
  where p.id = new.reviewee_id;
  return new;
end;
$$;

create trigger reviews_recalc_rep
  after insert on public.reviews
  for each row execute function public.recalc_reputation();

-- =====================================================================
-- DISPUTES (phase 2, table created now so it's ready)
-- =====================================================================
create type dispute_status as enum ('open','resolved');

create table public.disputes (
  id uuid primary key default uuid_generate_v4(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  opened_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status dispute_status not null default 'open',
  resolution_note text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- =====================================================================
-- BUSINESS LOGIC
-- =====================================================================

-- When a borrow_request is accepted: create a Loan, mark item unavailable,
-- and (per spec) cancel all OTHER pending requests by the same borrower
-- for the same item. (Same-item-multiple-lenders is rare since each item
-- has one owner, but we honour the spec literally.)
create or replace function public.on_request_accepted()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_max_days int;
  v_claimed uuid;
  v_loan_id uuid;
begin
  if new.status = 'accepted' and old.status = 'pending' then
    -- Atomically claim the item: this only succeeds if it's still available.
    update public.items
       set is_available = false, updated_at = now()
     where id = new.item_id and is_available = true
     returning id into v_claimed;

    if v_claimed is null then
      raise exception 'Item is no longer available';
    end if;

    select max_loan_days into v_max_days from public.items where id = new.item_id;

    insert into public.loans (item_id, borrower_id, lender_id, request_id, loan_period_days, status)
    values (new.item_id, new.borrower_id, new.lender_id, new.id, coalesce(v_max_days,7), 'pending_handover')
    returning id into v_loan_id;

    -- Migrate any messages attached to the request thread onto the loan thread,
    -- so the conversation continues in one place after acceptance.
    update public.messages
       set thread_kind = 'loan', thread_id = v_loan_id
     where thread_kind = 'request' and thread_id = new.id;

    -- Cancel sibling pending requests from same borrower for same item
    update public.borrow_requests
       set status = 'cancelled', updated_at = now()
     where item_id = new.item_id
       and borrower_id = new.borrower_id
       and status = 'pending'
       and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger borrow_requests_on_accept
  after update on public.borrow_requests
  for each row execute function public.on_request_accepted();

-- When a loan is completed: free the item, bump lender karma -----------
create or replace function public.on_loan_completed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    update public.items set is_available = true, updated_at = now() where id = new.item_id;
    update public.profiles set karma_points = karma_points + 1 where id = new.lender_id;
  end if;
  return new;
end;
$$;

create trigger loans_on_complete
  after update on public.loans
  for each row execute function public.on_loan_completed();

-- =====================================================================
-- ROW LEVEL SECURITY
-- Locks down what each user can read and write directly.
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.borrow_requests enable row level security;
alter table public.loans enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.disputes enable row level security;

-- Profiles: anyone signed in can read; only the owner can update.
create policy "profiles read for authenticated"
  on public.profiles for select
  to authenticated using (true);

create policy "profiles update self"
  on public.profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Items: anyone signed in can read available items; owner can read their own
-- regardless. Owner can insert/update/delete their own.
create policy "items read"
  on public.items for select
  to authenticated using (is_available = true or owner_id = auth.uid());

create policy "items insert own"
  on public.items for insert
  to authenticated with check (owner_id = auth.uid());

create policy "items update own"
  on public.items for update
  to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "items delete own"
  on public.items for delete
  to authenticated using (owner_id = auth.uid());

-- Borrow requests: borrower or lender can see; borrower can create;
-- lender can change status (accept/decline); borrower can cancel.
create policy "br read participants"
  on public.borrow_requests for select
  to authenticated using (auth.uid() in (borrower_id, lender_id));

create policy "br insert as borrower"
  on public.borrow_requests for insert
  to authenticated with check (auth.uid() = borrower_id);

create policy "br update participants"
  on public.borrow_requests for update
  to authenticated using (auth.uid() in (borrower_id, lender_id))
  with check (auth.uid() in (borrower_id, lender_id));

-- Loans: only borrower and lender can see/update.
create policy "loans read participants"
  on public.loans for select
  to authenticated using (auth.uid() in (borrower_id, lender_id));

create policy "loans update participants"
  on public.loans for update
  to authenticated using (auth.uid() in (borrower_id, lender_id))
  with check (auth.uid() in (borrower_id, lender_id));

-- Messages: only thread participants can read or insert.
-- We check participation via the parent row.
create policy "messages read"
  on public.messages for select
  to authenticated using (
    case thread_kind
      when 'request' then exists (
        select 1 from public.borrow_requests br
        where br.id = thread_id and auth.uid() in (br.borrower_id, br.lender_id))
      when 'loan' then exists (
        select 1 from public.loans l
        where l.id = thread_id and auth.uid() in (l.borrower_id, l.lender_id))
    end
  );

create policy "messages insert as participant"
  on public.messages for insert
  to authenticated with check (
    sender_id = auth.uid() and (
      case thread_kind
        when 'request' then exists (
          select 1 from public.borrow_requests br
          where br.id = thread_id and auth.uid() in (br.borrower_id, br.lender_id))
        when 'loan' then exists (
          select 1 from public.loans l
          where l.id = thread_id and auth.uid() in (l.borrower_id, l.lender_id))
      end
    )
  );

-- Reviews: anyone signed in can read; reviewer can insert only after the
-- linked loan is completed and only as a participant.
create policy "reviews read all"
  on public.reviews for select
  to authenticated using (true);

create policy "reviews insert as participant after completion"
  on public.reviews for insert
  to authenticated with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.loans l
      where l.id = loan_id
        and l.status = 'completed'
        and auth.uid() in (l.borrower_id, l.lender_id)
        and reviewee_id = case when auth.uid() = l.borrower_id then l.lender_id else l.borrower_id end
    )
  );

-- Disputes: participants only.
create policy "disputes read participants"
  on public.disputes for select
  to authenticated using (
    exists (select 1 from public.loans l where l.id = loan_id and auth.uid() in (l.borrower_id, l.lender_id))
  );

create policy "disputes insert as participant"
  on public.disputes for insert
  to authenticated with check (
    opened_by = auth.uid() and
    exists (select 1 from public.loans l where l.id = loan_id and auth.uid() in (l.borrower_id, l.lender_id))
  );

-- =====================================================================
-- REALTIME
-- Lets the app receive new messages live.
-- =====================================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.borrow_requests;
alter publication supabase_realtime add table public.loans;

-- =====================================================================
-- HELPER VIEW: items with owner snippet (used on the home feed)
-- security_invoker = true so it respects the caller's RLS policies.
-- =====================================================================
create or replace view public.items_with_owner with (security_invoker = true) as
select
  i.*,
  p.first_name as owner_first_name,
  p.suburb as owner_suburb,
  p.photo_url as owner_photo_url,
  p.reputation_score as owner_reputation
from public.items i
join public.profiles p on p.id = i.owner_id;

grant select on public.items_with_owner to authenticated;

-- =====================================================================
-- STORAGE BUCKETS + POLICIES
-- Creates the three public buckets and locks down writes.
-- =====================================================================

insert into storage.buckets (id, name, public)
values
  ('item-photos',    'item-photos',    true),
  ('profile-photos', 'profile-photos', true),
  ('loan-photos',    'loan-photos',    true)
on conflict (id) do nothing;

-- Item photos: users can write into their own user_id/* folder.
create policy "item-photos: owner can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "item-photos: owner can update"
  on storage.objects for update to authenticated
  using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "item-photos: owner can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Profile photos: same — folder = user id.
create policy "profile-photos: owner can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profile-photos: owner can update"
  on storage.objects for update to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profile-photos: owner can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Loan photos: only participants in the loan can upload.
create policy "loan-photos: participants can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'loan-photos'
    and exists (
      select 1 from public.loans l
      where l.id::text = (storage.foldername(name))[1]
        and auth.uid() in (l.borrower_id, l.lender_id)
    )
  );
