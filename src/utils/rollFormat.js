// Presentation for a roll result banner. Pure so it's unit-testable apart from
// React. `roll` is the object produced by rollSkill/rollAttack (kind 'total')
// or rollSpell (kind 'spell'), plus a `label`.
//
// Skills & attacks display the total (no pass/fail — the GM adjudicates);
// spells resolve pass/fail against the computed target, or flag an out-of-range
// target level.
export function formatRoll(roll) {
  const isSpell = roll.kind === 'spell'
  const oor = isSpell && roll.outOfRange

  const color = !isSpell ? 'var(--bronze)'
    : oor ? 'var(--ink-400)'
    : roll.success ? 'var(--story)' : 'var(--danger)'

  const headline = !isSpell ? String(roll.total)
    : oor ? '—'
    : roll.success ? 'Success' : 'Miss'

  const detail = !isSpell
    ? `d100 ${roll.roll} + ${roll.modifier} · GM adjudicates`
    : oor ? 'Target level out of range'
    : `d100 ${roll.roll} ${roll.roll <= roll.target ? '≤' : '>'} ${roll.target}` +
      (roll.margin >= 0 ? ` · +${roll.margin}` : '')

  return { color, headline, detail }
}
