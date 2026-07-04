// Authenticated cloud-first repository (epic #109, Phase 3). For logged-in users
// Supabase is the SOURCE OF TRUTH; rosterStorage.js localStorage is demoted to a
// non-authoritative offline cache. Access is direct-table under RLS (policies in
// 0002_auth_roles.sql), scoped automatically by auth.uid() + role:
//   player    → rows they own or are assigned
//   gm/admin  → all rows
//
// The invariant here is `_rosterId === the Supabase row id`, so the rest of the
// app (realtime channel `char:<id>`, React keys, cache keys) keeps working. The
// guest/token plane in cloudSync.js is untouched and used for #c=/#play= links.
import { supabase, authEnabled } from './supabaseClient.js'
import { foldLive, projectLive } from './cloudSync.js'

// True when the authenticated repo should be the source of truth. Callers fall
// back to the localStorage path when this is false (auth off / signed out).
export function repoEnabled() {
  return Boolean(authEnabled && supabase)
}

const COLS = 'id, name, data, live, owner_user_id, assigned_player_id, data_rev, live_rev, updated_at'

// Row → character: fold live counters over the stored blob and stamp identity.
// We also surface ownership so the UI can gate per-character actions.
function rowToCharacter(row) {
  if (!row) return null
  const c = foldLive(row.data, row.live)
  return {
    ...c,
    _rosterId:          row.id,
    _ownerUserId:       row.owner_user_id ?? null,
    _assignedPlayerId:  row.assigned_player_id ?? null,
    _dataRev:           row.data_rev ?? 0,
    _updatedAt:         row.updated_at,
  }
}

// Character → the `data` jsonb we persist. Strip the local-only identity/cache
// markers so the stored blob stays clean (identity lives in the row, not data).
function toData(character) {
  const d = { ...character }
  delete d._rosterId
  delete d._ownerUserId
  delete d._assignedPlayerId
  delete d._dataRev
  delete d._updatedAt
  return d
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// List every character the signed-in user may see (RLS-scoped). Newest first.
export async function listCharacters() {
  if (!repoEnabled()) return []
  const { data, error } = await supabase
    .from('characters')
    .select(COLS)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data || []).map(rowToCharacter)
}

