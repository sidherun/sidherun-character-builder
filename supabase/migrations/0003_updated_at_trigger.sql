-- Keep characters.updated_at truthful on EVERY write path. Issue #253.
--
-- The guest-plane RPCs (0001) set updated_at = now() explicitly, but the
-- authenticated plane (0002) writes to public.characters directly (RLS-scoped
-- table DML, e.g. saveCharacterData's update of {name, data}) — nothing bumped
-- updated_at, so authed saves kept the old timestamp. That skewed the roster's
-- "Saved" dates and its order('updated_at'), and — the real hazard — the
-- newer-updated_at-wins reconciliation in characterRepo.js, which could prefer
-- a stale cached copy over the user's fresh authed save.
--
-- Fix at the root: a moddatetime BEFORE UPDATE trigger stamps updated_at on
-- any UPDATE of public.characters, whichever plane (or future code path) wrote
-- it. The explicit now() in the guest RPCs stays — the trigger assigns the
-- same value, so it's belt and braces, not a conflict.
--
-- Apply: paste into the Supabase SQL Editor (or `supabase db push`) AFTER 0002.

create extension if not exists moddatetime with schema extensions;

drop trigger if exists characters_updated_at on public.characters;
create trigger characters_updated_at
  before update on public.characters
  for each row
  execute function extensions.moddatetime(updated_at);
