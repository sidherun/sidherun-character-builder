-- Authenticate Realtime character and roll channels. Issue #332.
--
-- Public broadcast topics (`session:default`, `char:<uuid>`) trusted anyone
-- holding the public anon key. This migration:
--   * puts every character in a campaign (the home table, by default);
--   * authorizes private Broadcast reads on `char:<id>` and `table:<campaign>`
--     for the owner, assignee, GM/admin, or a still-valid capability token;
--   * refuses client writes on those topics — live nudges and rolls are sent
--     with realtime.send from the database, with the actor taken from the row;
--   * adds a `realtime_guest` role whose only privilege is those reads, so a
--     guest JWT cannot be replayed against the Data API as `authenticated`.
--
-- Applying this file does not close public channels. Old clients keep using
-- them until the frontend that sets `private: true` is what the table is
-- running, and Realtime Settings → "Allow public access" is then turned off.
-- Do that last. See supabase/README.md.
--
-- Apply AFTER 0006_anonymous_creation_controls.sql.

-- ── campaigns ────────────────────────────────────────────────────────────────
-- One row per independent table. Named roster filters (tableIds on the
-- character blob) stay a display concern; they are not this boundary.

create table if not exists public.campaigns (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

insert into public.campaigns (id, slug, name)
values ('a1111111-1111-4111-8111-111111111111', 'home', 'Home table')
on conflict (slug) do nothing;

alter table public.campaigns enable row level security;
revoke all on public.campaigns from public, anon, authenticated;

alter table public.characters
  add column if not exists campaign_id uuid references public.campaigns(id);

update public.characters c
   set campaign_id = home.id
  from public.campaigns home
 where home.slug = 'home'
   and c.campaign_id is null;

alter table public.characters
  alter column campaign_id set not null;

do $$
declare home uuid;
begin
  select id into home from public.campaigns where slug = 'home';
  execute format(
    'alter table public.characters alter column campaign_id set default %L',
    home
  );
end $$;

create index if not exists characters_campaign_idx on public.characters (campaign_id);

grant select on public.campaigns to authenticated;

drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns
  for select to authenticated
  using (
    private.is_gm_or_admin()
    or exists (
      select 1 from public.characters c
      where c.campaign_id = campaigns.id
        and (c.owner_user_id = (select auth.uid())
             or c.assigned_player_id = (select auth.uid()))
    )
  );

-- ── guest realtime role ──────────────────────────────────────────────────────
-- Distinct from `authenticated` so the short-lived guest JWT is not a
-- character-table session. Realtime SET ROLEs to the JWT `role` claim, which
-- requires authenticator to be a member of this role.

do $$ begin
  create role realtime_guest nologin noinherit;
exception when duplicate_object then null;
end $$;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    grant realtime_guest to authenticator;
  end if;
end $$;

revoke all on public.characters from realtime_guest;
revoke all on public.profiles from realtime_guest;
revoke all on public.campaigns from realtime_guest;
grant usage on schema private to realtime_guest;

-- ── topic helpers ────────────────────────────────────────────────────────────

create or replace function private.jwt_claims()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  )
$$;