// Load a single character by row id (RLS-scoped: null if not permitted/found).
export async function getCharacter(id) {
  if (!repoEnabled() || !id) return null
  const { data, error } = await supabase
    .from('characters')
    .select(COLS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return rowToCharacter(data)
}

// Create a character owned by the signed-in user. RLS with_check enforces that a
// player can only create rows they own; gm/admin may also create on a player's
// behalf (pass ownerUserId). Returns the saved character with _rosterId === id.
export async function createCharacter(character, { ownerUserId } = {}) {
  if (!repoEnabled()) return null
  const uid = ownerUserId || await currentUserId()
  const { data, error } = await supabase
    .from('characters')
    .insert({
      name: character.name || 'Unnamed',
      data: toData(character),
      live: projectLive(character),
      owner_user_id: uid,
    })
    .select(COLS)
    .single()
  if (error) throw error
  return rowToCharacter(data)
}

// Replace the full character blob (wizard/structural edits). Optimistic
// concurrency (#146): pass `expectedRev` (the data_rev the caller last saw) to
// guard the write — the update only lands if the row is still at that rev, and
// bumps it to expectedRev+1. A null result then means someone else wrote in the
// meantime, so we return { conflict: true } instead of silently clobbering their
// change. Omit `expectedRev` (undefined) for an unconditional last-write-wins
// update — the pre-#146 behaviour, kept as a fail-safe for callers that don't
// track the rev.
export async function saveCharacterData(id, character, expectedRev) {
  if (!repoEnabled() || !id) return null
  const patch = { name: character.name || 'Unnamed', data: toData(character) }
  let q = supabase
    .from('characters')
    .update(expectedRev != null ? { ...patch, data_rev: expectedRev + 1 } : patch)
    .eq('id', id)
  if (expectedRev != null) q = q.eq('data_rev', expectedRev)
  const { data, error } = await q.select(COLS).maybeSingle()
  if (error) throw error
  if (expectedRev != null && !data) return { conflict: true }
  // Nudge other viewers to re-hydrate the fresh structural data. Like patchLive's
  // live broadcast, this is a plain pub/sub signal (no payload) — receivers refetch
  // the authoritative row, so it can't clobber a concurrent live/data change.
  console.log('[inv-sync] repo send data nudge', id, 'channel?', !!repoChannels[id]) // TEMP
  repoChannels[id]?.send({ type: 'broadcast', event: 'data', payload: {} })
  return rowToCharacter(data)
}

// Patch ONLY live counters (play). Uses the SECURITY DEFINER patch_live_by_id
// RPC for an atomic server-side field-merge (parity with the guest patch_live),
// instead of a non-atomic client read-modify-write. The DB row is the durable
// store; we ALSO broadcast the new counters on the character's channel so other
// viewers update instantly (broadcast has no RLS/replication dependency, unlike
// postgres_changes, so it actually reaches the browser).
export async function patchLive(id, character) {
  if (!repoEnabled() || !id) return null
  const live = projectLive(character)
  const { error } = await supabase.rpc('patch_live_by_id', { p_id: id, p_patch: live })
  if (error) throw error
  repoChannels[id]?.send({ type: 'broadcast', event: 'live', payload: { live } })
  return true
}

// GM/admin: assign (or reassign) a character to a player. RLS blocks players.
export async function assignPlayer(id, playerUserId) {
  if (!repoEnabled() || !id) return null
  const { data, error } = await supabase
    .from('characters')
    .update({ assigned_player_id: playerUserId || null })
    .eq('id', id)
    .select(COLS)
    .maybeSingle()
  if (error) throw error
  return rowToCharacter(data)
}

// Delete a character (RLS: owner or gm/admin only).
export async function deleteCharacter(id) {
  if (!repoEnabled() || !id) return false
  const { error } = await supabase.from('characters').delete().eq('id', id)
  if (error) throw error
  return true
}

// The players a GM can assign to. RLS lets gm/admin read all profiles; a player
// sees only their own row, so this naturally returns just themselves for them.
export async function listPlayers() {
  if (!repoEnabled()) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, email, role')
    .order('display_name', { ascending: true })
  if (error) throw error
  return data || []
}

// Realtime: subscribe to a character's live-counter broadcasts. We use Supabase
// Broadcast (not postgres_changes) on a per-character channel `char:<id>`:
// postgres_changes must pass RLS on the realtime socket, which silently fails to
// deliver to authenticated browsers; broadcast is plain pub/sub and just works.
// `onLive` receives `{ live }` — the projected counters. `self:false` so a
// sender never echoes its own change. patchLive sends on the same channel, and
// this shares the channel name with the guest plane so the two interoperate.
const repoChannels = {} // id -> RealtimeChannel

// `onData` (optional) fires on a structural-change nudge; the caller should
// refetch via getCharacter(id) and adopt the fresh row.
export function subscribeLive(id, onLive, onData) {
  if (!repoEnabled() || !id || repoChannels[id]) return repoChannels[id] || null
  const ch = supabase.channel(`char:${id}`, { config: { broadcast: { self: false } } })
  ch.on('broadcast', { event: 'live' }, ({ payload }) => onLive(payload))
  if (onData) ch.on('broadcast', { event: 'data' }, () => { console.log('[inv-sync] repo recv data nudge', id); onData() }) // TEMP
  ch.subscribe()
  repoChannels[id] = ch
  return ch
}

export function removeLiveSubscription(id) {
  const ch = repoChannels[id]
  if (ch && supabase) { supabase.removeChannel(ch); delete repoChannels[id] }
}

// Reconcile an authoritative cloud character against a cached local copy:
// newer updated_at wins. Used when hydrating a surface that painted from cache.
export function reconcile(localChar, cloudChar) {
  if (!cloudChar) return localChar || null
  if (!localChar) return cloudChar
  const lt = Date.parse(localChar._updatedAt || 0)
  const ct = Date.parse(cloudChar._updatedAt || 0)
  return ct >= lt ? cloudChar : localChar
}
