import { describe, it, expect, afterEach, vi } from 'vitest'

const cloud = vi.hoisted(() => ({
  results: [], calls: [], sends: [], removed: [],
}))

vi.mock('./supabaseClient.js', () => ({
  cloudEnabled: true,
  authEnabled: false,
  supabase: {
    rpc: vi.fn(async (fn, params) => {
      cloud.calls.push({ fn, params })
      return cloud.results.shift() || { data: [], error: null }
    }),
    channel: vi.fn(() => {
      const ch = {
        on() { return ch },
        subscribe() { return ch },
        send(payload) { cloud.sends.push(payload); return ch },
      }
      return ch
    }),
    removeChannel: vi.fn(ch => cloud.removed.push(ch)),
  },
}))

import {
  projectLive, foldLive, dataSignature, chooseChannel, mergeRemote, qrLinkFor,
  rosterIdForCloudId, registerCloudLink, getCloudMap, subscribeCharacter,
  syncCharacter, pushRoster,
} from './cloudSync.js'
import { createDefaultCharacter } from './defaultCharacter.js'

const mk = () => {
  const c = createDefaultCharacter()
  c._rosterId = 'r1'
  c.name = 'Hero'
  c.hitPoints = { total: 40, current: 40 }
  c.mana = { total: 10, current: 8 }
  c.storyPoints = { total: 2, current: 2 }
  c.armor = { type: 'leather', absorption: 2, remaining: 6, max: 6 }
  c.skills = [{ id: 's1', name: 'Dodge', attributeName: 'agility', attributeScore: 10, skillPoints: 5, tempMod: 0, isSpecialty: false, usePips: 3 }]
  return c
}

describe('projectLive', () => {
  it('extracts the live counters incl. per-skill pips', () => {
    expect(projectLive(mk())).toEqual({
      hpCurrent: 40, manaCurrent: 8, spCurrent: 2, armorRemaining: 6, usePips: { s1: 3 },
    })
  })
})

describe('foldLive', () => {
  it('round-trips with projectLive', () => {
    const c = mk()
    const folded = foldLive(c, projectLive(c))
    expect(projectLive(folded)).toEqual(projectLive(c))
  })
  it('applies a remote patch onto the character', () => {
    const c = mk()
    const next = foldLive(c, { hpCurrent: 12, usePips: { s1: 7 } })
    expect(next.hitPoints.current).toBe(12)
    expect(next.skills[0].usePips).toBe(7)
    expect(next.mana.current).toBe(8) // untouched
  })
})

describe('dataSignature', () => {
  it('ignores live-only changes', () => {
    const a = mk(); const b = mk()
    b.hitPoints.current = 1; b.armor.remaining = 0; b.skills[0].usePips = 9
    expect(dataSignature(a)).toBe(dataSignature(b))
  })
  it('reflects structural changes', () => {
    const a = mk(); const b = mk(); b.name = 'Renamed'
    expect(dataSignature(a)).not.toBe(dataSignature(b))
  })
})

describe('chooseChannel', () => {
  it('first push (no prev) → data', () => {
    expect(chooseChannel(undefined, mk())).toBe('data')
  })
  it('no change → none', () => {
    const c = mk()
    expect(chooseChannel(c, JSON.parse(JSON.stringify(c)))).toBe('none')
  })
  it('live-only change → live', () => {
    const a = mk(); const b = mk(); b.hitPoints.current = 20
    expect(chooseChannel(a, b)).toBe('live')
  })
  it('structural change → data', () => {
    const a = mk(); const b = mk(); b.name = 'New'
    expect(chooseChannel(a, b)).toBe('data')
  })
})

describe('rosterIdForCloudId (prevents owner self-duplication)', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('finds the local rosterId already mapped to a cloud id, else null', () => {
    vi.stubGlobal('localStorage', {
      getItem: k => (k === 'sidherun_cloud_map' ? JSON.stringify({ d1: { id: 'X', token: 't' } }) : null),
      setItem() {}, removeItem() {},
    })
    expect(rosterIdForCloudId('X')).toBe('d1')
    expect(rosterIdForCloudId('Y')).toBeNull()
  })
})

