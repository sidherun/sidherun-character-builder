import { safeParseCharacter } from './characterSchema.js'

const BACKUP_VERSION = 1

// Wrap the full roster into one portable backup object. `now` is an ISO string
// passed in by the caller (the browser) so this stays pure/testable. `cloud`
// optionally carries the GM key + cloud map so cloud access survives a restore
// on another device (omitted from the file when empty).
export function buildRosterBackup(characters, now = '', cloud = {}) {
  const backup = {
    _type: 'sidherun-roster-backup',
    version: BACKUP_VERSION,
    exportedAt: now,
    characters,
  }
  if (cloud.gmKey) backup._gmKey = cloud.gmKey
  if (cloud.cloudMap && Object.keys(cloud.cloudMap).length) backup._cloudMap = cloud.cloudMap
  return backup
}

// Pull cloud state (GM key + map) back out of a restored backup, if present.
export function extractCloudState(parsed) {
  if (!parsed || typeof parsed !== 'object') return {}
  return { gmKey: parsed._gmKey, cloudMap: parsed._cloudMap }
}

// Normalise any restore input into a flat list of candidate character objects:
// our backup wrapper { characters: [...] }, a bare array of characters, or a
// single character object. Unknown shapes yield an empty list.
export function extractCharacters(parsed) {
  if (!parsed || typeof parsed !== 'object') return []
  if (Array.isArray(parsed)) return parsed
  if (Array.isArray(parsed.characters)) return parsed.characters
  return [parsed]
}

// Validate candidates against the character schema.
// Returns { valid: [parsedCharacter…], invalid: number }.
export function validateCharacters(list) {
  const valid = []
  let invalid = 0
  for (const c of list) {
    const r = safeParseCharacter(c)
    if (r.success) valid.push(r.data)
    else invalid++
  }
  return { valid, invalid }
}
