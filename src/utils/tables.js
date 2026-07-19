import { uuid } from './uuid.js'

// Named tables (#175) — a persistent, reusable grouping of characters. "Table"
// (not "session") deliberately avoids colliding with the roll-feed broadcast
// channel (session:<id>) and the app's word for a game night.
//
// Split of concerns:
//   * Membership (which tables a character is in) lives on the character blob as
//     `tableIds` (see characterSchema.js), so it rides the existing character
//     sync and follows a signed-in GM across devices.
//   * The id→name registry lives GM-side in localStorage and is carried across
//     devices via Back up / Restore, exactly like the GM key + cloud map.

const KEY = 'sidherun_tables'

// ── registry (localStorage) ──────────────────────────────────────────────────

export function listTables() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(arr) ? arr.filter(t => t && typeof t.id === 'string') : []
  } catch { return [] }
}

function persist(tables) {
  try { localStorage.setItem(KEY, JSON.stringify(tables)) } catch { /* quota / disabled — non-fatal */ }
  return tables
}

export function createTable(name) {
  const table = { id: `t_${uuid()}`, name: (name || '').trim() || 'Untitled table' }
  persist([...listTables(), table])
  return table
}

export function renameTable(id, name) {
  return persist(listTables().map(t => (t.id === id ? { ...t, name: (name || '').trim() || t.name } : t)))
}

export function deleteTable(id) {
  return persist(listTables().filter(t => t.id !== id))
}

// Merge a restored registry into the local one (imported name wins; order keeps
// existing tables first, then any new ones). Used by the Restore flow.
export function importTables(tables) {
  if (!Array.isArray(tables)) return listTables()
  const byId = new Map(listTables().map(t => [t.id, t]))
  for (const t of tables) {
    if (t && typeof t.id === 'string') byId.set(t.id, { id: t.id, name: t.name || 'Untitled table' })
  }
  return persist([...byId.values()])
}

// ── cross-device registry reconstruction (#176) ──────────────────────────────

// Read a character/roster-entry's denormalized table names (id→name). Accepts
// full characters (`_tableNames`) and lightweight roster entries (`tableNames`).
function namesOf(c) {
  return c?._tableNames || c?.tableNames || {}
}

// Reconstruct the id→name registry from characters' synced membership, so a
// fresh device (empty localStorage registry) still knows table names. Any real
// name a character carries wins. When no name is known yet — e.g. members
// assigned before _tableNames existed (#175 characters) — the table is still
// listed under a readable placeholder (NEVER the raw id) so the GM can see and
// rename it; renaming propagates the name onto every member's blob.
const UNTITLED = 'Untitled table'
export function deriveRegistry(characters) {
  const map = new Map()
  for (const c of characters || []) {
    const names = namesOf(c)
    for (const id of c?.tableIds || []) {
      const name = names[id]
      if (name) map.set(id, name)            // a real name always wins
      else if (!map.has(id)) map.set(id, '')  // record the id; name still unknown
    }
  }
  return [...map.entries()].map(([id, name]) => ({ id, name: name || UNTITLED }))
}

// Merge the local (localStorage) registry with one derived from characters.
// Local wins on name (it's the GM's latest rename / holds empty tables); derived
// fills in tables local doesn't know about yet (the fresh-device case).
export function mergeRegistry(local, derived) {
  const byId = new Map((derived || []).map(t => [t.id, t]))
  for (const t of local || []) byId.set(t.id, t)
  return [...byId.values()]
}

// ── membership (pure — operate on the character blob) ────────────────────────

export function inTable(character, tableId) {
  return Array.isArray(character?.tableIds) && character.tableIds.includes(tableId)
}

// A character's tableIds with `tableId` toggled on/off (does not mutate).
export function toggleMembership(character, tableId) {
  const ids = Array.isArray(character?.tableIds) ? character.tableIds : []
  return ids.includes(tableId) ? ids.filter(x => x !== tableId) : [...ids, tableId]
}

// Names of the tables a character belongs to, in registry order (for chips).
export function tableNamesFor(character, tables) {
  const ids = new Set(Array.isArray(character?.tableIds) ? character.tableIds : [])
  return tables.filter(t => ids.has(t.id)).map(t => t.name)
}

// Strip a deleted table's id from a character's membership. Returns the same
// array reference when nothing changed, so callers can skip a needless save.
export function withoutTable(character, tableId) {
  const ids = Array.isArray(character?.tableIds) ? character.tableIds : []
  return ids.includes(tableId) ? ids.filter(x => x !== tableId) : ids
}

// ── GM-screen filtering (generalizes the removed #154 present-set helpers) ────

// Characters visible for the selected table filter. Falsy tableId = show all.
export function visibleForTable(chars, tableId) {
  if (!tableId) return chars
  return chars.filter(c => inTable(c, tableId))
}

// How many current characters belong to a table (for the filter label).
export function tableMemberCount(chars, tableId) {
  return chars.reduce((n, c) => n + (inTable(c, tableId) ? 1 : 0), 0)
}

// Scope the live roll feed to a table's stable roster ids. Payloads broadcast
// before #173 did not carry rosterId, so retain name matching only as a legacy
// fallback for those entries. Falsy tableId = feed untouched.
export function visibleRollsForTable(feed, chars, tableId) {
  if (!tableId) return feed
  const members = chars.filter(c => inTable(c, tableId))
  const ids = new Set(members.map(c => c._rosterId).filter(Boolean))
  const names = new Set(members.map(c => c.name || 'Unnamed'))
  return feed.filter(r => r.rosterId ? ids.has(r.rosterId) : names.has(r.actor))
}
