-- Executable regression matrix for 0006_anonymous_creation_controls.sql.
-- Run in the Supabase SQL Editor as the database owner after applying 0006.
-- The transaction always rolls back its fixtures. Any failed assertion aborts
-- the script; the final SELECT returns one true value.

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

create or replace function pg_temp.expect_check_violation(p_statement text)
returns void language plpgsql security invoker as $$
begin
  execute p_statement;
  raise exception 'expected check_violation: %', p_statement;
exception
  when check_violation then null;
end
$$;

create or replace function pg_temp.assert_true(p_value boolean, p_message text)
returns void language plpgsql security invoker as $$
begin
  if not coalesce(p_value, false) then
    raise exception 'assertion failed: %', p_message;
  end if;
end
$$;

create or replace function pg_temp.assert_guest_state()
returns void language plpgsql security definer set search_path = '' as $$
declare c public.characters%rowtype;
begin
  select * into strict c from public.characters
  where id = '33800000-0000-0000-0000-000000000010';
  if c.name is distinct from 'Guest updated'
     or c.data is distinct from '{"version":1}'::jsonb
     or c.live is distinct from '{"hpCurrent":9}'::jsonb
     or c.data_rev <> 1 or c.live_rev <> 1 then
    raise exception 'guest capability update did not persist expected state';
  end if;
end
$$;

-- Migration 0004 revoked the migration owner's default PUBLIC EXECUTE grant on
-- new functions. Grant these test-only helpers explicitly before SET ROLE, so
-- the matrix exercises the statement inside each helper rather than failing at
-- the helper boundary. GRANT does not accept the pg_temp alias as a schema name,
-- so resolve this session's actual pg_temp_N schema. It disappears with session.
do $$
declare v_temp_schema text := pg_my_temp_schema()::regnamespace::text;
begin
  execute format(
    'grant usage on schema %I to anon, authenticated',
    v_temp_schema
  );
  execute format(
    'grant execute on function %1$I.expect_denied(text), '
    '%1$I.expect_check_violation(text), '
    '%1$I.assert_true(boolean, text) to anon, authenticated',
    v_temp_schema
  );
end
$$;

-- Stable authenticated identity; handle_new_user creates its player profile.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '33800000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'issue338-owner@example.invalid', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
);

-- Pre-existing capability row: creation is owner-context setup, while every
-- guest operation below runs with the same privileges as the public Data API.
insert into public.characters (
  id, token_hash, owner_hash, name, data, live
) values (
  '33800000-0000-0000-0000-000000000010',
  encode(extensions.digest('issue338-guest-token', 'sha256'), 'hex'),
  encode(extensions.digest('issue338-guest-owner', 'sha256'), 'hex'),
  'Guest', '{"version":0}', '{"hpCurrent":10}'
), (
  '33800000-0000-0000-0000-000000000011',
  encode(extensions.digest('issue338-limit-token', 'sha256'), 'hex'),
  encode(extensions.digest('issue338-limit-owner', 'sha256'), 'hex'),
  'Limit fixture', '{"version":0}', '{"hpCurrent":10}'
);

-- Neither signed-out nor signed-in browsers can call create_character. Repeat
-- the anonymous attempt to prove the denial is stable rather than rate-based.
set local role anon;
select pg_temp.expect_denied($sql$
  select * from public.create_character('attacker-1', 'Spam', '{}', '{}')
$sql$);
select pg_temp.expect_denied($sql$
  select * from public.create_character('attacker-2', 'Spam', '{}', '{}')
$sql$);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33800000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select pg_temp.expect_denied($sql$
  select * from public.create_character('attacker-3', 'Spam', '{}', '{}')
$sql$);

-- Authenticated creation uses the direct table path and remains allowed by RLS.
insert into public.characters (id, name, data, live, owner_user_id)
values (
  '33800000-0000-0000-0000-000000000020', 'Authenticated', '{}', '{}',
  '33800000-0000-0000-0000-000000000001'
);
-- A signed-in browser may still open an existing capability link.
select pg_temp.assert_true(
  (select count(*) = 1
          and bool_and(
            id = '33800000-0000-0000-0000-000000000010'
            and data = '{"version":0}'::jsonb
          )
     from public.get_character('issue338-guest-token')),
  'authenticated get_character must return the expected guest row'
);
reset role;

-- Existing guest links retain read, structural-update, and live-patch access.
set local role anon;
select pg_temp.assert_true(
  (select count(*) = 1
          and bool_and(
            id = '33800000-0000-0000-0000-000000000010'
            and data = '{"version":0}'::jsonb
          )
     from public.get_character('issue338-guest-token')),
  'anonymous get_character must return the expected guest row'
);
select * from public.update_character_data(
  'issue338-guest-token', 'Guest updated', '{"version":1}', 0
);
select * from public.patch_live(
  'issue338-guest-token', '{"hpCurrent":9}'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.list_characters('issue338-guest-owner')),
  'list_characters must return the owned guest row'
);
reset role;
select pg_temp.assert_guest_state();

-- The remaining owner-key capabilities stay available. Rotate first, then
-- delete the row and assert both RPCs returned their success result.
set local role anon;
select pg_temp.assert_true(
  (select count(*) = 1 and bool_and(token is not null)
     from public.rotate_token(
       'issue338-guest-owner',
       '33800000-0000-0000-0000-000000000010'
     )),
  'rotate_token must return one replacement token'
);
select pg_temp.assert_true(
  public.delete_character(
    'issue338-guest-owner',
    '33800000-0000-0000-0000-000000000010'
  ) = 1,
  'delete_character must delete the owned guest row'
);
reset role;

-- Every stored payload path is bounded. Test direct authenticated creation and
-- capability updates so neither plane can bypass the table constraints.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33800000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select pg_temp.expect_check_violation($sql$
  insert into public.characters (name, data, live, owner_user_id)
  values (
    repeat('n', 201), '{}', '{}',
    '33800000-0000-0000-0000-000000000001'
  )
$sql$);
select pg_temp.expect_check_violation($sql$
  insert into public.characters (name, data, live, owner_user_id)
  values (
    'Array data', '[]', '{}',
    '33800000-0000-0000-0000-000000000001'
  )
$sql$);
select pg_temp.expect_check_violation($sql$
  insert into public.characters (name, data, live, owner_user_id)
  values (
    'Oversize data', jsonb_build_object('blob', repeat('x', 262144)), '{}',
    '33800000-0000-0000-0000-000000000001'
  )
$sql$);
reset role;

set local role anon;
select pg_temp.expect_check_violation($sql$
  select * from public.patch_live(
    'issue338-limit-token', jsonb_build_object('blob', repeat('x', 65536))
  )
$sql$);
select pg_temp.expect_check_violation($sql$
  select * from public.update_character_data(
    'issue338-limit-token', 'Array data', '[]', 0
  )
$sql$);
reset role;

select true as anonymous_creation_controls_verified;
rollback;
