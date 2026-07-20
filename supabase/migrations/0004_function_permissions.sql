-- Harden SECURITY DEFINER function exposure reported by Supabase Security
-- Advisor checks 0028/0029. Issue #321.
--
-- The seven capability-token RPCs from 0001 intentionally remain callable by
-- anon + authenticated: their high-entropy token / GM-key arguments ARE the
-- authorization boundary, and signed-in browsers may still open guest links.
-- Everything else follows least privilege:
--   * internal + trigger-only functions are not API-callable;
--   * RLS helpers live in an unexposed schema;
--   * authenticated live patching runs as the caller and therefore under RLS;
--   * future public functions start with no implicit API execution grant.
--
-- Apply AFTER 0003_updated_at_trigger.sql.

-- ── Unexposed RLS helpers ────────────────────────────────────────────────────

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.caller_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function private.is_gm_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.caller_role() in ('gm', 'admin'), false)
$$;

revoke execute on function private.caller_role(), private.is_gm_or_admin()
  from public, anon, authenticated;
grant execute on function private.caller_role(), private.is_gm_or_admin()
  to authenticated;

-- Repoint every policy before removing the exposed public helpers.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or private.is_gm_or_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated
  using (private.caller_role() = 'admin')
  with check (private.caller_role() = 'admin');

drop policy if exists chars_select on public.characters;
create policy chars_select on public.characters for select to authenticated
  using (
    owner_user_id = auth.uid()
    or assigned_player_id = auth.uid()
    or private.is_gm_or_admin()
  );

drop policy if exists chars_insert on public.characters;
create policy chars_insert on public.characters for insert to authenticated
  with check (
    private.is_gm_or_admin()
    or owner_user_id = auth.uid()
  );

drop policy if exists chars_update on public.characters;
create policy chars_update on public.characters for update to authenticated
  using (
    owner_user_id = auth.uid()
    or assigned_player_id = auth.uid()
    or private.is_gm_or_admin()
  )
  with check (
    private.is_gm_or_admin()
    or owner_user_id = auth.uid()
  );

drop policy if exists chars_delete on public.characters;
create policy chars_delete on public.characters for delete to authenticated
  using (owner_user_id = auth.uid() or private.is_gm_or_admin());

-- Trigger-only role guard: keep definer semantics, remove direct API execution.
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and coalesce(private.caller_role(), 'player') <> 'admin' then
    raise exception 'only an admin may change a role';
  end if;
  return new;
end
$$;

-- Atomic authenticated live updates need one SQL statement, not owner-level
-- privilege. SECURITY INVOKER makes the existing characters RLS policies the
-- authoritative access check.
create or replace function public.patch_live_by_id(p_id uuid, p_patch jsonb)
returns table (live jsonb, live_rev bigint, updated_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  update public.characters c
     set live = c.live || p_patch,
         live_rev = c.live_rev + 1,
         updated_at = now()
   where c.id = p_id
  returning c.live, c.live_rev, c.updated_at;
end
$$;

-- The policies and trigger now use private helpers; remove their exposed
-- predecessors rather than leaving callable aliases behind.
drop function if exists public.is_gm_or_admin();
drop function if exists public.caller_role();

-- ── Explicit execution matrix ────────────────────────────────────────────────

-- Internal helpers and trigger functions are invoked only by owner-context
-- functions/triggers. Direct REST RPC execution is unnecessary.
revoke execute on function
  public._h(text),
  public._mint_token(),
  public.handle_new_user(),
  public.guard_role_change()
from public, anon, authenticated;

-- Authenticated atomic update; never anonymous.
revoke execute on function public.patch_live_by_id(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.patch_live_by_id(uuid, jsonb)
  to authenticated;

-- Intentional capability API. Reset inherited/drifted grants, then state the
-- supported callers explicitly. These remain expected Advisor warnings.
revoke execute on function
  public.create_character(text, text, jsonb, jsonb),
  public.get_character(text),
  public.update_character_data(text, text, jsonb, bigint),
  public.patch_live(text, jsonb),
  public.list_characters(text),
  public.rotate_token(text, uuid),
  public.delete_character(text, uuid)
from public, anon, authenticated;

grant execute on function
  public.create_character(text, text, jsonb, jsonb),
  public.get_character(text),
  public.update_character_data(text, text, jsonb, bigint),
  public.patch_live(text, jsonb),
  public.list_characters(text),
  public.rotate_token(text, uuid),
  public.delete_character(text, uuid)
to anon, authenticated;

-- PostgreSQL grants function execution to PUBLIC by default. Make future
-- functions opt-in for the role applying this migration. This must be a global
-- default: PostgreSQL schema-specific defaults can add privileges but cannot
-- subtract the built-in global PUBLIC execute grant.
alter default privileges
  revoke execute on functions from public, anon, authenticated;
