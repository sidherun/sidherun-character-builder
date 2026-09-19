import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/0006_anonymous_creation_controls.sql',
  'utf8'
)
const verifier = readFileSync(
  'supabase/verify_anonymous_creation_controls.sql',
  'utf8'
)
const cloudSync = readFileSync('src/utils/cloudSync.js', 'utf8')
const rosterPage = readFileSync('src/pages/RosterPage.jsx', 'utf8')

describe('Supabase anonymous-creation controls', () => {
  it('removes create_character execution from every browser-facing role', () => {
    expect(migration).toContain(
      'revoke execute on function public.create_character(text, text, jsonb, jsonb)'
    )
    expect(migration).toContain('from public, anon, authenticated')
    expect(migration).not.toContain('grant execute on function public.create_character')
  })

  it('requires bounded object payloads and a bounded name', () => {
    expect(migration).toContain('check (char_length(name) <= 200)')
    expect(migration).toContain("check (jsonb_typeof(data) = 'object')")
    expect(migration).toContain('check (octet_length(data::text) <= 262144)')
    expect(migration).toContain("check (jsonb_typeof(live) = 'object')")
    expect(migration).toContain('check (octet_length(live::text) <= 65536)')
    expect(migration.match(/validate constraint/g)).toHaveLength(5)
  })

  it('ships an executable denial, compatibility, and limit matrix', () => {
    expect(verifier.match(/public\.create_character/g)).toHaveLength(3)
    expect(verifier).toContain('insert into public.characters')
    for (const rpc of [
      'get_character', 'update_character_data', 'patch_live',
      'list_characters', 'rotate_token', 'delete_character',
    ]) {
      expect(verifier).toContain(`public.${rpc}`)
    }
    expect(verifier).toContain('repeat(\'n\', 201)')
    expect(verifier).toContain("'Array data', '[]'")
    expect(verifier).toContain("repeat('x', 262144)")
    expect(verifier).toContain("repeat('x', 65536)")
    expect(verifier.match(/from public\.get_character\('issue338-guest-token'\)/g)).toHaveLength(2)
    expect(verifier).toContain('anonymous get_character must return the expected guest row')
    expect(verifier).toContain('authenticated get_character must return the expected guest row')
  })

  it('makes invoker test helpers callable after switching to API roles', () => {
    expect(verifier).toContain('pg_my_temp_schema()::regnamespace::text')
    expect(verifier).toContain("'grant usage on schema %I to anon, authenticated'")
    for (const helper of [
      '%1$I.expect_denied(text)',
      '%1$I.expect_check_violation(text)',
      '%1$I.assert_true(boolean, text)',
    ]) {
      expect(verifier).toContain(helper)
    }
    expect(verifier).toContain('to anon, authenticated')
  })

  it('retires the anonymous creation client and its roster control', () => {
    expect(cloudSync).not.toContain("rpc('create_character'")
    expect(cloudSync).not.toContain('pushRoster')
    expect(rosterPage).not.toContain('Push to cloud')
  })
})
