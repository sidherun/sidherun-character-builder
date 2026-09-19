-- Retire anonymous character creation and bound stored character payloads.
-- Issue #338.
--
-- Production uses the authenticated repository: signed-in users create rows
-- directly under the characters INSERT policy. Existing capability links still
-- need the six read/update/manage RPCs, but create_character accepted an
-- attacker-selected GM key and therefore provided no enforceable identity on
-- which to base a quota. Remove it from every browser-facing API role.
--
-- The limits below are deliberately generous relative to the 2026-09-19
-- production preflight (14 rows; max name 19 characters, data 8,662 bytes,
-- live 161 bytes):
--   name: 200 Unicode characters
--   data: 256 KiB of normalized JSON text, object-shaped
--   live:  64 KiB of normalized JSON text, object-shaped
-- They apply to authenticated table writes and capability-token updates alike.
--
-- Apply AFTER 0005_character_update_authorization.sql.

revoke execute on function public.create_character(text, text, jsonb, jsonb)
  from public, anon, authenticated;

alter table public.characters
  add constraint characters_name_length
    check (char_length(name) <= 200) not valid,
  add constraint characters_data_object
    check (jsonb_typeof(data) = 'object') not valid,
  add constraint characters_data_size
    check (octet_length(data::text) <= 262144) not valid,
  add constraint characters_live_object
    check (jsonb_typeof(live) = 'object') not valid,
  add constraint characters_live_size
    check (octet_length(live::text) <= 65536) not valid;

-- NOT VALID makes installation take only a short catalog lock. Explicit
-- validation then checks the preflighted existing rows before the migration
-- succeeds, while every concurrent new write is constrained immediately.
alter table public.characters validate constraint characters_name_length;
alter table public.characters validate constraint characters_data_object;
alter table public.characters validate constraint characters_data_size;
alter table public.characters validate constraint characters_live_object;
alter table public.characters validate constraint characters_live_size;
