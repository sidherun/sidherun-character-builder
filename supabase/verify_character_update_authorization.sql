-- Executable regression matrix for 0005_character_update_authorization.sql.
-- Run in the Supabase SQL Editor as the database owner after applying 0005.
-- The transaction always rolls back its fixture users and characters. Any
-- failed assertion aborts the script; the final SELECT returns one true value.

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

create or replace function pg_temp.assert_character_state(
  p_id uuid,
  p_name text default null,
  p_owner uuid default null,
  p_assignee uuid default null,
  p_data_rev bigint default null,
  p_live_rev bigint default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.characters%rowtype;
begin
  select * into strict c from public.characters where id = p_id;
  if p_name is not null and c.name is distinct from p_name then
    raise exception 'name mismatch: expected %, got %', p_name, c.name;
  end if;
  if p_owner is not null and c.owner_user_id is distinct from p_owner then
    raise exception 'owner mismatch: expected %, got %', p_owner, c.owner_user_id;
  end if;
  if p_assignee is not null and c.assigned_player_id is distinct from p_assignee then
    raise exception 'assignee mismatch: expected %, got %', p_assignee, c.assigned_player_id;
  end if;
  if p_data_rev is not null and c.data_rev is distinct from p_data_rev then
    raise exception 'data_rev mismatch: expected %, got %', p_data_rev, c.data_rev;
  end if;
  if p_live_rev is not null and c.live_rev is distinct from p_live_rev then
    raise exception 'live_rev mismatch: expected %, got %', p_live_rev, c.live_rev;
  end if;
end
$$;

-- Stable fixture identities. handle_new_user creates player profiles.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '33100000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'issue331-owner@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33100000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'issue331-assignee@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33100000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'issue331-gm@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33100000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'issue331-admin@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33100000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'issue331-outsider@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

update public.profiles set role = 'gm'
where id = '33100000-0000-0000-0000-000000000003';
update public.profiles set role = 'admin'
where id = '33100000-0000-0000-0000-000000000004';

insert into public.characters (
  id, token_hash, owner_hash, name, data, live,
  owner_user_id, assigned_player_id
) values (
  '33100000-0000-0000-0000-000000000010',
  encode(extensions.digest('issue331-main-token', 'sha256'), 'hex'),
  encode(extensions.digest('issue331-main-owner', 'sha256'), 'hex'),
  'Original', '{"version":0}', '{"hpCurrent":10}',
  '33100000-0000-0000-0000-000000000001',
  '33100000-0000-0000-0000-000000000002'
), (
  '33100000-0000-0000-0000-000000000011',
  encode(extensions.digest('issue331-guest-token', 'sha256'), 'hex'),
  encode(extensions.digest('issue331-guest-owner', 'sha256'), 'hex'),
  'Guest', '{"version":0}', '{"hpCurrent":10}', null, null
);

-- Anonymous direct writes stay sealed; capability RPC writes still work.
set local role anon;
select pg_temp.expect_denied($sql$
  update public.characters set name = 'anon-direct'
  where id = '33100000-0000-0000-0000-000000000010'
$sql$);
select * from public.patch_live('issue331-guest-token', '{"hpCurrent":9}');
select * from public.update_character_data(
  'issue331-guest-token', 'Guest structural edit', '{"version":1}', 0
);
reset role;
select pg_temp.assert_character_state(
  '33100000-0000-0000-0000-000000000011',
  p_name => 'Guest structural edit', p_data_rev => 1, p_live_rev => 1
);

-- Owner: content succeeds and revisions are automatic; protected fields fail.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33100000-0000-0000-0000-000000000001","role":"authenticated"}', true);
update public.characters set name = 'Owner edit', data = '{"version":1}'
where id = '33100000-0000-0000-0000-000000000010';
select pg_temp.expect_denied($sql$
  update public.characters
  set assigned_player_id = null
  where id = '33100000-0000-0000-0000-000000000010'
$sql$);
select pg_temp.expect_denied($sql$
  update public.characters
  set token_hash = 'forged'
  where id = '33100000-0000-0000-0000-000000000010'
$sql$);
select pg_temp.expect_denied($sql$
  update public.characters
  set data_rev = 99
  where id = '33100000-0000-0000-0000-000000000010'
$sql$);
reset role;
select pg_temp.assert_character_state(
  '33100000-0000-0000-0000-000000000010',
  p_name => 'Owner edit', p_data_rev => 1
);

-- Assignee: both structural and live updates succeed; takeover fails.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33100000-0000-0000-0000-000000000002","role":"authenticated"}', true);
update public.characters set name = 'Assignee edit', data = '{"version":2}'
where id = '33100000-0000-0000-0000-000000000010';
select * from public.patch_live_by_id(
  '33100000-0000-0000-0000-000000000010', '{"hpCurrent":8}'
);
select pg_temp.expect_denied($sql$
  update public.characters
  set owner_user_id = '33100000-0000-0000-0000-000000000002'
  where id = '33100000-0000-0000-0000-000000000010'
$sql$);
-- Signed-in browsers may still use a guest capability link.
select * from public.patch_live('issue331-guest-token', '{"hpCurrent":8}');
reset role;
select pg_temp.assert_character_state(
  '33100000-0000-0000-0000-000000000010',
  p_name => 'Assignee edit',
  p_owner => '33100000-0000-0000-0000-000000000001',
  p_data_rev => 2, p_live_rev => 1
);
select pg_temp.assert_character_state(
  '33100000-0000-0000-0000-000000000011', p_live_rev => 2
);

-- An unrelated player remains outside the row's RLS scope. UPDATE is silently
-- filtered to zero rows, so assert the authoritative state remains unchanged.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33100000-0000-0000-0000-000000000005","role":"authenticated"}', true);
update public.characters set name = 'Outsider edit'
where id = '33100000-0000-0000-0000-000000000010';
reset role;
select pg_temp.assert_character_state(
  '33100000-0000-0000-0000-000000000010', p_name => 'Assignee edit'
);

-- GM and admin retain reassignment authority.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33100000-0000-0000-0000-000000000003","role":"authenticated"}', true);
update public.characters
set assigned_player_id = '33100000-0000-0000-0000-000000000001'
where id = '33100000-0000-0000-0000-000000000010';
reset role;
select pg_temp.assert_character_state(
  '33100000-0000-0000-0000-000000000010',
  p_assignee => '33100000-0000-0000-0000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33100000-0000-0000-0000-000000000004","role":"authenticated"}', true);
update public.characters
set owner_user_id = '33100000-0000-0000-0000-000000000002'
where id = '33100000-0000-0000-0000-000000000010';
reset role;
select pg_temp.assert_character_state(
  '33100000-0000-0000-0000-000000000010',
  p_owner => '33100000-0000-0000-0000-000000000002'
);

select true as character_update_authorization_verified;
rollback;
