// Lightweight "did you mean" spell check for player-entered skill / item names
// (#157). Deliberately NOT a full spell checker: a curated dictionary of terms
// actually used across the roster (plus common RPG terms) + Levenshtein edit
// distance. Suggestions are non-blocking and never auto-applied — homebrew and
// in-world names (e.g. "Bartuka Rolls") don't match anything closely, so they
// aren't flagged.

// Seeded from the real 13-character roster (companion repo import JSONs), with
// the known typo corrected (Seamonship -> Seamanship), plus common terms.
export const SKILL_DICTIONARY = [
  'Acrobatics', 'Animal Handling', 'Appraisal', 'Arcana', 'Athletics', 'Climbing',
  'Concentration', 'Deception', 'Diplomacy', 'Disarm Trap', 'Dodge', 'Endurance',
  'Fishing', 'Forbidden Lore', 'Gathering', 'Herbalism', 'Horsemanship', 'Hunting',
  'Inquiry', 'Insight', 'Interrogation', 'Intimidate', 'Intimidation', 'Investigation',
  'Knot Tying', 'Lore', 'Martial Arts', 'Medicine', 'Meditation', 'Mending', 'Nature',
  'Navigation', 'Parry', 'Perception', 'Persuasion', 'Piloting', 'Poisoner',
  'Precision Blow', 'Riding', 'Sailing', 'Scrutiny', 'Seamanship', 'Sleight of Hand',
  'Small Talk', 'Spellcraft', 'Stealth', 'Survival', 'Swimming', 'Tactics',
  'Tinkering', 'Tracking', 'Wilderness Survival', 'Woodcraft',
]

export const ITEM_DICTIONARY = [
  'Arrows', 'Axe', 'Backpack', 'Bedroll', 'Bo Staff', 'Bow', 'Club', 'Crossbow',
  'Dagger', 'Great Axe', 'Hammer', 'Hand Axe', 'Hand Crossbow', 'Knife', 'Knives',
  'Lantern', 'Leather Armor', 'Long Bow', 'Longbow', 'Longsword', 'Mace',
  'Open-Hand Strike', 'Pistol', 'Potion', 'Quarterstaff', 'Quiver', 'Rations',
  'Rope', 'Saber', 'Shield', 'Short Bow', 'Shortbow', 'Spear', 'Staff', 'Sword',
  'Throwing Axe', 'Tinderbox', 'Torch', 'Walking Staff', 'Waterskin',
]

// Classic iterative Levenshtein (two-row). Case-insensitive comparison is the
// caller's job (we lowercase before calling).
export function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  let curr = new Array(b.length + 1)
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[b.length]
}

// Max edit distance we'll treat as a likely typo, by input length. Short words
// only tolerate 1 edit (avoids "cat" -> "bat" style false hits).
function maxDistanceFor(len) {
  if (len < 4) return 0 // don't flag very short entries at all
  if (len <= 6) return 1
  return 2
}

// Suggest a correction for `input` from `dictionary`, or null if it looks fine.
// `custom` are per-character accepted terms that suppress suggestions (homebrew
// the player chose to keep). Returns the properly-cased dictionary term.
export function suggest(input, dictionary, custom = []) {
  const raw = (input || '').trim()
  const lower = raw.toLowerCase()
  const maxDist = maxDistanceFor(lower.length)
  if (maxDist === 0) return null

  // Exact (case-insensitive) match against the dictionary or a kept custom term
  // means it's fine — no suggestion.
  if (dictionary.some(t => t.toLowerCase() === lower)) return null
  if (custom.some(t => (t || '').trim().toLowerCase() === lower)) return null

  let best = null
  let bestDist = Infinity
  for (const term of dictionary) {
    const d = levenshtein(lower, term.toLowerCase())
    if (d < bestDist) { bestDist = d; best = term }
  }
  // Require a real, close match: within the length-based budget and clearly
  // fewer edits than the word is long (so unrelated words don't get "corrected").
  if (best && bestDist > 0 && bestDist <= maxDist && bestDist < lower.length * 0.5) {
    return best
  }
  return null
}
