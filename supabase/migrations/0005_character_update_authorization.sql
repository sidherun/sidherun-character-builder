-- Fix authenticated character UPDATE authorization. Issue #331.
--
-- 0002/0004 admitted assigned players in USING, then rejected their ordinary
-- edits in WITH CHECK unless they changed owner_user_id to themselves. Because
-- authenticated also held a table-wide UPDATE grant, ownership, assignment,
-- capability hashes, and revision counters were exposed to direct mutation.
--
-- Keep row visibility in RLS and enforce OLD-vs-NEW invariants in a trigger:
-- RLS cannot compare those values. Character content remains editable by an
-- owner or assignee; only gm/admin may change protected columns. Revision
-- counters are server-maintained for direct authenticated writes.
--
-- Capability-token RPCs remain SECURITY DEFINER and unchanged. Their function
-- owner is the SQL current_user while they execute, so the direct-client guard
-- does not interfere with token/GM-key authorization or revision handling.
--
-- Apply AFTER 0004_function_permissions.sql.

create or replace function public.guard_character_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- PostgREST direct-table writes run as `authenticated`. Trusted backend and
  -- SECURITY DEFINER capability functions retain their existing behavior.
  if current_user = 'authenticated'
     and auth.uid() is not null
     and not private.is_gm_or_admin() then
    if new.owner_user_id is distinct from old.owner_user_id
       or new.assigned_player_id is distinct from old.assigned_player_id then
      raise exception 'only a gm or admin may change character ownership or assignment'
        using errcode = '42501';
    end if;

    if new.token_hash is distinct from old.token_hash
       or new.owner_hash is distinct from old.owner_hash then
      raise exception 'capability fields cannot be changed directly'
        using errcode = '42501';
    end if;

    if new.data_rev is distinct from old.data_rev
       or new.live_rev is distinct from old.live_rev then
      raise exception 'revision fields are maintained by the database'
        using errcode = '42501';
    end if;
  end if;

  -- Direct authenticated callers submit content only. Increment revisions in
  -- the same statement so optimistic-concurrency guards remain atomic.
  if current_user = 'authenticated' then
    if new.name is distinct from old.name or new.data is distinct from old.data then
      new.data_rev := old.data_rev + 1;
    end if;
    if new.live is distinct from old.live then
      new.live_rev := old.live_rev + 1;
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists characters_guard_update on public.characters;
create trigger characters_guard_update
  before update on public.characters
  for each row execute function public.guard_character_update();

revoke execute on function public.guard_character_update()
  from public, anon, authenticated;

-- Owner, assignee, or gm/admin may update a row that remains in their scope.
-- The trigger above prevents a non-GM from changing the columns that define
-- that scope, closing the ownership-takeover path without blocking assignees.
drop policy if exists chars_update on public.characters;
create policy chars_update on public.characters for update to authenticated
  using (
    owner_user_id = auth.uid()
    or assigned_player_id = auth.uid()
    or private.is_gm_or_admin()
  )
  with check (
    owner_user_id = auth.uid()
    or assigned_player_id = auth.uid()
    or private.is_gm_or_admin()
  );

-- The authenticated live RPC runs as the caller under RLS. Let the trigger
-- maintain live_rev so clients never need permission to submit revision data.
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
         updated_at = now()
   where c.id = p_id
  returning c.live, c.live_rev, c.updated_at;
end
$$;

revoke execute on function public.patch_live_by_id(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.patch_live_by_id(uuid, jsonb)
  to authenticated;
