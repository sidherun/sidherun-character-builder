import { describe, it, expect, beforeEach, vi } from 'vitest'

// Shared mock state (hoisted so the vi.mock factory may reference it).
const h = vi.hoisted(() => ({
  result: { data: null, error: null },
  table: null, op: null, payload: null, rpc: null,
}))

vi.mock('./supabaseClient.js', () => {
  const builder = () => {
    const b = {
      select() { return b },
      order() { return b },
      eq(col, val) { (h.eqs ||= []).push([col, val]); return b },
      maybeSingle() { return b },
      single() { return b },
      insert(p) { h.op = 'insert'; h.payload = p; return b },
      update(p) { h.op = 'update'; h.payload = p; return b },
      delete() { h.op = 'delete'; return b },
      // Per-query results: when h.results is a non-empty queue, each awaited
      // query consumes the next entry (so a create-or-update flow can return a
      // different row for its lookup vs. its write); otherwise fall back to the
      // single shared h.result.
      then(res, rej) {
        const next = (h.results && h.results.length) ? h.results.shift() : h.result
        return Promise.resolve(next).then(res, rej)
      },
    }
    return b
  }
  return {
    authEnabled: true,
    supabase: {
      from(t) { h.table = t; return builder() },
      rpc(fn, args) { h.rpc = { fn, args }; return Promise.resolve(h.result) },
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      channel() {
        const ch = { on() { return ch }, subscribe() { return ch }, send(p) { (h.sends ||= []).push(p); return ch } }
        return ch
      },
      removeChannel() {},
    },
  }
})

import {
  repoEnabled, listCharacters, getCharacter, createCharacter, saveCharacterData,
  upsertCharacter, patchLive, assignPlayer, deleteCharacter, listPlayers, setDisplayName, reconcile,
  subscribeLive, removeLiveSubscription,
} from './characterRepo.js'

const row = (over = {}) => ({
  id: 'c1', name: 'Hero',
  data: {
    name: 'Hero', hitPoints: { total: 40, current: 40 }, mana: { total: 0, current: 0 },
    storyPoints: { total: 0, current: 0 }, armor: { remaining: 0 }, skills: [],
  },
  live: { hpCurrent: 30 },
  owner_user_id: 'u1', assigned_player_id: null,
  data_rev: 1, live_rev: 0, updated_at: '2026-06-28T00:00:00Z',
  ...over,
})

beforeEach(() => {
  h.result = { data: null, error: null }
  h.results = null
  h.table = h.op = h.payload = h.rpc = null
  h.eqs = []
  h.sends = []
})

describe('repoEnabled', () => {
  it('is true when auth is enabled and supabase exists', () => {
    expect(repoEnabled()).toBe(true)
  })
})

describe('row → character mapping', () => {
  it('folds live counters, stamps _rosterId from the row id, and surfaces ownership', async () => {
    h.result = { data: [row()], error: null }
    const [c] = await listCharacters()
    expect(c._rosterId).toBe('c1')          // _rosterId === row id
    expect(c.hitPoints.current).toBe(30)    // live folded over data (40 → 30)
    expect(c._ownerUserId).toBe('u1')
    expect(c._assignedPlayerId).toBeNull()
    expect(c._updatedAt).toBe('2026-06-28T00:00:00Z')
    expect(h.table).toBe('characters')
  })

  it('getCharacter returns null for a missing row', async () => {
    h.result = { data: null, error: null }
    expect(await getCharacter('nope')).toBeNull()
  })

  it('migrates legacy weapon damage while mapping cloud rows', async () => {
    h.result = { data: [row({
      data: { ...row().data, weapons: [{ id: 'w1', attribute: 'dexterity', descriptor: '1d8 piercing, ranged' }] },
    })], error: null }
    const [c] = await listCharacters()
    expect(c.weapons[0]).toMatchObject({ damageDice: '1d8', damageType: 'piercing', isMelee: false })
  })
})

describe('createCharacter', () => {
  it('inserts with the signed-in user as owner and strips local-only markers', async () => {
    h.result = { data: row(), error: null }
    const c = await createCharacter({
      name: 'Hero', _rosterId: 'local-x', _ownerUserId: 'stale', hitPoints: { total: 40, current: 40 },
    })
    expect(h.op).toBe('insert')
    expect(h.payload.owner_user_id).toBe('u1')
    expect(h.payload.data._rosterId).toBeUndefined()   // identity lives in the row
    expect(h.payload.data._ownerUserId).toBeUndefined()
    expect(c._rosterId).toBe('c1')
  })
})

