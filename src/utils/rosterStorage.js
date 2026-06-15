import { uuid } from './uuid.js'

const KEY_CURRENT   = 'sidherun_character'
const KEY_ROSTER    = 'sidherun_roster'
const charKey  = id => `sidherun_char_${id}`
const versKey  = id => `sidherun_versions_${id}`
const MAX_VERSIONS = 50

function parse(raw) {
  try { return raw ? JSON.parse(raw) : null } catch { return null }
}

// Guarded write. localStorage throws on quota (large roster + version history)
// and in private-mode browsers; callers must never crash on a failed save —
// especially the autosave timer, which runs unattended during play.
function safeSet(key, value) {
  try { localStorage.setItem(key, value); return true } catch { return false }
}

// Status of the most recent saveCharacterToRoster call, so the UI can warn the
// user when storage is full instead of silently losing data.
//   'ok'        — everything written
//   'truncated' — character saved, but version history was pruned/dropped
//   'failed'    — the character blob or roster index could not be written
let lastSaveStatus = 'ok'
export function getLastSaveStatus() {
  return lastSaveStatus
}

export function loadCurrent() {
  return parse(localStorage.getItem(KEY_CURRENT))
}

export function saveCurrent(character) {
  return safeSet(KEY_CURRENT, JSON.stringify(character))
}

export function clearCurrent() {
  localStorage.removeItem(KEY_CURRENT)
}

export function loadRoster() {
  return parse(localStorage.getItem(KEY_ROSTER)) || []
}

function saveRosterIndex(roster) {
  return safeSet(KEY_ROSTER, JSON.stringify(roster))
}

export function saveCharacterToRoster(character) {
  const id = character._rosterId || uuid()
  const char = { ...character, _rosterId: id }
  const charJson = JSON.stringify(char)

  // The character blob and the roster index are essential; the version snapshot
  // is expendable and is the first thing we sacrifice when storage is tight.
  let essentialOk = safeSet(charKey(id), charJson)

  const roster = loadRoster()
  const idx = roster.findIndex(r => r.id === id)
  const entry = {
    id,
    name:                char.name || 'Unnamed',
    race:                char.race,
    archetype:           char.archetype,
    customArchetypeName: char.customArchetypeName || '',
    level:               char.level,
    hp:        char.hitPoints?.total ?? 0,
    savedAt:   new Date().toISOString(),
  }
  if (idx >= 0) roster[idx] = entry
  else roster.unshift(entry)
  essentialOk = saveRosterIndex(roster) && essentialOk

  // version snapshot — on quota failure, prune to the most recent few and retry;
  // if still failing, drop history entirely and re-attempt the essential writes
  // now that space has been freed.
  let versions = parse(localStorage.getItem(versKey(id))) || []
  versions.unshift({ ...char, _savedAt: new Date().toISOString() })
  if (versions.length > MAX_VERSIONS) versions.length = MAX_VERSIONS
  let versionsOk = safeSet(versKey(id), JSON.stringify(versions))
  if (!versionsOk) {
    versions = versions.slice(0, 5)
    versionsOk = safeSet(versKey(id), JSON.stringify(versions))
  }
  if (!versionsOk) {
    try { localStorage.removeItem(versKey(id)) } catch { /* ignore */ }
    if (!essentialOk) {
      essentialOk = safeSet(charKey(id), charJson)
      essentialOk = saveRosterIndex(roster) && essentialOk
    }
  }

  lastSaveStatus = !essentialOk ? 'failed' : (versionsOk ? 'ok' : 'truncated')
  return char
}

export function loadCharacterFromRoster(id) {
  return parse(localStorage.getItem(charKey(id)))
}

export function deleteCharacterFromRoster(id) {
  localStorage.removeItem(charKey(id))
  localStorage.removeItem(versKey(id))
  const roster = loadRoster().filter(r => r.id !== id)
  saveRosterIndex(roster)
  // Prevent auto-save from re-adding the deleted character when the user
  // returns to the wizard. The current character retains its data but loses
  // its roster link so useAutoSave won't re-save it back.
  const current = loadCurrent()
  if (current?._rosterId === id) {
    saveCurrent({ ...current, _rosterId: null })
  }
}

export function loadVersionHistory(id) {
  return parse(localStorage.getItem(versKey(id))) || []
}
