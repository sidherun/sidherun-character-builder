-- Sidherun cloud sync — schema + sealed RLS + capability-token RPCs.
-- Epic #71, milestone M1 (#73).
--
-- Model: one `characters` table holding the character as jsonb. The table is
-- FULLY SEALED (no anon/authenticated grants); every access goes through a
-- SECURITY DEFINER RPC that takes a secret as an argument:
--   * per-character capability TOKEN  -> read+edit exactly one row (in the link)
--   * per-GM owner KEY                -> owns/lists all the GM's rows (no accounts)
-- Secrets are stored only as sha256 hashes; the raw token is returned exactly
-- once on create/rotate. The anon key is public by design — security is here.
--
-- Apply: paste into the Supabase SQL Editor (or `supabase db push`). Idempotent
-- enough to re-run during setup (drops functions before recreating).
--
-- NOTE: Realtime broadcast from these RPCs is added in M4 (#76) as 0002_*.sql,
-- to keep this milestone independently verifiable (table + RLS + RPC round-trip).

create extension if not exists pgcrypto with schema extensions;

-- ── table ────────────────────────────────────────────────────────────────────
create table if not exists public.characters (
  id          uuid primary key default gen_random_uuid(),
  token_hash  text not null,                 -- sha256(capability token)
  owner_hash  text not null,                 -- sha256(GM key)
  name        text not null default 'Unnamed',
  data        jsonb not null,                -- full character blob (Zod shape)
  live        jsonb not null default '{}'::jsonb, -- play counters (field-merged)
  data_rev    bigint not null default 0,     -- bumped on full-blob writes
  live_rev    bigint not null default 0,     -- bumped on live-counter writes
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create unique index if not exists characters_token_hash_idx on public.characters (token_hash);
create index        if not exists characters_owner_hash_idx on public.characters (owner_hash);

-- ── seal the table: no direct access for the public API roles ────────────────
alter table public.characters enable row level security;
revoke all on public.characters from anon, authenticated;
-- No RLS policies are created, so even with RLS enabled there is no row anyone
-- can select/insert/update/delete directly. The RPCs below (SECURITY DEFINER)
-- are the only way in.

-- ── secret hashing helper (definer; fully-qualified; empty search_path) ───────
create or replace function public._h(secret text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select encode(extensions.digest(secret, 'sha256'), 'hex')
$$;

-- URL-safe random capability token (base64url, no padding).
create or replace function public._mint_token()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select replace(replace(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+', '-'), '/', '_')
$$;

-- ── RPCs ─────────────────────────────────────────────────────────────────────

-- Create a character owned by the GM. Returns the new id + the raw token ONCE.
create or replace function public.create_character(
  p_gm_key text, p_name text, p_data jsonb, p_live jsonb
)
returns table (id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := public._mint_token();
  v_id    uuid;
begin
  insert into public.characters (token_hash, owner_hash, name, data, live)
  values (public._h(v_token), public._h(p_gm_key),
          coalesce(nullif(p_name, ''), 'Unnamed'), p_data, coalesce(p_live, '{}'::jsonb))
  returning public.characters.id into v_id;
  return query select v_id, v_token;
end
$$;

-- Read one character by its capability token (player + GM single-char load).
create or replace function public.get_character(p_token text)
returns table (id uuid, name text, data jsonb, live jsonb,
               data_rev bigint, live_rev bigint, updated_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select id, name, data, live, data_rev, live_rev, updated_at
  from public.characters
  where token_hash = public._h(p_token)
$$;

-- Replace the full character blob (GM wizard edits). Optimistic concurrency:
-- pass p_expected_rev = current data_rev to guard, or -1 to force (LWW).
-- Returns the new data_rev (empty result = token unknown or rev conflict).
create or replace function public.update_character_data(
  p_token text, p_name text, p_data jsonb, p_expected_rev bigint
)
returns table (data_rev bigint, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.characters c
     set data = p_data,
         name = coalesce(nullif(p_name, ''), 'Unnamed'),
         data_rev = c.data_rev + 1,
         updated_at = now()
   where c.token_hash = public._h(p_token)
     and (p_expected_rev < 0 or c.data_rev = p_expected_rev)
  returning c.data_rev, c.updated_at;
end
$$;

-- Patch ONLY live counters (player + GM during play). Shallow jsonb merge so a
-- player's HP change and a GM's mana change in the same window don't clobber.
create or replace function public.patch_live(p_token text, p_patch jsonb)
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
   where c.token_hash = public._h(p_token)
  returning c.live, c.live_rev, c.updated_at;
end
$$;

-- GM: list all owned characters (roster hydrate). Returns NO tokens.
create or replace function public.list_characters(p_gm_key text)
returns table (id uuid, name text, data jsonb, live jsonb,
               data_rev bigint, live_rev bigint, updated_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select id, name, data, live, data_rev, live_rev, updated_at
  from public.characters
  where owner_hash = public._h(p_gm_key)
$$;

-- GM: rotate (mint a fresh) capability token for an owned character. Old links
-- stop working. Returns the new raw token (empty = not owned / wrong GM key).
create or replace function public.rotate_token(p_gm_key text, p_id uuid)
returns table (token text)
language plpgsql
security definer
set search_path = ''
as $$
declare v_token text := public._mint_token();
begin
  return query
  update public.characters c
     set token_hash = public._h(v_token)
   where c.id = p_id and c.owner_hash = public._h(p_gm_key)
  returning v_token;
end
$$;

-- GM: delete an owned character.
create or replace function public.delete_character(p_gm_key text, p_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare v_count bigint;
begin
  delete from public.characters c
   where c.id = p_id and c.owner_hash = public._h(p_gm_key);
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

-- ── grants: expose ONLY the RPCs to the anon (public API) role ────────────────
revoke execute on function
  public.create_character(text, text, jsonb, jsonb),
  public.get_character(text),
  public.update_character_data(text, text, jsonb, bigint),
  public.patch_live(text, jsonb),
  public.list_characters(text),
  public.rotate_token(text, uuid),
  public.delete_character(text, uuid),
  public._h(text),
  public._mint_token()
from public;

grant execute on function
  public.create_character(text, text, jsonb, jsonb),
  public.get_character(text),
  public.update_character_data(text, text, jsonb, bigint),
  public.patch_live(text, jsonb),
  public.list_characters(text),
  public.rotate_token(text, uuid),
  public.delete_character(text, uuid)
to anon, authenticated;

-- Internal helpers are NOT granted to anon (only the SECURITY DEFINER RPCs above
-- call them, running as the definer/owner).
