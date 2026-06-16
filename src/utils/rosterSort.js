// Sort roster index entries by the chosen key (ascending, case-insensitive),
// partitioned so characters WITH a player name come first and those WITHOUT sit
// below a cut line. Tiebreaker within a group is always the character name.
//
// Returns { withPlayer, noPlayer } so the page can render a divider between them.
export const SORT_KEYS = [
  { value: 'name', label: 'Character name' },
  { value: 'archetype', label: 'Archetype' },
  { value: 'player', label: 'Player name' },
]

function keyOf(entry, sortKey) {
  if (sortKey === 'archetype') {
    const a = entry.archetype === 'custom' ? (entry.customArchetypeName || 'custom') : (entry.archetype || '')
    return a.toLowerCase()
  }
  if (sortKey === 'player') return (entry.playerName || '').toLowerCase()
  return (entry.name || '').toLowerCase()
}

const hasPlayer = (e) => Boolean(e.playerName && e.playerName.trim())

export function sortRoster(roster, sortKey = 'name') {
  const cmp = (a, b) =>
    keyOf(a, sortKey).localeCompare(keyOf(b, sortKey)) ||
    (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
  return {
    withPlayer: roster.filter(hasPlayer).slice().sort(cmp),
    noPlayer: roster.filter(e => !hasPlayer(e)).slice().sort(cmp),
  }
}
