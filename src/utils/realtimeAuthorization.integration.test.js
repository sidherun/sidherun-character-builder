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
})
