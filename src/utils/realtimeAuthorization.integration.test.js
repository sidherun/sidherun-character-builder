import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const migration = (name) => readFileSync(`supabase/migrations/${name}`, 'utf8')

function withoutModdatetime(sql) {
  return sql.replace(
    'create extension if not exists moddatetime with schema extensions;',
    `create schema if not exists extensions;
     create or replace function extensions.moddatetime()
     returns trigger language plpgsql as $mod$
     begin
       new.updated_at = now();
       return new;
     end
     $mod$;`,
  )
}

async function boot() {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`
    create schema if not exists extensions;
    create extension if not exists pgcrypto with schema extensions;
    create schema if not exists auth;
    create table auth.users (
      instance_id uuid,
      id uuid primary key,
      aud text,
      role text,
      email text,
      encrypted_password text,
      email_confirmed_at timestamptz,
      raw_app_meta_data jsonb,
      raw_user_meta_data jsonb,
      created_at timestamptz,
      updated_at timestamptz,
      confirmation_token text,
      email_change text,
      email_change_token_new text,
      recovery_token text
    );
    create or replace function auth.uid() returns uuid
    language sql stable as $fn$
      select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
      )::uuid
    $fn$;

    create role anon nologin noinherit;
    create role authenticated nologin noinherit;
    create role authenticator nologin noinherit;
    create role service_role nologin noinherit;
    grant anon, authenticated, service_role to authenticator;

    create publication supabase_realtime;
    create schema if not exists realtime;
    -- Hosted shape: partitioned parent with RLS, daily partitions without it,
    -- and no grants on the partitions. Parent policies still filter a query
    -- of the parent.
    create table realtime.messages (
      id uuid default gen_random_uuid(),
      topic text not null,
      extension text not null,
      payload jsonb,
      event text,
      private boolean default false,
      inserted_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    ) partition by range (inserted_at);
    create table realtime.messages_2026 partition of realtime.messages
      for values from ('2020-01-01') to ('2030-01-01');
    alter table realtime.messages enable row level security;
    revoke all on realtime.messages from public, anon, authenticated;
    create or replace function realtime.topic() returns text
    language sql stable as $fn$
      select nullif(current_setting('realtime.topic', true), '')
    $fn$;
    create or replace function realtime.send(
      payload jsonb, event text, topic text, private boolean default true
    ) returns void language plpgsql as $fn$
    begin
      raise exception 'realtime.send test double was not installed';
    end
    $fn$;
  `)

  for (const file of [
    '0001_init.sql',
    '0002_auth_roles.sql',
    '0003_updated_at_trigger.sql',
    '0004_function_permissions.sql',
    '0005_character_update_authorization.sql',
    '0006_anonymous_creation_controls.sql',
    '0007_realtime_authorization.sql',
    '0008_home_campaign_insert.sql',
  ]) {
    const sql = file.startsWith('0003') ? withoutModdatetime(migration(file)) : migration(file)
    await db.exec(sql)
  }
  // Realtime's own migration grants these on the parent. anon can run SELECT;
  // the policies are what hide the rows. CI used to model a missing grant,
  // which is not what hosted Supabase does.
  await db.exec(`
    grant usage on schema realtime to anon;
    grant select, insert, update on realtime.messages to anon, authenticated;
  `)
  return db
}