describe('saveCharacterData', () => {
  it('updates the row blob and returns the mapped character', async () => {
    const r = row()
    r.data = { ...r.data, name: 'Renamed' } // the character name lives in `data`
    h.result = { data: r, error: null }
    const c = await saveCharacterData('c1', { name: 'Renamed', hitPoints: { total: 40, current: 40 } })
    expect(h.op).toBe('update')
    expect(h.payload.name).toBe('Renamed')   // the `name` column we send
    expect(c.name).toBe('Renamed')           // mapped back from data
  })

  // Optimistic concurrency (#146)
  it('with expectedRev: guards on data_rev and bumps it', async () => {
    h.result = { data: row({ data_rev: 7 }), error: null } // server returns the bumped row
    const c = await saveCharacterData('c1', { name: 'Hero' }, 6)
    expect(h.payload.data_rev).toBe(7)                 // bumped expectedRev + 1
    expect(h.eqs).toContainEqual(['data_rev', 6])      // guarded on the expected rev
    expect(h.eqs).toContainEqual(['id', 'c1'])
    expect(c._dataRev).toBe(7)                         // returns the new rev
  })

  it('with expectedRev: a null result is a CONFLICT, not a silent overwrite', async () => {
    h.result = { data: null, error: null } // no row matched the expected rev
    expect(await saveCharacterData('c1', { name: 'Hero' }, 6)).toEqual({ conflict: true })
  })

  it('without expectedRev: unconditional update (fail-safe, pre-#146 behaviour)', async () => {
    h.result = { data: row(), error: null }
    await saveCharacterData('c1', { name: 'Hero' }) // no expectedRev
    expect(h.payload).not.toHaveProperty('data_rev')            // no rev bump
    expect(h.eqs).not.toContainEqual(['data_rev', expect.anything()]) // no rev guard
  })

  it('surfaces _dataRev on the mapped character', async () => {
    h.result = { data: row({ data_rev: 3 }), error: null }
    const c = await saveCharacterData('c1', { name: 'Hero' })
    expect(c._dataRev).toBe(3)
  })
})

// The #127 dedup guard: an explicit save must UPDATE an existing cloud row,
// never INSERT a second one, even when the working character is a stale
// localStorage 'current' draft that lost its _ownerUserId marker.
describe('upsertCharacter (create-vs-update keyed on row existence, #127)', () => {
  it('updates in place when a cloud row already exists for the _rosterId', async () => {
    // getCharacter lookup finds the row → write takes the update branch. The
    // stale draft has NO _ownerUserId, proving we key on existence, not the marker.
    h.results = [{ data: row(), error: null }, { data: row(), error: null }]
    const c = await upsertCharacter({ name: 'Hero', _rosterId: 'c1' })
    expect(h.op).toBe('update')          // updated, not inserted → no duplicate
    expect(c._rosterId).toBe('c1')
  })

  it('creates when the _rosterId has no matching cloud row (fresh local draft)', async () => {
    // Lookup misses (null) → insert. A local uuid that was never pushed to cloud.
    h.results = [{ data: null, error: null }, { data: row(), error: null }]
    const c = await upsertCharacter({ name: 'Hero', _rosterId: 'local-x' })
    expect(h.op).toBe('insert')
    expect(c._rosterId).toBe('c1')
  })

  it('creates without a lookup when there is no _rosterId at all', async () => {
    h.results = [{ data: row(), error: null }] // single query: the insert
    const c = await upsertCharacter({ name: 'Hero' })
    expect(h.op).toBe('insert')
    expect(c._rosterId).toBe('c1')
  })

  it('propagates a lookup error instead of falling through to create (no dup on a transient failure)', async () => {
    h.result = { data: null, error: new Error('network') }
    await expect(upsertCharacter({ name: 'Hero', _rosterId: 'c1' })).rejects.toThrow('network')
    expect(h.op).toBeNull() // never reached a write
  })
})

