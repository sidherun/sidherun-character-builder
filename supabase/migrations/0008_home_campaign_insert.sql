-- Let a player's first character land on the home campaign. Issue #387.
--
-- guard_character_update is SECURITY INVOKER. Its lookup of the home campaign
-- ran as the inserting user, under campaigns_select, which only shows a
-- campaign the caller already has a character in (or a GM/admin). A non-GM
-- creating their first character sees no row, the comparison is against null,
-- and the insert is rejected with "only a gm or admin may place a character
-- in another campaign" even when PostgREST omitted campaign_id and the column
-- default is the home row.
--
-- Apply AFTER 0007_realtime_authorization.sql. Does not change Realtime grants
-- or policies.

create or replace function private.home_campaign_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.campaigns where slug = 'home'
$$;

revoke execute on function private.home_campaign_id()
  from public, anon, authenticated, realtime_guest;
grant execute on function private.home_campaign_id() to authenticated;

create or replace function public.guard_character_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  home uuid;
begin
  if tg_op = 'INSERT' then
    if new.campaign_id is null then
      new.campaign_id := private.home_campaign_id();
    end if;
    if current_user = 'authenticated'
       and auth.uid() is not null
       and not private.is_gm_or_admin() then
      home := private.home_campaign_id();
      if new.campaign_id is distinct from home then
        raise exception 'only a gm or admin may place a character in another campaign'
          using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

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

    if new.campaign_id is distinct from old.campaign_id then
      raise exception 'only a gm or admin may move a character between campaigns'
        using errcode = '42501';
    end if;
  end if;

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

revoke execute on function public.guard_character_update()
  from public, anon, authenticated, realtime_guest;
