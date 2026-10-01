import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CLIENT_IDENTITY_KEYS,
  GUEST_REALTIME_ROLE,
  HOME_CAMPAIGN_ID,
  REALTIME_TOKEN_TTL_SECONDS,
  buildCharacterGrantClaims,
  buildGmGrantClaims,
  characterTopic,
  stripRollIdentity,
  tableTopic,
} from '../../supabase/functions/_shared/realtimeContract.js'

const migration = readFileSync('supabase/migrations/0007_realtime_authorization.sql', 'utf8')
const tokenFunction = readFileSync('supabase/functions/realtime-token/index.ts', 'utf8')

describe('realtime contract', () => {
  it('builds character and GM claims the policies read', () => {
    expect(buildCharacterGrantClaims({
      characterId: 'char-1', campaignId: HOME_CAMPAIGN_ID, tokenHash: 'abc',
    })).toEqual({
      realtime_scope: 'character',
      character_id: 'char-1',
      campaign_id: HOME_CAMPAIGN_ID,
      token_hash: 'abc',
    })
    expect(buildGmGrantClaims({ ownerHash: 'def' })).toEqual({
      realtime_scope: 'gm',
      owner_hash: 'def',
    })
    expect(characterTopic('char-1')).toBe('char:char-1')
    expect(tableTopic(HOME_CAMPAIGN_ID)).toBe(`table:${HOME_CAMPAIGN_ID}`)
  })

  it('strips every client identity field before a roll is published', () => {
    const stripped = stripRollIdentity({
      kind: 'initiative', total: 11, actor: 'Hacker', rosterId: 'fake',
      characterId: 'fake', userId: 'fake', campaignId: 'fake', ts: 1,
      gmTarget: 50, transport: 'local',
    })
    expect(stripped).toEqual({ kind: 'initiative', total: 11 })
    for (const key of CLIENT_IDENTITY_KEYS) expect(migration).toContain(`'${key}'`)
  })

  it('keeps the database, the token function, and the TTL on the same secret', () => {
    expect(REALTIME_TOKEN_TTL_SECONDS).toBe(600)
    expect(migration).toContain(HOME_CAMPAIGN_ID)
    expect(migration).toContain(GUEST_REALTIME_ROLE)
    expect(migration).not.toMatch(/for insert[\s\S]{0,80}realtime\.messages/i)
    expect(migration).toContain('session:default')
    expect(tokenFunction).toContain('REALTIME_TOKEN_TTL_SECONDS')
    expect(tokenFunction).toContain('GUEST_REALTIME_ROLE')
    expect(tokenFunction).toContain('lookup_realtime_capability')
    expect(tokenFunction).toContain('lookup_realtime_gm')
    expect(readFileSync('supabase/config.toml', 'utf8')).toContain('verify_jwt = false')
  })
})