describe('patchLive', () => {
  it('calls the atomic patch_live_by_id RPC with the projected counters', async () => {
    h.result = { data: null, error: null }
    await patchLive('c1', { hitPoints: { current: 12 }, mana: { current: 0 }, storyPoints: { current: 0 }, armor: { remaining: 0 }, skills: [] })
    expect(h.rpc.fn).toBe('patch_live_by_id')
    expect(h.rpc.args.p_id).toBe('c1')
    expect(h.rpc.args.p_patch.hpCurrent).toBe(12)
  })
})

describe('assignPlayer', () => {
  it('updates assigned_player_id', async () => {
    h.result = { data: row({ assigned_player_id: 'p2' }), error: null }
    const c = await assignPlayer('c1', 'p2')
    expect(h.op).toBe('update')
    expect(h.payload.assigned_player_id).toBe('p2')
    expect(c._assignedPlayerId).toBe('p2')
  })

  it('clears the assignment when given an empty value', async () => {
    h.result = { data: row(), error: null }
    await assignPlayer('c1', '')
    expect(h.payload.assigned_player_id).toBeNull()
  })
})

describe('deleteCharacter / listPlayers', () => {
  it('deleteCharacter resolves true', async () => {
    h.result = { data: null, error: null }
    expect(await deleteCharacter('c1')).toBe(true)
    expect(h.op).toBe('delete')
  })

  it('listPlayers returns the profile rows', async () => {
    h.result = { data: [{ id: 'u1', display_name: 'Ed' }], error: null }
    const players = await listPlayers()
    expect(players).toHaveLength(1)
    expect(h.table).toBe('profiles')
  })

  it('setDisplayName trims and updates the profile', async () => {
    h.result = { data: { id: 'u1', display_name: 'Dave', role: 'player' }, error: null }
    const profile = await setDisplayName('u1', '  Dave  ')
    expect(h.table).toBe('profiles')
    expect(h.op).toBe('update')
    expect(h.payload).toEqual({ display_name: 'Dave' })
    expect(profile.display_name).toBe('Dave')
  })

  it('setDisplayName rejects an empty name without querying Supabase', async () => {
    await expect(setDisplayName('u1', '   ')).rejects.toThrow('Display name is required')
    expect(h.table).toBeNull()
  })
})

describe('error propagation', () => {
  it('throws when Supabase returns an error', async () => {
    h.result = { data: null, error: new Error('rls denied') }
    await expect(listCharacters()).rejects.toThrow('rls denied')
  })
})

describe('reconcile (newer updated_at wins)', () => {
  const at = (t) => ({ _updatedAt: t, name: t })
  it('prefers the cloud copy when it is newer or equal', () => {
    expect(reconcile(at('2026-01-01'), at('2026-02-01')).name).toBe('2026-02-01')
    expect(reconcile(at('2026-02-01'), at('2026-02-01')).name).toBe('2026-02-01')
  })
  it('keeps the local copy when it is newer', () => {
    expect(reconcile(at('2026-03-01'), at('2026-02-01')).name).toBe('2026-03-01')
  })
  it('handles missing sides', () => {
    expect(reconcile(null, at('x')).name).toBe('x')
    expect(reconcile(at('y'), null).name).toBe('y')
  })
})

describe('saveCharacterData broadcasts a structural-change nudge (inventory→GM sync)', () => {
  it('sends a `data` broadcast on the character channel so connected viewers re-hydrate', async () => {
    // A connected viewer/editor is subscribed, so the per-character channel exists.
    subscribeLive('c1', () => {}, () => {})
    h.result = { data: row(), error: null }
    // A structural save (e.g. player added an inventory item) …
    await saveCharacterData('c1', row().data, 1)
    // … must nudge other viewers with a payload-less `data` broadcast. Without
    // this, structural edits persist but never reach a connected GM (the bug).
    expect(h.sends.some(s => s.type === 'broadcast' && s.event === 'data')).toBe(true)
    removeLiveSubscription('c1')
  })

  it('does not broadcast when the update conflicts (no row returned)', async () => {
    subscribeLive('c2', () => {}, () => {})
    h.result = { data: null, error: null } // expectedRev guard failed → conflict
    const res = await saveCharacterData('c2', row().data, 5)
    expect(res).toEqual({ conflict: true })
    expect(h.sends.some(s => s.event === 'data')).toBe(false)
    removeLiveSubscription('c2')
  })
})
