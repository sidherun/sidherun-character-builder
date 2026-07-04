// GM Screen "in session" filter (#154). The GM marks a subset of the roster as
// present for tonight's game; the grid (and, as a bonus, the live roll feed) can
// then collapse to just those characters. The selection persists in localStorage
// so it survives a reload mid-session.

const PRESENT_KEY = 'sidherun_gm_present'
const SESSION_ONLY_KEY = 'sidherun_gm_session_only'

// Load the persisted set of present roster ids. Tolerant of a missing / corrupt
// value (returns []) so a bad localStorage entry never blanks the GM screen.
export function loadPresent() {
  try {
    const arr = JSON.parse(localStorage.getItem(PRESENT_KEY) || '[]')
    return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : []
  } catch { return [] }
}

export function savePresent(ids) {
  try { localStorage.setItem(PRESENT_KEY, JSON.stringify([...ids])) } catch { /* quota / disabled — non-fatal */ }
}

export function loadSessionOnly() {
  try { return localStorage.getItem(SESSION_ONLY_KEY) === '1' } catch { return false }
}

export function saveSessionOnly(on) {
  try { localStorage.setItem(SESSION_ONLY_KEY, on ? '1' : '0') } catch { /* non-fatal */ }
}

// How many present ids still match a character in the current roster. Stale ids
// (a character marked present then deleted) don't count, so the "In session (X)"
// label and the filter-enabled gate track reality.
export function presentMatchCount(chars, presentIds) {
  const present = new Set(presentIds)
  return chars.reduce((n, c) => n + (present.has(c._rosterId) ? 1 : 0), 0)
}

// The characters the grid should show. Filtering only kicks in when the caller
// says so (see `filtering` — the component derives it as sessionOnly && count>0)
// so turning the filter on with an empty/stale selection can never blank the grid.
export function visibleChars(chars, presentIds, filtering) {
  if (!filtering) return chars
  const present = new Set(presentIds)
  return chars.filter(c => present.has(c._rosterId))
}

// Bonus: scope the live roll feed to in-session characters by matching each
// roll's `actor` (broadcast as the character's name) against the present names.
// Rolls from an unknown actor are hidden while filtering; the feed is untouched
// when not filtering.
export function visibleRolls(feed, presentNames, filtering) {
  if (!filtering) return feed
  const names = new Set(presentNames)
  return feed.filter(r => names.has(r.actor))
}
