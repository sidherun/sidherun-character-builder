-- Sidherun multi-user auth & roles — adds an AUTHENTICATED access plane on top
-- of the sealed capability-token plane from 0001_init.sql. Epic #109.
--
-- Two access planes coexist:
--   1. GUEST (unchanged):  anon role, no table grants, access ONLY via the seven
--      SECURITY DEFINER RPCs from 0001 keyed on capability token / GM key.
--      QR / #c= / #play= printout links keep working with no login.
--   2. AUTHENTICATED (new): real Supabase Auth users get DIRECT table access
--      scoped by RLS policies on auth.uid() + their role (player|gm|admin).
--
-- A SECURITY DEFINER function bypasses RLS, so the guest RPCs are unaffected by
-- the policies added here. We grant table DML to `authenticated` ONLY, never to
-- `anon` — the guest plane stays sealed.
--
-- Apply: paste into the Supabase SQL Editor (or `supabase db push`) AFTER 0001.

create extension if not exists pgcrypto with schema extensions;

-- ── roles + profiles ─────────────────────────────────────────────────────────
do $$ begin
  create type public.user_role as enum ('player', 'gm', 'admin');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text not null default '',
  role         public.user_role not null default 'player',
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Auto-create a profile row when a user signs up (magic link).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── role readers (SECURITY DEFINER → read profiles WITHOUT RLS recursion) ─────
-- An RLS policy on `profiles` must never `select profiles` directly (infinite
-- recursion). These definer helpers read it with RLS bypassed.
create or replace function public.caller_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_gm_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.caller_role() in ('gm', 'admin'), false)
$$;

-- ── role-escalation guard ─────────────────────────────────────────────────────
-- The self-update policy below lets a user edit their own profile (display_name).
-- Without this, a player could set their own role to 'admin'. Only an admin may
-- change a role.
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and coalesce(public.caller_role(), 'player') <> 'admin' then
    raise exception 'only an admin may change a role';
  end if;
  return new;
end
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_role_change();

-- ── profiles policies ─────────────────────────────────────────────────────────
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_gm_or_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.caller_role() = 'admin') with check (public.caller_role() = 'admin');

-- ── characters: ownership columns ────────────────────────────────────────────
-- owner_user_id      = who created/holds the row (a self-signed-up player, or
--                      the GM when creating on a player's behalf).
-- assigned_player_id = the player a GM grants edit access to (without transfer).
-- A player may edit if they are EITHER the owner OR the assignee.
alter table public.characters
  add column if not exists owner_user_id      uuid references auth.users(id) on delete set null,
  add column if not exists assigned_player_id uuid references auth.users(id) on delete set null;

create index if not exists characters_owner_user_idx on public.characters(owner_user_id);
create index if not exists characters_assigned_idx    on public.characters(assigned_player_id);

-- Authenticated-created rows have no capability token until a guest link is
-- minted, so these become nullable. The guest RPCs still set them for token rows.
alter table public.characters alter column token_hash drop not null;
alter table public.characters alter column owner_hash drop not null;

-- ── characters: authenticated RLS plane ──────────────────────────────────────
-- Grant DML to `authenticated` ONLY. `anon` stays sealed (guest RPCs only).
grant select, insert, update, delete on public.characters to authenticated;

drop policy if exists chars_select on public.characters;
create policy chars_select on public.characters for select to authenticated
  using (
    owner_user_id = auth.uid()
    or assigned_player_id = auth.uid()
    or public.is_gm_or_admin()
  );

-- A player may create only rows they own; gm/admin may create on anyone's behalf.
drop policy if exists chars_insert on public.characters;
create policy chars_insert on public.characters for insert to authenticated
  with check (
    public.is_gm_or_admin()
    or owner_user_id = auth.uid()
  );

-- Owner, assignee, or gm/admin may update. with_check stops a player re-pointing
-- ownership away from themselves; only gm/admin may reassign.
drop policy if exists chars_update on public.characters;
create policy chars_update on public.characters for update to authenticated
  using (
    owner_user_id = auth.uid()
    or assigned_player_id = auth.uid()
    or public.is_gm_or_admin()
  )
  with check (
    public.is_gm_or_admin()
    or owner_user_id = auth.uid()
  );

-- Owner or gm/admin may delete (a mere assignee cannot).
drop policy if exists chars_delete on public.characters;
create policy chars_delete on public.characters for delete to authenticated
  using (owner_user_id = auth.uid() or public.is_gm_or_admin());

-- ── live counters for authenticated users (atomic server-side field merge) ────
-- Parity with the guest patch_live RPC, but keyed on row id + RLS-equivalent
-- ownership check instead of a capability token. SECURITY DEFINER for the atomic
-- `live || patch` merge; the WHERE clause re-implements the chars_update check.
create or replace function public.patch_live_by_id(p_id uuid, p_patch jsonb)
returns table (live jsonb, live_rev bigint, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.characters c
     set live = c.live || p_patch,
         live_rev = c.live_rev + 1,
         updated_at = now()
   where c.id = p_id
     and (
       c.owner_user_id = auth.uid()
       or c.assigned_player_id = auth.uid()
       or public.is_gm_or_admin()
     )
  returning c.live, c.live_rev, c.updated_at;
end
$$;

revoke execute on function public.patch_live_by_id(uuid, jsonb) from public;
grant   execute on function public.patch_live_by_id(uuid, jsonb) to authenticated;

-- The new role helpers are called by policies (running as the policy owner); do
-- not expose them to anon. authenticated may call them for client-side gating.
revoke execute on function public.caller_role(), public.is_gm_or_admin() from public;
grant   execute on function public.caller_role(), public.is_gm_or_admin() to authenticated;

-- ── realtime ──────────────────────────────────────────────────────────────────
-- Allow authenticated clients to subscribe to row changes. The existing
-- client-side broadcast channel `char:<id>` (cloudSync.js) is unaffected.
do $$ begin
  alter publication supabase_realtime add table public.characters;
exception when duplicate_object then null; end $$;

-- ── one-time ops (run manually in the SQL editor — NOT part of the migration) ─
-- After Ed signs in once (his profile is auto-created), make him admin and adopt
-- the 13 pre-existing token-plane characters so they show in the authenticated
-- roster. Replace the email if needed.
--
--   update public.profiles set role = 'admin' where email = 'sidhedroia@gmail.com';
--
--   update public.characters
--      set owner_user_id = (select id from public.profiles where email = 'sidhedroia@gmail.com')
--    where owner_user_id is null;
--
-- Ed then reassigns each character to its player via the GM Screen picker.
