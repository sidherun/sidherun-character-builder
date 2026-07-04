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
import { encodeCloudLink, encodeCharacterToPlayURL } from './urlState.js'
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
function removeCloudMapEntry(rosterId) {
  const map = getCloudMap(); delete map[rosterId]
  try { localStorage.setItem(KEY_MAP, JSON.stringify(map)) } catch { /* ignore */ }
}

// Restore cloud access from a roster backup (GM key + cloud map) so cloud links
// survive a browser wipe / move to a new device.
export function importCloudState({ gmKey, cloudMap } = {}) {
  try {
    if (gmKey) localStorage.setItem(KEY_GM, gmKey)
    if (cloudMap && typeof cloudMap === 'object') {
      localStorage.setItem(KEY_MAP, JSON.stringify({ ...getCloudMap(), ...cloudMap }))
    }
  } catch { /* ignore */ }
}

// Record that a rosterId maps to a cloud row + token (e.g. when opening a cloud
// link), so the background hook keeps it synced.
export function registerCloudLink(rosterId, { id, token }) {
  setCloudMapEntry(rosterId, { id, token })
}

// Build a shareable cloud link for a locally-mapped character, or null.
export function getCloudLink(rosterId) {
  const e = getCloudMap()[rosterId]
  return e ? encodeCloudLink(e.id, e.token) : null
}

// Reverse lookup: the local rosterId already mapped to a given cloud row id, or
// null. Lets an owner opening their own #c= link resolve to the existing roster
// entry instead of creating a duplicate 'cloud-<id>' one.
export function rosterIdForCloudId(id) {
  const m = getCloudMap()
  return Object.keys(m).find(k => m[k]?.id === id) || null
}

// Forward lookup: the cloud row id a rosterId maps to (token plane), or null.
// The authenticated repo (characterRepo.js) treats _rosterId === row id, but
// token-mapped guest characters still resolve their cloud id through here.
export function cloudIdForRoster(rosterId) {
  return getCloudMap()[rosterId]?.id || null
}

// The best link to put behind a printout QR: the short, live cloud link if the
// character is synced (always scannable; opens the live character), otherwise
// the self-contained embedded #play= link. Both use the current origin.
export function qrLinkFor(character) {
  return getCloudLink(character?._rosterId) || encodeCharacterToPlayURL(character)
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

// Apply a realtime broadcast payload to the local character. Only live-counter
// payloads are broadcast for instant updates (structural 'data' changes sync on
// reload), so this folds the remote live counters in. Pure.
export function mergeRemote(local, payload) {
  if (!local || !payload?.live) return local
  return foldLive(local, payload.live)
}

// ── push (impure; talks to Supabase) ─────────────────────────────────────────
const lastSnapshot = {} // in-memory: last character pushed, per _rosterId

async function rpc(fn, params) {
  const { data, error } = await supabase.rpc(fn, params)
  if (error) throw error
  return data
}

// ── realtime (client-side broadcast on a per-character channel) ───────────────
// One channel per open cloud character, topic `char:<cloudId>`. self:false means
// we never receive our own broadcasts (built-in echo suppression). Persistence
// is the DB patch; this is just the instant nudge to other connected viewers.
const channels = {} // rosterId -> supabase RealtimeChannel

// `onData` (optional) fires on a structural-change nudge; the caller should
// refetch via hydrateCharacter(rosterId) and adopt the fresh character.
export function subscribeCharacter(rosterId, onLivePayload, onData) {
  if (!supabase || !rosterId || channels[rosterId]) return channels[rosterId] || null
  const entry = getCloudMap()[rosterId]
  if (!entry) return null
  const ch = supabase.channel(`char:${entry.id}`, { config: { broadcast: { self: false } } })
  ch.on('broadcast', { event: 'live' }, ({ payload }) => onLivePayload(payload))
  if (onData) ch.on('broadcast', { event: 'data' }, () => onData())
  ch.subscribe()
  channels[rosterId] = ch
  return ch
}

// Refetch the authoritative cloud character for a mapped roster id and adopt it
// as our last-pushed snapshot (so the subsequent autosave sees no change and
// doesn't echo the remote edit back). Returns the fresh character tagged with
// its _rosterId, or null. Used by the structural-change (`onData`) path.
export async function hydrateCharacter(rosterId) {
  const entry = getCloudMap()[rosterId]
  if (!supabase || !entry) return null
  const res = await fetchCloudCharacter(entry.token)
  if (!res?.character) return null
  const fresh = { ...res.character, _rosterId: rosterId }
  lastSnapshot[rosterId] = fresh // adopt → next syncCharacter diff is 'none', no echo push
  return fresh
}

export function unsubscribeCharacter(rosterId) {
  const ch = channels[rosterId]
  if (ch && supabase) { supabase.removeChannel(ch); delete channels[rosterId] }
}

// Fetch a cloud character by capability token. Returns the character with live
// counters folded in, plus the server's updated_at (for newer-wins on open),
// or null if the token is unknown / cloud disabled.
export async function fetchCloudCharacter(token) {
  if (!supabase) return null
  const rows = await rpc('get_character', { p_token: token })
  if (!rows?.length) return null
  const r = rows[0]
  return { character: foldLive(r.data, r.live), updatedAt: r.updated_at, id: r.id }
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
    // Nudge other viewers to re-hydrate the fresh structural data (parity with the
    // live broadcast below). Payload-less signal → receivers refetch the row.
    channels[character._rosterId]?.send({ type: 'broadcast', event: 'data', payload: {} })
  } else if (channel === 'live') {
    const live = projectLive(character)
    await rpc('patch_live', { p_token: entry.token, p_patch: live })
    // Nudge other connected viewers instantly (best-effort; persistence is the
    // patch above, so offline peers still catch up on their next hydrate).
    channels[character._rosterId]?.send({ type: 'broadcast', event: 'live', payload: { live } })
  }
  lastSnapshot[character._rosterId] = character
  return { created: false, channel }
}

// Rotate a character's capability token (invalidates old links). Returns the
// new live link, or null if not cloud-mapped / cloud disabled.
export async function rotateCloudLink(rosterId) {
  if (!supabase) return null
  const entry = getCloudMap()[rosterId]
  if (!entry) return null
  const rows = await rpc('rotate_token', { p_gm_key: ensureGmKey(), p_id: entry.id })
  if (!rows?.length) return null
  setCloudMapEntry(rosterId, { id: entry.id, token: rows[0].token })
  return getCloudLink(rosterId)
}

// Delete a character's cloud row (best-effort) and drop its map entry.
export async function deleteCloudCharacter(rosterId) {
  const entry = getCloudMap()[rosterId]
  if (supabase && entry) {
    try { await rpc('delete_character', { p_gm_key: ensureGmKey(), p_id: entry.id }) } catch { /* ignore */ }
  }
  removeCloudMapEntry(rosterId)
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
