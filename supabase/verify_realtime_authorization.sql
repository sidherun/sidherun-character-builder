-- Executable authorization matrix for 0007_realtime_authorization.sql.
-- Run in the Supabase SQL Editor as the database owner after applying 0007.
-- The transaction always rolls back. A failed assertion aborts the script.
--
-- The block gated on `sidherun.realtime_test_stub` publishes through a test
-- double of realtime.send. Leave that setting unset on production so this
-- script never emits a live roll. CI sets it against a disposable database.

begin;

create or replace function pg_temp.expect_denied(p_statement text)
returns void language plpgsql security invoker as $$
begin
  execute p_statement;
  raise exception 'expected insufficient_privilege: %', p_statement;
exception
  when insufficient_privilege then null;
end
$$;

create or replace function pg_temp.expect_eq(p_label text, p_got text, p_want text)
returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception '%: expected %, got %', p_label, p_want, p_got;
  end if;
end
$$;

grant execute on function pg_temp.expect_denied(text), pg_temp.expect_eq(text, text, text)
  to anon, authenticated, realtime_guest;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '33200000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'issue332-owner@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33200000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'issue332-assignee@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33200000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'issue332-gm@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33200000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'issue332-outsider@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

update public.profiles set role = 'gm'
where id = '33200000-0000-4000-8000-000000000003';

insert into public.campaigns (id, slug, name)
values ('33200000-0000-4000-8000-0000000000c2', 'issue332-other', 'Other table');

insert into public.characters (
  id, token_hash, owner_hash, name, data, live, owner_user_id, assigned_player_id
) values (
  '33200000-0000-4000-8000-000000000010',
  encode(extensions.digest('issue332-capability-token', 'sha256'), 'hex'),
  encode(extensions.digest('issue332-gm-owner-key', 'sha256'), 'hex'),
  'Attested Name',
  '{"version":0}',
  '{"hpCurrent":10}',
  '33200000-0000-4000-8000-000000000001',
  '33200000-0000-4000-8000-000000000002'
);

insert into public.characters (
  id, token_hash, owner_hash, name, data, live, owner_user_id, campaign_id
) values (
  '33200000-0000-4000-8000-000000000011',
  encode(extensions.digest('issue332-other-capability-token', 'sha256'), 'hex'),
  encode(extensions.digest('issue332-other-owner-key', 'sha256'), 'hex'),
  'Other Table',
  '{"version":0}',
  '{"hpCurrent":4}',
  '33200000-0000-4000-8000-000000000005',
  '33200000-0000-4000-8000-0000000000c2'
);

-- New rows land on the home campaign unless a GM places them elsewhere.
select pg_temp.expect_eq(
  'home campaign default',
  (select campaign_id::text from public.characters where id = '33200000-0000-4000-8000-000000000010'),
  (select id::text from public.campaigns where slug = 'home')
);

-- ── predicate: signed-in membership ──────────────────────────────────────────

