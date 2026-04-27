-- BatBnB base schema for Supabase
-- Run this in Supabase SQL Editor (or via supabase db push) before seeding.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'listing_status'
      and n.nspname = 'public'
  ) then
    create type public.listing_status as enum ('draft', 'active', 'archived');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'chat_role'
      and n.nspname = 'public'
  ) then
    create type public.chat_role as enum ('renter', 'owner', 'system');
  end if;
end
$$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  monthly_rent integer not null check (monthly_rent > 0),
  location text not null,
  latitude double precision not null,
  longitude double precision not null,
  meta text,
  status public.listing_status not null default 'active',
  owner_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  author_id uuid references public.users (id) on delete set null,
  author_label text not null,
  review_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_listings (
  user_id uuid not null references public.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  renter_id uuid not null references public.users (id) on delete cascade,
  owner_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint chat_thread_unique_per_listing_and_renter
    unique (listing_id, renter_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  sender_id uuid references public.users (id) on delete set null,
  role public.chat_role not null default 'system',
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_login_attempts (
  email text primary key,
  attempt_count integer not null default 0,
  first_attempt_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_monthly_rent_idx on public.listings (monthly_rent);
create index if not exists listings_slug_idx on public.listings (slug);
create index if not exists listing_images_listing_id_idx on public.listing_images (listing_id);
create index if not exists listing_reviews_listing_id_idx on public.listing_reviews (listing_id);
create index if not exists chat_threads_listing_id_idx on public.chat_threads (listing_id);
create index if not exists chat_messages_thread_id_idx on public.chat_messages (thread_id);
create index if not exists auth_login_attempts_blocked_until_idx on public.auth_login_attempts (blocked_until);

create or replace function public.check_login_rate_limit(p_email text)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  attempts_left integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_row public.auth_login_attempts%rowtype;
begin
  if v_email = '' then
    return query
    select true, 0, 5;
    return;
  end if;

  select *
  into v_row
  from public.auth_login_attempts
  where email = v_email;

  if not found then
    return query
    select true, 0, 5;
    return;
  end if;

  if v_row.blocked_until is not null and v_row.blocked_until > v_now then
    return query
    select
      false,
      greatest(1, ceil(extract(epoch from (v_row.blocked_until - v_now)))::integer),
      0;
    return;
  end if;

  if v_row.first_attempt_at + interval '60 seconds' <= v_now then
    return query
    select true, 0, 5;
    return;
  end if;

  return query
  select true, 0, greatest(0, 5 - v_row.attempt_count);
end;
$$;

create or replace function public.record_login_attempt(
  p_email text,
  p_success boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_row public.auth_login_attempts%rowtype;
begin
  if v_email = '' then
    return;
  end if;

  insert into public.auth_login_attempts (email, attempt_count, first_attempt_at, blocked_until, updated_at)
  values (v_email, 0, v_now, null, v_now)
  on conflict (email) do nothing;

  select *
  into v_row
  from public.auth_login_attempts
  where email = v_email
  for update;

  if p_success then
    update public.auth_login_attempts
    set
      attempt_count = 0,
      first_attempt_at = v_now,
      blocked_until = null,
      updated_at = v_now
    where email = v_email;
    return;
  end if;

  if v_row.first_attempt_at + interval '60 seconds' <= v_now then
    update public.auth_login_attempts
    set
      attempt_count = 1,
      first_attempt_at = v_now,
      blocked_until = null,
      updated_at = v_now
    where email = v_email;
    return;
  end if;

  if v_row.attempt_count + 1 >= 5 then
    update public.auth_login_attempts
    set
      attempt_count = v_row.attempt_count + 1,
      blocked_until = v_now + interval '60 seconds',
      updated_at = v_now
    where email = v_email;
    return;
  end if;

  update public.auth_login_attempts
  set
    attempt_count = v_row.attempt_count + 1,
    updated_at = v_now
  where email = v_email;
end;
$$;

revoke all on public.auth_login_attempts from anon, authenticated;
grant execute on function public.check_login_rate_limit(text) to anon, authenticated;
grant execute on function public.record_login_attempt(text, boolean) to anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_touch_updated_at on public.listings;
create trigger listings_touch_updated_at
before update on public.listings
for each row
execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.listing_reviews enable row level security;
alter table public.saved_listings enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

-- users
create policy "Users can read all profiles"
on public.users
for select
to authenticated
using (true);

create policy "Users can update their own profile"
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- listings
create policy "Anyone can read active listings"
on public.listings
for select
using (status = 'active');

create policy "Owners can manage their own listings"
on public.listings
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- listing images
create policy "Anyone can read listing images"
on public.listing_images
for select
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id and l.status = 'active'
  )
);

create policy "Owners can manage images for their listings"
on public.listing_images
for all
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
);

-- listing reviews
create policy "Anyone can read reviews for active listings"
on public.listing_reviews
for select
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id and l.status = 'active'
  )
);

create policy "Authenticated users can create reviews"
on public.listing_reviews
for insert
to authenticated
with check (author_id = auth.uid() or author_id is null);

create policy "Review authors can edit their own reviews"
on public.listing_reviews
for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "Review authors can delete their own reviews"
on public.listing_reviews
for delete
to authenticated
using (author_id = auth.uid());

-- saved listings
create policy "Users can read their saved listings"
on public.saved_listings
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can manage their saved listings"
on public.saved_listings
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- chat threads
create policy "Thread participants can read threads"
on public.chat_threads
for select
to authenticated
using (auth.uid() in (owner_id, renter_id));

create policy "Participants can create their own thread"
on public.chat_threads
for insert
to authenticated
with check (auth.uid() in (owner_id, renter_id));

-- chat messages
create policy "Thread participants can read messages"
on public.chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and auth.uid() in (t.owner_id, t.renter_id)
  )
);

create policy "Thread participants can send messages"
on public.chat_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and auth.uid() in (t.owner_id, t.renter_id)
  )
  and (sender_id = auth.uid() or sender_id is null)
);
