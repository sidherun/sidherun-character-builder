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

// Replace the full character blob (wizard edits). Bumps data_rev server-side.
export async function saveCharacterData(id, character) {
  if (!repoEnabled() || !id) return null
  const { data, error } = await supabase
    .from('characters')
    .update({ name: character.name || 'Unnamed', data: toData(character) })
    .eq('id', id)
    .select(COLS)
    .maybeSingle()
  if (error) throw error
  return rowToCharacter(data)
}

// Patch ONLY live counters (play). Uses the SECURITY DEFINER patch_live_by_id
// RPC for an atomic server-side field-merge (parity with the guest patch_live),
// instead of a non-atomic client read-modify-write.
export async function patchLive(id, character) {
  if (!repoEnabled() || !id) return null
  const { error } = await supabase.rpc('patch_live_by_id', {
    p_id: id,
    p_patch: projectLive(character),
  })
  if (error) throw error
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

// Realtime: subscribe to row changes for a character (authenticated plane). This
// fires for BOTH authenticated direct-table writes and guest patch_live RPC
// writes (both hit the DB), so a GM watching sees a player's HP tick live. Pass
// the row id; returns the channel (unsubscribe via removeLiveSubscription).
const repoChannels = {} // id -> RealtimeChannel

export function subscribeLive(id, onRow) {
  if (!repoEnabled() || !id || repoChannels[id]) return repoChannels[id] || null
  const ch = supabase
    .channel(`repo:char:${id}`)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'characters', filter: `id=eq.${id}` },
      payload => onRow(rowToCharacter(payload.new)))
    .subscribe()
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