describe('qrLinkFor (printout QR target)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses the live cloud link when the character is cloud-mapped', () => {
    vi.stubGlobal('localStorage', {
      getItem: k => (k === 'sidherun_cloud_map' ? JSON.stringify({ r1: { id: 'abc', token: 'tok' } }) : null),
      setItem() {}, removeItem() {},
    })
    expect(qrLinkFor({ _rosterId: 'r1' })).toContain('#c=abc~tok')
  })

  it('falls back to the embedded #play= link when not synced', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} })
    expect(qrLinkFor(mk())).toContain('#play=')
  })
})

describe('mergeRemote', () => {
  it('applies a remote live payload', () => {
    const next = mergeRemote(mk(), { live: { hpCurrent: 9, usePips: { s1: 6 } } })
    expect(next.hitPoints.current).toBe(9)
    expect(next.skills[0].usePips).toBe(6)
  })
  it('ignores empty / foreign payloads', () => {
    const c = mk()
    expect(mergeRemote(c, {})).toBe(c)
    expect(mergeRemote(c, null)).toBe(c)
    expect(mergeRemote(null, { live: {} })).toBe(null)
  })
})

function memoryStorage(seed = {}) {
  const values = { ...seed }
  return {
    getItem: key => values[key] ?? null,
    setItem: (key, value) => { values[key] = String(value) },
    removeItem: key => { delete values[key] },
  }
}

describe('dead cloud mapping recovery (#252)', () => {
  afterEach(() => vi.unstubAllGlobals())

  function setup(rosterId) {
    vi.stubGlobal('localStorage', memoryStorage({ sidherun_gm_key: 'gm_test' }))
    cloud.results = []
    cloud.calls = []
    cloud.sends = []
    cloud.removed = []
    registerCloudLink(rosterId, { id: `old-${rosterId}`, token: `dead-${rosterId}` })
    subscribeCharacter(rosterId, () => {})
    return { ...mk(), _rosterId: rosterId }
  }

  it('rejects a dead structural write, removes its mapping, and does not broadcast', async () => {
    const c = setup('dead-data')
    cloud.results.push({ data: [], error: null })

    await expect(syncCharacter(c)).rejects.toThrow('mapping is no longer valid')

    expect(getCloudMap()['dead-data']).toBeUndefined()
    expect(cloud.sends).toEqual([])
    expect(cloud.removed).toHaveLength(1)
  })

  it('rejects a dead live write, removes its mapping, and does not broadcast', async () => {
    const c = setup('dead-live')
    cloud.results.push({ data: [{ id: 'old-dead-live' }], error: null })
    await syncCharacter(c)
    cloud.sends = []

    const changed = { ...c, hitPoints: { ...c.hitPoints, current: 12 } }
    cloud.results.push({ data: [], error: null })
    await expect(syncCharacter(changed)).rejects.toThrow('mapping is no longer valid')

    expect(cloud.calls.at(-1).fn).toBe('patch_live')
    expect(getCloudMap()['dead-live']).toBeUndefined()
    expect(cloud.sends).toEqual([])
  })

  it('recreates a dead mapped row during explicit roster push and reports it as new', async () => {
    const c = setup('dead-push')
    cloud.results.push(
      { data: [], error: null },
      { data: [{ id: 'new-id', token: 'new-token' }], error: null },
    )

    await expect(pushRoster([c])).resolves.toEqual({ created: 1, updated: 0, failed: 0 })
    expect(cloud.calls.map(x => x.fn)).toEqual(['update_character_data', 'create_character'])
    expect(getCloudMap()['dead-push']).toEqual({ id: 'new-id', token: 'new-token' })
  })

  it('validates and recreates a mapped row on explicit push even when the snapshot is unchanged', async () => {
    const c = setup('dead-unchanged')
    cloud.results.push({ data: [{ id: 'old-dead-unchanged' }], error: null })
    await syncCharacter(c)
    cloud.calls = []
    cloud.sends = []
    cloud.results.push(
      { data: [], error: null },
      { data: [{ id: 'replacement', token: 'replacement-token' }], error: null },
    )

    await expect(pushRoster([c])).resolves.toEqual({ created: 1, updated: 0, failed: 0 })
    expect(cloud.calls.map(x => x.fn)).toEqual(['update_character_data', 'create_character'])
    expect(cloud.sends).toEqual([])
  })

  it('keeps a healthy mapped row counted as updated', async () => {
    const c = setup('healthy')
    cloud.results.push({ data: [{ id: 'old-healthy' }], error: null })

    await expect(pushRoster([c])).resolves.toEqual({ created: 0, updated: 1, failed: 0 })
    expect(getCloudMap().healthy).toBeTruthy()
  })
})
