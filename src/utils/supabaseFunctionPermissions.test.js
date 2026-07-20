import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/0004_function_permissions.sql',
  'utf8'
)

const guestRpcs = [
  'create_character(text, text, jsonb, jsonb)',
  'get_character(text)',
  'update_character_data(text, text, jsonb, bigint)',
  'patch_live(text, jsonb)',
  'list_characters(text)',
  'rotate_token(text, uuid)',
  'delete_character(text, uuid)',
]

describe('Supabase function-permission migration', () => {
  it('moves role helpers into an unexposed schema and removes public aliases', () => {
    expect(migration).toContain('create or replace function private.caller_role()')
    expect(migration).toContain('create or replace function private.is_gm_or_admin()')
    expect(migration).toContain('drop function if exists public.is_gm_or_admin()')
    expect(migration).toContain('drop function if exists public.caller_role()')
  })

  it('uses invoker security for authenticated live patches', () => {
    const patchFunction = migration.slice(
      migration.indexOf('create or replace function public.patch_live_by_id'),
      migration.indexOf('-- The policies and trigger now use private helpers')
    )
    expect(patchFunction).toContain('security invoker')
    expect(patchFunction).not.toContain('security definer')
    expect(migration).toContain('grant execute on function public.patch_live_by_id(uuid, jsonb)\n  to authenticated')
  })

  it('revokes direct execution from every internal or trigger-only function', () => {
    for (const fn of ['public._h(text)', 'public._mint_token()', 'public.handle_new_user()', 'public.guard_role_change()']) {
      expect(migration).toContain(fn)
    }
    expect(migration).toContain('from public, anon, authenticated')
  })

  it('preserves the complete capability API for anonymous and signed-in links', () => {
    for (const signature of guestRpcs) expect(migration).toContain(`public.${signature}`)
    expect(migration).toContain('to anon, authenticated')
  })

  it('makes execution opt-in for future public functions', () => {
    expect(migration).toContain('alter default privileges\n  revoke execute')
    expect(migration).not.toContain('alter default privileges in schema public')
    expect(migration).toContain('revoke execute on functions from public, anon, authenticated')
  })
})
