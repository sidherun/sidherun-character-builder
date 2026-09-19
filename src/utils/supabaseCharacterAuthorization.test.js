import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/0005_character_update_authorization.sql',
  'utf8'
)

describe('Supabase character-update authorization migration', () => {
  it('lets owners and assignees remain in update scope', () => {
    const policy = migration.slice(
      migration.indexOf('create policy chars_update'),
      migration.indexOf('-- The authenticated live RPC')
    )
    expect(policy).toContain('owner_user_id = auth.uid()')
    expect(policy).toContain('assigned_player_id = auth.uid()')
    expect(policy).toContain('private.is_gm_or_admin()')
    expect(policy).toContain('with check')
  })

  it('guards authorization, capability, and revision columns for non-GMs', () => {
    for (const column of [
      'owner_user_id', 'assigned_player_id', 'token_hash', 'owner_hash',
      'data_rev', 'live_rev',
    ]) {
      expect(migration).toContain(`new.${column} is distinct from old.${column}`)
    }
    expect(migration).toContain("using errcode = '42501'")
  })

  it('keeps direct authenticated revisions server-maintained', () => {
    expect(migration).toContain('new.data_rev := old.data_rev + 1')
    expect(migration).toContain('new.live_rev := old.live_rev + 1')
    const liveRpc = migration.slice(
      migration.indexOf('create or replace function public.patch_live_by_id'),
      migration.indexOf('revoke execute on function public.patch_live_by_id')
    )
    expect(liveRpc).toContain('security invoker')
    expect(liveRpc).not.toContain('live_rev = c.live_rev + 1')
  })

  it('limits the direct-client guard so capability RPCs keep definer behavior', () => {
    expect(migration).toContain("current_user = 'authenticated'")
    expect(migration).toContain('Capability-token RPCs remain SECURITY DEFINER and unchanged')
  })
})
