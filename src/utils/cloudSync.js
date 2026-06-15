// Local-first cloud sync (epic #71, M2). localStorage stays the instant source
// of truth (rosterStorage.js is untouched); this layer pushes changes to
// Supabase in the background. M2 is PUSH-ONLY — hydrate/realtime come in M3/M4.
//
// Opt-in model: a character syncs only once it's in the cloud map (added by the
// "Push roster to cloud" button, or later by opening a cloud link). The
// background hook then keeps mapped characters up to date; it never auto-creates.
//
// R1 (epic #71): cloud metadata (row id, capability token, GM key) lives ONLY
// here / in localStorage maps — never inside the character blob, which is
// validated by safeParseCharacter (Zod strips unknown keys).

import { supabase } from './supabaseClient.js'
import { uuid } from './uuid.js'

const KEY_GM   = 'sidherun_gm_key'
const KEY_MAP  = 'sidherun_cloud_map' // { [_rosterId]: { id, token } }

// ── secrets / map (localStorage) ─────────────────────────────────────────────
export function getGmKey() {
  try { return localStorage.getItem(KEY_GM) } catch { return null }
}
export function ensureGmKey() {
  let k = getGmKey()
  if (!k) { k = `gm_${uuid()}${uuid()}`; try { localStorage.setItem(KEY_GM, k) } catch { /* ignore */ } }
  return k
}
export function getCloudMap() {
  try { return JSON.parse(localStorage.getItem(KEY_MAP)) || {} } catch { return {} }
}
function setCloudMapEntry(rosterId, entry) {
  const map = getCloudMap(); map[rosterId] = entry
  try { localStorage.setItem(KEY_MAP, JSON.stringify(map)) } catch { /* ignore */ }
}

// ── pure helpers (the unit-test surface) ─────────────────────────────────────

// The live plane: counters the GM and player both touch during play. Projected
// out of the character so they can be patched (field-merged) independently of
// the full blob.
export function projectLive(c) {
  const usePips = {}
  for (const s of c.skills || []) if (s.usePips) usePips[s.id] = s.usePips
  return {
    hpCurrent:      c.hitPoints?.current ?? 0,
    manaCurrent:    c.mana?.current ?? 0,
    spCurrent:      c.storyPoints?.current ?? 0,
    armorRemaining: c.armor?.remaining ?? 0,
    usePips,
  }
}

// Fold a live patch back into a character (used by hydrate/realtime in M3/M4).
export function foldLive(c, live) {
  if (!live) return c
  const next = {
    ...c,
    hitPoints:   { ...c.hitPoints,   current:   live.hpCurrent      ?? c.hitPoints?.current },
    mana:        { ...c.mana,        current:   live.manaCurrent    ?? c.mana?.current },
    storyPoints: { ...c.storyPoints, current:   live.spCurrent      ?? c.storyPoints?.current },
    armor:       { ...c.armor,       remaining: live.armorRemaining ?? c.armor?.remaining },
  }
  if (live.usePips) {
    next.skills = (c.skills || []).map(s =>
      live.usePips[s.id] != null ? { ...s, usePips: live.usePips[s.id] } : s)
  }
  return next
}

// Signature of the character EXCLUDING volatile live fields + local-only nav
// state, so a live-only change (HP tick) doesn't look like a structural edit.
export function dataSignature(c) {
  const x = JSON.parse(JSON.stringify(c))
  delete x.wizardStep
  if (x.hitPoints)   delete x.hitPoints.current
  if (x.mana)        delete x.mana.current
  if (x.storyPoints) delete x.storyPoints.current
  if (x.armor)       delete x.armor.remaining
  for (const s of x.skills || []) delete s.usePips
  return JSON.stringify(x)
}

// Which write channel a change needs: 'data' (full blob, LWW), 'live' (counter
// merge), or 'none'. `prev` is the last-pushed snapshot (undefined → 'data').
export function chooseChannel(prev, next) {
  if (!prev) return 'data'
  if (dataSignature(prev) !== dataSignature(next)) return 'data'
  if (JSON.stringify(projectLive(prev)) !== JSON.stringify(projectLive(next))) return 'live'
  return 'none'
}

// ── push (impure; talks to Supabase) ─────────────────────────────────────────
const lastSnapshot = {} // in-memory: last character pushed, per _rosterId

async function rpc(fn, params) {
  const { data, error } = await supabase.rpc(fn, params)
  if (error) throw error
  return data
}

// Sync one character to the cloud. `allowCreate` lets the migration button
// create new rows; the background hook passes false (update mapped rows only).
export async function syncCharacter(character, { allowCreate = false } = {}) {
  if (!supabase || !character?._rosterId) return null
  const entry = getCloudMap()[character._rosterId]

  if (!entry) {
    if (!allowCreate) return null
    const rows = await rpc('create_character', {
      p_gm_key: ensureGmKey(),
      p_name:   character.name || 'Unnamed',
      p_data:   character,
      p_live:   projectLive(character),
    })
    setCloudMapEntry(character._rosterId, { id: rows[0].id, token: rows[0].token })
    lastSnapshot[character._rosterId] = character
    return { created: true, id: rows[0].id }
  }

  const channel = chooseChannel(lastSnapshot[character._rosterId], character)
  if (channel === 'data') {
    await rpc('update_character_data', {
      p_token: entry.token, p_name: character.name || 'Unnamed',
      p_data: character, p_expected_rev: -1,
    })
  } else if (channel === 'live') {
    await rpc('patch_live', { p_token: entry.token, p_patch: projectLive(character) })
  }
  lastSnapshot[character._rosterId] = character
  return { created: false, channel }
}

// Migration: push an array of characters, creating cloud rows for any not yet
// mapped (idempotent — already-mapped characters are updated, not duplicated).
export async function pushRoster(characters) {
  let created = 0, updated = 0, failed = 0
  for (const c of characters) {
    if (!c?.name?.trim()) continue
    try {
      const r = await syncCharacter(c, { allowCreate: true })
      if (r?.created) created++; else updated++
    } catch { failed++ }
  }
  return { created, updated, failed }
}
