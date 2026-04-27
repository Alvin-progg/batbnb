-- Supabase Auth login rate limiter
-- Allows max 5 failed sign-in attempts per email in a 60-second window.
-- Use this if your database is already initialized and you only want to add rate limiting.

create table if not exists public.auth_login_attempts (
  email text primary key,
  attempt_count integer not null default 0,
  first_attempt_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists auth_login_attempts_blocked_until_idx
  on public.auth_login_attempts (blocked_until);

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