create or replace function private.uuid_after(topic text, prefix text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare raw text;
begin
  if topic is null or prefix is null or length(topic) <> length(prefix) + 36 then
    return null;
  end if;
  if left(topic, length(prefix)) <> prefix then
    return null;
  end if;
  raw := substr(topic, length(prefix) + 1);
  if raw !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return raw::uuid;
exception when others then
  return null;
end
$$;

-- Signed-in owner, assignee, or GM/admin. Guest claims are ignored here;
-- those tokens use realtime_guest and private.guest_can_read.
create or replace function private.member_can_read(topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.uuid_after(topic, 'char:') is not null then exists (
      select 1 from public.characters c
      where c.id = private.uuid_after(topic, 'char:')
        and (
          c.owner_user_id = (select auth.uid())
          or c.assigned_player_id = (select auth.uid())
          or private.is_gm_or_admin()
        )
    )
    when private.uuid_after(topic, 'table:') is not null then (
      (
        private.is_gm_or_admin()
        and exists (
          select 1 from public.campaigns camp
          where camp.id = private.uuid_after(topic, 'table:')
        )
      )
      or exists (
        select 1 from public.characters c
        where c.campaign_id = private.uuid_after(topic, 'table:')
          and (
            c.owner_user_id = (select auth.uid())
            or c.assigned_player_id = (select auth.uid())
          )
      )
    )
    else false
  end
$$;

-- Capability token still matches the row (rotation changes token_hash), or
-- the legacy GM key still owns the character. `session:default` never matches.
create or replace function private.guest_can_read(topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims jsonb := private.jwt_claims();
  scope text := claims->>'realtime_scope';
  v_character_id uuid := private.uuid_after('char:' || coalesce(claims->>'character_id', ''), 'char:');
  v_campaign_id uuid := private.uuid_after('table:' || coalesce(claims->>'campaign_id', ''), 'table:');
begin
  if scope = 'character' then
    if v_character_id is null or v_campaign_id is null or coalesce(claims->>'token_hash', '') = '' then
      return false;
    end if;
    if topic = 'char:' || v_character_id::text
       or topic = 'table:' || v_campaign_id::text then
      return exists (
        select 1 from public.characters c
        where c.id = v_character_id
          and c.campaign_id = v_campaign_id
          and c.token_hash = claims->>'token_hash'
      );
    end if;
    return false;
  end if;

  if scope = 'gm' then
    if coalesce(claims->>'owner_hash', '') = '' then
      return false;
    end if;
    if private.uuid_after(topic, 'char:') is not null then
      return exists (
        select 1 from public.characters c
        where c.id = private.uuid_after(topic, 'char:')
          and c.owner_hash = claims->>'owner_hash'
      );
    end if;
    if private.uuid_after(topic, 'table:') is not null then
      return exists (
        select 1 from public.characters c
        where c.campaign_id = private.uuid_after(topic, 'table:')
          and c.owner_hash = claims->>'owner_hash'
      );
    end if;
  end if;

  return false;
end
$$;

revoke execute on function
  private.jwt_claims(),
  private.uuid_after(text, text),
  private.member_can_read(text),
  private.guest_can_read(text)
from public, anon, authenticated, realtime_guest;

-- Policies run as the calling role and must be allowed to execute the check.
grant execute on function private.member_can_read(text) to authenticated;
grant execute on function private.guest_can_read(text) to realtime_guest;
grant execute on function private.uuid_after(text, text), private.jwt_claims()
  to authenticated, realtime_guest;

-- ── realtime.messages policies ───────────────────────────────────────────────
-- SELECT lets a private channel subscribe. There is intentionally no INSERT
-- policy: browsers cannot publish. Triggers and publish_roll call
-- realtime.send, which runs as its owner and bypasses these policies.
-- `session:default` is not an authorized topic.

grant usage on schema realtime to authenticated, realtime_guest;
grant select, insert on realtime.messages to authenticated, realtime_guest;

drop policy if exists realtime_member_read_broadcast on realtime.messages;
create policy realtime_member_read_broadcast
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.messages.topic = (select realtime.topic())
    and private.member_can_read((select realtime.topic()))
  );

drop policy if exists realtime_guest_read_broadcast on realtime.messages;
create policy realtime_guest_read_broadcast
  on realtime.messages
  for select
  to realtime_guest
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.messages.topic = (select realtime.topic())
    and private.guest_can_read((select realtime.topic()))
  );

-- ── server-attested rolls ────────────────────────────────────────────────────

create or replace function private.roll_broadcast_payload(
  p_character_id uuid,
  p_token text,
  p_roll jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_char public.characters%rowtype;
  v_roll jsonb;
begin
  if p_roll is null or jsonb_typeof(p_roll) <> 'object' then
    raise exception 'roll payload must be an object' using errcode = '22023';
  end if;
  if octet_length(p_roll::text) > 8192 then
    raise exception 'roll payload is too large' using errcode = '22023';
  end if;

  if p_token is not null then
    select * into v_char from public.characters c
     where c.token_hash = public._h(p_token);
  else
    select * into v_char from public.characters c
     where c.id = p_character_id;
  end if;

  if not found then
    raise exception 'not allowed to publish for this character' using errcode = '42501';
  end if;

  if p_token is null and not (
    v_char.owner_user_id = (select auth.uid())
    or v_char.assigned_player_id = (select auth.uid())
    or private.is_gm_or_admin()
  ) then
    raise exception 'not allowed to publish for this character' using errcode = '42501';
  end if;

  -- Client identity is untrusted. The name and ids come from the row.
  v_roll := p_roll
    - 'actor' - 'rosterId' - 'characterId' - 'userId'
    - 'campaignId' - 'ts' - 'gmTarget' - 'transport';

  return v_roll || jsonb_build_object(
    'actor', v_char.name,
    'rosterId', v_char.id,
    'characterId', v_char.id,
    'campaignId', v_char.campaign_id,
    'ts', (extract(epoch from clock_timestamp()) * 1000)::bigint
  );
end
$$;

create or replace function public.publish_roll(p_character_id uuid, p_roll jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb := private.roll_broadcast_payload(p_character_id, null, p_roll);
  v_campaign uuid := (v_payload->>'campaignId')::uuid;
begin
  perform realtime.send(
    v_payload,
    'roll',
    'table:' || v_campaign::text,
    true
  );
end
$$;

create or replace function public.publish_roll_for_token(p_token text, p_roll jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb := private.roll_broadcast_payload(null, p_token, p_roll);
  v_campaign uuid := (v_payload->>'campaignId')::uuid;
begin
  perform realtime.send(
    v_payload,
    'roll',
    'table:' || v_campaign::text,
    true
  );
end
$$;

revoke execute on function private.roll_broadcast_payload(uuid, text, jsonb)
  from public, anon, authenticated, realtime_guest;
revoke execute on function public.publish_roll(uuid, jsonb)
  from public, anon, authenticated, realtime_guest;
revoke execute on function public.publish_roll_for_token(text, jsonb)
  from public, anon, authenticated, realtime_guest;

grant execute on function public.publish_roll(uuid, jsonb) to authenticated;
grant execute on function public.publish_roll_for_token(text, jsonb) to anon, authenticated;

-- ── character live/data nudges from the row, not the browser ────────────────

create or replace function public.broadcast_character_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.live is distinct from old.live or new.live_rev is distinct from old.live_rev then
    begin
      perform realtime.send(
        jsonb_build_object(
          'live', new.live,
          'live_rev', new.live_rev,
          'character_id', new.id
        ),
        'live',
        'char:' || new.id::text,
        true
      );
    exception when others then
      raise warning 'character live broadcast failed: %', sqlerrm;
    end;
  end if;

  if new.data is distinct from old.data
     or new.name is distinct from old.name
     or new.data_rev is distinct from old.data_rev then
    begin
      perform realtime.send(
        jsonb_build_object(
          'character_id', new.id,
          'data_rev', new.data_rev
        ),
        'data',
        'char:' || new.id::text,
        true
      );
    exception when others then
      raise warning 'character data broadcast failed: %', sqlerrm;
    end;
  end if;

  return null;
end
$$;

drop trigger if exists characters_broadcast_change on public.characters;
create trigger characters_broadcast_change
  after update on public.characters
  for each row execute function public.broadcast_character_change();

revoke execute on function public.broadcast_character_change()
  from public, anon, authenticated, realtime_guest;

-- ── campaign placement is a GM action ────────────────────────────────────────
-- Extends the 0005 update guard. Non-GMs may keep editing content; they may
-- not move a character onto another campaign's roll channel.

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
      select id into new.campaign_id from public.campaigns where slug = 'home';
    end if;
    if current_user = 'authenticated'
       and auth.uid() is not null
       and not private.is_gm_or_admin() then
      select id into home from public.campaigns where slug = 'home';
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

drop trigger if exists characters_guard_insert on public.characters;
create trigger characters_guard_insert
  before insert on public.characters
  for each row execute function public.guard_character_update();

revoke execute on function public.guard_character_update()
  from public, anon, authenticated, realtime_guest;

-- ── token exchange lookups (service role only) ──────────────────────────────
-- The Edge Function is the only caller. anon cannot read token hashes.

create or replace function public.lookup_realtime_capability(p_token text)
returns table (character_id uuid, campaign_id uuid, token_hash text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.campaign_id, c.token_hash
  from public.characters c
  where p_token is not null
    and length(p_token) between 20 and 200
    and c.token_hash = public._h(p_token)
$$;

create or replace function public.lookup_realtime_gm(p_gm_key text)
returns table (owner_hash text, campaign_ids uuid[])
language sql
stable
security definer
set search_path = ''
as $$
  select public._h(p_gm_key), array_agg(distinct c.campaign_id)
  from public.characters c
  where p_gm_key is not null
    and length(p_gm_key) between 8 and 200
    and c.owner_hash = public._h(p_gm_key)
  having count(*) > 0
$$;

revoke execute on function public.lookup_realtime_capability(text)
  from public, anon, authenticated, realtime_guest;
revoke execute on function public.lookup_realtime_gm(text)
  from public, anon, authenticated, realtime_guest;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.lookup_realtime_capability(text) to service_role;
    grant execute on function public.lookup_realtime_gm(text) to service_role;
  end if;
end $$;