select set_config('request.jwt.claim.sub', '33200000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"33200000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select pg_temp.expect_eq('owner reads own character', private.member_can_read('char:33200000-0000-4000-8000-000000000010')::text, 'true');
select pg_temp.expect_eq('owner reads own table', private.member_can_read('table:' || (select id::text from public.campaigns where slug = 'home'))::text, 'true');
select pg_temp.expect_eq('owner cannot read the other table', private.member_can_read('table:33200000-0000-4000-8000-0000000000c2')::text, 'false');
select pg_temp.expect_eq('owner cannot read the other character', private.member_can_read('char:33200000-0000-4000-8000-000000000011')::text, 'false');
select pg_temp.expect_eq('session:default is not a member topic', private.member_can_read('session:default')::text, 'false');

select set_config('request.jwt.claim.sub', '33200000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"33200000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select pg_temp.expect_eq('assignee reads assigned character', private.member_can_read('char:33200000-0000-4000-8000-000000000010')::text, 'true');
select pg_temp.expect_eq('assignee reads assigned table', private.member_can_read('table:' || (select id::text from public.campaigns where slug = 'home'))::text, 'true');

select set_config('request.jwt.claim.sub', '33200000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claims', '{"sub":"33200000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select pg_temp.expect_eq('outsider cannot read character', private.member_can_read('char:33200000-0000-4000-8000-000000000010')::text, 'false');
select pg_temp.expect_eq('outsider cannot read home table', private.member_can_read('table:' || (select id::text from public.campaigns where slug = 'home'))::text, 'false');
select pg_temp.expect_eq('outsider reads own other character', private.member_can_read('char:33200000-0000-4000-8000-000000000011')::text, 'true');

select set_config('request.jwt.claim.sub', '33200000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"33200000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select pg_temp.expect_eq('gm reads every character', private.member_can_read('char:33200000-0000-4000-8000-000000000011')::text, 'true');
select pg_temp.expect_eq('gm reads every table', private.member_can_read('table:33200000-0000-4000-8000-0000000000c2')::text, 'true');

-- ── predicate: capability token and rotation ─────────────────────────────────

select set_config('request.jwt.claims', json_build_object(
  'role', 'realtime_guest',
  'realtime_scope', 'character',
  'character_id', '33200000-0000-4000-8000-000000000010',
  'campaign_id', (select id from public.campaigns where slug = 'home'),
  'token_hash', encode(extensions.digest('issue332-capability-token', 'sha256'), 'hex')
)::text, true);
select pg_temp.expect_eq('guest reads own character', private.guest_can_read('char:33200000-0000-4000-8000-000000000010')::text, 'true');
select pg_temp.expect_eq('guest reads own table', private.guest_can_read('table:' || (select id::text from public.campaigns where slug = 'home'))::text, 'true');
select pg_temp.expect_eq('guest cannot read another character', private.guest_can_read('char:33200000-0000-4000-8000-000000000011')::text, 'false');
select pg_temp.expect_eq('guest cannot read session:default', private.guest_can_read('session:default')::text, 'false');

-- A JWT minted before rotation still carries the old hash. New checks fail.
select set_config('request.jwt.claims', json_build_object(
  'role', 'realtime_guest',
  'realtime_scope', 'character',
  'character_id', '33200000-0000-4000-8000-000000000010',
  'campaign_id', (select id from public.campaigns where slug = 'home'),
  'token_hash', encode(extensions.digest('issue332-rotated-away-token', 'sha256'), 'hex')
)::text, true);
select pg_temp.expect_eq('rotated token cannot read', private.guest_can_read('char:33200000-0000-4000-8000-000000000010')::text, 'false');
select pg_temp.expect_eq('rotated token cannot read the table', private.guest_can_read('table:' || (select id::text from public.campaigns where slug = 'home'))::text, 'false');

select set_config('request.jwt.claims', json_build_object(
  'role', 'realtime_guest',
  'realtime_scope', 'gm',
  'owner_hash', encode(extensions.digest('issue332-gm-owner-key', 'sha256'), 'hex')
)::text, true);
select pg_temp.expect_eq('gm key reads owned character', private.guest_can_read('char:33200000-0000-4000-8000-000000000010')::text, 'true');
select pg_temp.expect_eq('gm key reads owned table', private.guest_can_read('table:' || (select id::text from public.campaigns where slug = 'home'))::text, 'true');
select pg_temp.expect_eq('gm key cannot read another owner', private.guest_can_read('char:33200000-0000-4000-8000-000000000011')::text, 'false');

-- ── identity is taken from the row ───────────────────────────────────────────

select set_config('request.jwt.claim.sub', '33200000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"33200000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare payload jsonb;
begin
  payload := private.roll_broadcast_payload(
    '33200000-0000-4000-8000-000000000010',
    null,
    '{"actor":"Hacker","rosterId":"fake","kind":"initiative","total":18}'::jsonb
  );
  if payload->>'actor' is distinct from 'Attested Name' then
    raise exception 'actor was not server-attested: %', payload;
  end if;
  if payload->>'characterId' is distinct from '33200000-0000-4000-8000-000000000010' then
    raise exception 'character id was not server-attested: %', payload;
  end if;
  if payload->>'rosterId' is distinct from '33200000-0000-4000-8000-000000000010' then
    raise exception 'roster id accepted the client value: %', payload;
  end if;
  if payload->>'kind' is distinct from 'initiative' or payload->>'total' is distinct from '18' then
    raise exception 'roll facts were dropped: %', payload;
  end if;
end $$;

select set_config('request.jwt.claim.sub', '33200000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claims', '{"sub":"33200000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select pg_temp.expect_denied($sql$
  select private.roll_broadcast_payload(
    '33200000-0000-4000-8000-000000000010', null, '{"kind":"initiative","total":1}'::jsonb
  )
$sql$);

do $$
declare payload jsonb;
begin
  payload := private.roll_broadcast_payload(
    null,
    'issue332-capability-token',
    '{"actor":"Hacker","kind":"total","total":40}'::jsonb
  );
  if payload->>'actor' is distinct from 'Attested Name' then
    raise exception 'token roll actor was not server-attested: %', payload;
  end if;
end $$;

select pg_temp.expect_denied($sql$
  select private.roll_broadcast_payload(null, 'not-a-real-capability-token', '{"kind":"total"}'::jsonb)
$sql$);

-- ── channel RLS: subscribe allowed, client publish denied ───────────────────

insert into realtime.messages (topic, extension, payload, event, private)
values
  ('char:33200000-0000-4000-8000-000000000010', 'broadcast', '{"live":{"hpCurrent":10}}', 'live', true),
  ('table:' || (select id::text from public.campaigns where slug = 'home'), 'broadcast', '{"kind":"total"}', 'roll', true),
  ('session:default', 'broadcast', '{"actor":"Hacker"}', 'roll', false);

select set_config('request.jwt.claim.sub', '33200000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"33200000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select set_config('realtime.topic', 'char:33200000-0000-4000-8000-000000000010', true);
set local role authenticated;
select pg_temp.expect_eq('owner subscribe character', (select count(*)::text from realtime.messages), '1');
select pg_temp.expect_denied($sql$
  insert into realtime.messages (topic, extension, payload, event, private)
  values ('char:33200000-0000-4000-8000-000000000010', 'broadcast', '{"live":{"hpCurrent":0}}', 'live', true)
$sql$);

reset role;
select set_config('realtime.topic', 'table:' || (select id::text from public.campaigns where slug = 'home'), true);
set local role authenticated;
select pg_temp.expect_eq('owner subscribe table', (select count(*)::text from realtime.messages), '1');
select pg_temp.expect_denied($sql$
  insert into realtime.messages (topic, extension, payload, event, private)
  values ('table:a1111111-1111-4111-8111-111111111111', 'broadcast', '{"actor":"Hacker"}', 'roll', true)
$sql$);

reset role;
select set_config('request.jwt.claim.sub', '33200000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claims', '{"sub":"33200000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select set_config('realtime.topic', 'char:33200000-0000-4000-8000-000000000010', true);
set local role authenticated;
select pg_temp.expect_eq('outsider subscribe character', (select count(*)::text from realtime.messages), '0');

reset role;
select set_config('realtime.topic', 'session:default', true);
set local role authenticated;
select pg_temp.expect_eq('member cannot subscribe session:default', (select count(*)::text from realtime.messages), '0');

reset role;
select set_config('request.jwt.claims', json_build_object(
  'role', 'realtime_guest',
  'realtime_scope', 'character',
  'character_id', '33200000-0000-4000-8000-000000000010',
  'campaign_id', (select id from public.campaigns where slug = 'home'),
  'token_hash', encode(extensions.digest('issue332-capability-token', 'sha256'), 'hex')
)::text, true);
select set_config('request.jwt.claim.role', 'realtime_guest', true);
select set_config('realtime.topic', 'char:33200000-0000-4000-8000-000000000010', true);
set local role realtime_guest;
select pg_temp.expect_eq('guest subscribe character', (select count(*)::text from realtime.messages), '1');
select pg_temp.expect_denied($sql$
  insert into realtime.messages (topic, extension, payload, event, private)
  values ('char:33200000-0000-4000-8000-000000000010', 'broadcast', '{"live":{"hpCurrent":0}}', 'live', true)
$sql$);

reset role;
select set_config('request.jwt.claims', json_build_object(
  'role', 'realtime_guest',
  'realtime_scope', 'character',
  'character_id', '33200000-0000-4000-8000-000000000010',
  'campaign_id', (select id from public.campaigns where slug = 'home'),
  'token_hash', encode(extensions.digest('issue332-rotated-away-token', 'sha256'), 'hex')
)::text, true);
select set_config('realtime.topic', 'char:33200000-0000-4000-8000-000000000010', true);
set local role realtime_guest;
select pg_temp.expect_eq('rotated guest subscribe', (select count(*)::text from realtime.messages), '0');

reset role;
select set_config('realtime.topic', 'char:33200000-0000-4000-8000-000000000010', true);
set local role anon;
select pg_temp.expect_denied($sql$ select count(*) from realtime.messages $sql$);

-- Publish RPCs reject callers who do not hold the character.
reset role;
select set_config('request.jwt.claim.sub', '33200000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claims', '{"sub":"33200000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.expect_denied($sql$
  select public.publish_roll('33200000-0000-4000-8000-000000000010', '{"kind":"initiative","total":1}'::jsonb)
$sql$);

reset role;
set local role anon;
select pg_temp.expect_denied($sql$
  select public.publish_roll('33200000-0000-4000-8000-000000000010', '{"kind":"initiative","total":1}'::jsonb)
$sql$);
select pg_temp.expect_denied($sql$
  select public.publish_roll_for_token('not-a-real-capability-token', '{"kind":"total"}'::jsonb)
$sql$);
select pg_temp.expect_denied($sql$
  select public.lookup_realtime_capability('issue332-capability-token')
$sql$);

-- A player cannot move their character onto another campaign's channel.
reset role;
select set_config('request.jwt.claim.sub', '33200000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"33200000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.expect_denied($sql$
  update public.characters
     set campaign_id = '33200000-0000-4000-8000-0000000000c2'
   where id = '33200000-0000-4000-8000-000000000010'
$sql$);

-- ── disposable database only: attested publish + trigger nudge ──────────────

reset role;
do $$
begin
  if current_setting('sidherun.realtime_test_stub', true) is distinct from 'on' then
    return;
  end if;

  create table if not exists public.realtime_send_log (
    payload jsonb, event text, topic text, is_private boolean
  );
  delete from public.realtime_send_log;

  execute $fn$
    create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true)
    returns void language plpgsql as $body$
    begin
      insert into public.realtime_send_log(payload, event, topic, is_private)
      values (payload, event, topic, private);
    end
    $body$
  $fn$;

  perform set_config('request.jwt.claim.sub', '33200000-0000-4000-8000-000000000001', true);
  perform set_config('request.jwt.claims', '{"sub":"33200000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  perform public.publish_roll(
    '33200000-0000-4000-8000-000000000010',
    '{"actor":"Hacker","rosterId":"fake","kind":"initiative","total":18}'::jsonb
  );
  if not exists (
    select 1 from public.realtime_send_log
    where event = 'roll'
      and is_private
      and topic = 'table:' || (select id::text from public.campaigns where slug = 'home')
      and payload->>'actor' = 'Attested Name'
      and payload->>'characterId' = '33200000-0000-4000-8000-000000000010'
      and payload->>'rosterId' <> 'fake'
  ) then
    raise exception 'publish_roll did not emit an attested private roll';
  end if;

  perform public.publish_roll_for_token(
    'issue332-capability-token',
    '{"actor":"Hacker","kind":"total","total":40}'::jsonb
  );
  if (select count(*) from public.realtime_send_log where event = 'roll' and payload->>'actor' = 'Attested Name') <> 2 then
    raise exception 'token publish was not attested';
  end if;

  update public.characters
     set live = live || '{"hpCurrent":7}'::jsonb
   where id = '33200000-0000-4000-8000-000000000010';
  if not exists (
    select 1 from public.realtime_send_log
    where event = 'live'
      and topic = 'char:33200000-0000-4000-8000-000000000010'
      and is_private
      and payload->>'character_id' = '33200000-0000-4000-8000-000000000010'
      and payload->'live'->>'hpCurrent' = '7'
  ) then
    raise exception 'live update did not broadcast from the database';
  end if;
end $$;

reset role;
select true as realtime_authorization_ok;

rollback;
