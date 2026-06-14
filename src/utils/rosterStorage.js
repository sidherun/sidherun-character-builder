const KEY_CURRENT   = 'sidherun_character'
const KEY_ROSTER    = 'sidherun_roster'
const charKey  = id => `sidherun_char_${id}`
const versKey  = id => `sidherun_versions_${id}`
const MAX_VERSIONS = 50

function parse(raw) {
  try { return raw ? JSON.parse(raw) : null } catch { return null }
}

export function loadCurrent() {
  return parse(localStorage.getItem(KEY_CURRENT))
}

export function saveCurrent(character) {
  localStorage.setItem(KEY_CURRENT, JSON.stringify(character))
}

export function clearCurrent() {
  localStorage.removeItem(KEY_CURRENT)
}

export function loadRoster() {
  return parse(localStorage.getItem(KEY_ROSTER)) || []
}

function saveRosterIndex(roster) {
  localStorage.setItem(KEY_ROSTER, JSON.stringify(roster))
}

export function saveCharacterToRoster(character) {
  const id = character._rosterId || crypto.randomUUID()
  const char = { ...character, _rosterId: id }
  localStorage.setItem(charKey(id), JSON.stringify(char))

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
  saveRosterIndex(roster)

  // version snapshot
  const versions = parse(localStorage.getItem(versKey(id))) || []
  versions.unshift({ ...char, _savedAt: new Date().toISOString() })
  if (versions.length > MAX_VERSIONS) versions.length = MAX_VERSIONS
  localStorage.setItem(versKey(id), JSON.stringify(versions))

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