describe('realtime authorization matrix', () => {
  it('allows members and a current capability token, and refuses everyone else', async () => {
    const db = await boot()
    await db.exec("select set_config('sidherun.realtime_test_stub', 'on', false)")
    const result = await db.exec(readFileSync('supabase/verify_realtime_authorization.sql', 'utf8'))
    const rows = result.find(entry => entry.rows?.some(row => 'realtime_authorization_ok' in row))
    expect(rows?.rows?.[0]?.realtime_authorization_ok).toBe(true)
    await db.close()
  }, 60000)

  it('lets a non-GM with no characters insert into the home campaign only', async () => {
    const db = await boot()
    const result = await db.exec(`
      begin;

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000',
        '00800000-0000-4000-8000-0000000000a1',
        'authenticated', 'authenticated', 'issue008-player@example.invalid', '', now(),
        '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
      );

      insert into public.campaigns (id, slug, name)
      values ('00800000-0000-4000-8000-0000000000c2', 'issue008-other', 'Other table');

      -- Hosted Supabase grants this. The invoker guard calls auth.uid().
      grant usage on schema auth to authenticated;

      select set_config('request.jwt.claim.sub', '00800000-0000-4000-8000-0000000000a1', true);
      select set_config('request.jwt.claim.role', 'authenticated', true);
      select set_config(
        'request.jwt.claims',
        '{"sub":"00800000-0000-4000-8000-0000000000a1","role":"authenticated"}',
        true
      );
      set local role authenticated;

      do $$
      declare
        visible int;
        placed uuid;
        home uuid;
      begin
        select count(*) into visible from public.campaigns;
        if visible <> 0 then
          raise exception 'new player can see campaigns (%); the rls blind spot was not reproduced', visible;
        end if;

        -- Same shape as the app: campaign_id omitted, column default applies.
        insert into public.characters (name, data, owner_user_id)
        values ('First', '{"version":0}', '00800000-0000-4000-8000-0000000000a1');

        select c.campaign_id, home_row.id
          into placed, home
          from public.characters c
          join public.campaigns home_row on home_row.slug = 'home'
         where c.name = 'First';
        if placed is distinct from home then
          raise exception 'first character landed on %, home is %', placed, home;
        end if;

        begin
          insert into public.characters (name, data, owner_user_id, campaign_id)
          values (
            'Elsewhere', '{"version":0}',
            '00800000-0000-4000-8000-0000000000a1',
            '00800000-0000-4000-8000-0000000000c2'
          );
          raise exception 'non-home insert was allowed';
        exception
          when insufficient_privilege then
            if sqlerrm not like '%another campaign%' then
              raise;
            end if;
        end;

        insert into public.characters (name, data, owner_user_id, campaign_id)
        values (
          'Explicit null', '{"version":0}',
          '00800000-0000-4000-8000-0000000000a1',
          null
        );
        select campaign_id into placed from public.characters where name = 'Explicit null';
        if placed is distinct from home then
          raise exception 'null campaign_id was not resolved to home: %', placed;
        end if;
      end $$;

      select true as first_character_insert_ok;
      rollback;
    `)
    const rows = result.find(entry => entry.rows?.some(row => 'first_character_insert_ok' in row))
    expect(rows?.rows?.[0]?.first_character_insert_ok).toBe(true)
    await db.close()
  }, 60000)
})

describe('authenticated backup restore (#337)', () => {
  it('updates data and live atomically, preserves identity, and refuses stale or other-user writes', async () => {
    const db = await boot()
    try {
      await db.exec("select set_config('sidherun.realtime_test_stub', 'on', false)")
      const result = await db.exec(`
        begin;
        insert into auth.users (id, email, raw_user_meta_data) values
          ('33700000-0000-4000-8000-000000000001', 'restore-owner@example.invalid', '{}'),
          ('33700000-0000-4000-8000-000000000002', 'restore-other@example.invalid', '{}');
        insert into public.characters (id, name, data, live, owner_user_id)
        values ('33700000-0000-4000-8000-000000000003', 'Oryn current', '{"name":"Oryn current"}', '{"hpCurrent":40}', '33700000-0000-4000-8000-000000000001');
        grant usage on schema auth to authenticated;
        select set_config('request.jwt.claim.sub', '33700000-0000-4000-8000-000000000001', true);
        set local role authenticated;
        do $$
        declare changed int; current_row public.characters%rowtype;
        begin
          update public.characters
          set name='Oryn restored', data='{"name":"Oryn restored","backstory":"Recovered history"}',
              live='{"hpCurrent":17,"manaCurrent":8,"spCurrent":1,"armorRemaining":6}'
          where id='33700000-0000-4000-8000-000000000003' and data_rev=0 and live_rev=0;
          get diagnostics changed = row_count;
          if changed <> 1 then raise exception 'restore did not update one row'; end if;
          select * into current_row from public.characters where id='33700000-0000-4000-8000-000000000003';
          if current_row.owner_user_id <> '33700000-0000-4000-8000-000000000001'
            or current_row.assigned_player_id is not null
            or current_row.data_rev <> 1 or current_row.live_rev <> 1
            or current_row.live->>'hpCurrent' <> '17'
            or current_row.live->>'manaCurrent' <> '8'
            or current_row.live->>'spCurrent' <> '1'
            or current_row.live->>'armorRemaining' <> '6'
            or current_row.data->>'backstory' <> 'Recovered history'
          then raise exception 'restore lost values, revisions or identity'; end if;
          update public.characters set name='Stale overwrite'
          where id='33700000-0000-4000-8000-000000000003' and data_rev=0 and live_rev=0;
          get diagnostics changed = row_count;
          if changed <> 0 then raise exception 'stale restore was accepted'; end if;
        end $$;
        select set_config('request.jwt.claim.sub', '33700000-0000-4000-8000-000000000002', true);
        do $$ declare changed int; begin
          update public.characters set name='Unauthorized overwrite', live='{"hpCurrent":1}'
          where id='33700000-0000-4000-8000-000000000003' and data_rev=1 and live_rev=1;
          get diagnostics changed = row_count;
          if changed <> 0 then raise exception 'other user could replace the character'; end if;
        end $$;
        select true as authenticated_restore_ok;
        rollback;
      `)
      const rows = result.find(entry => entry.rows?.some(row => 'authenticated_restore_ok' in row))
      expect(rows?.rows?.[0]?.authenticated_restore_ok).toBe(true)
    } finally { await db.close() }
  }, 60000)
})
