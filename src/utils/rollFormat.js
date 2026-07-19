// Presentation for a roll result banner. Pure so it's unit-testable apart from
// React. `roll` is the object produced by rollSkill/rollAttack (kind 'total')
// or rollSpell (kind 'spell'), plus a `label`.
//
// Skills & attacks display the total. The GM normally adjudicates, but a feed
// entry may carry the optional target active when it arrived; in that case the
// feed resolves pass/fail without changing the player's own result banner.
// special cases for a fumble (natural 1-5) and an exploded roll (die over 95
// rolled again). Spells resolve pass/fail against the computed target, or flag
// an out-of-range target level.
export function formatRoll(roll) {
  if (roll.kind === 'damage') {
    const dice = roll.dice
      ? `${roll.dice} [${(roll.rolls || []).join(', ')}]`
      : 'flat damage'
    const bonus = roll.bonus ? ` ${roll.bonus > 0 ? '+' : '−'} ${Math.abs(roll.bonus)}` : ''
    const crit = roll.critBonus ? ` + ${roll.critBonus} crit STR` : ''
    const type = roll.damageType ? ` · ${roll.damageType}` : ''
    return {
      color: 'var(--danger)',
      headline: String(roll.total),
      detail: `${dice}${bonus}${crit}${type}`,
    }
  }

  if (roll.kind !== 'spell') {
    // Fumble: show the low die and the unmodified fumble die for the GM.
    if (roll.isFumble) {
      return {
        color: 'var(--danger)',
        headline: 'Fumble',
        detail: `d100 ${roll.rolls?.[0] ?? roll.roll} · fumble die ${roll.fumble} → GM determines the result`,
      }
    }
    // Exploded rolls show the dice summed before the modifier (e.g. 97+40 = 137).
    // The status goes in a player-facing `tag`, not raw engine jargon in the math.
    const exploded = roll.rolls && roll.rolls.length > 1
    const dice = exploded ? `${roll.rolls.join('+')} = ${roll.roll}` : `${roll.roll}`
    const hasGmTarget = Number.isFinite(roll.gmTarget)
    const success = hasGmTarget && roll.total >= roll.gmTarget
    return {
      color: hasGmTarget ? (success ? 'var(--story)' : 'var(--danger)') : 'var(--bronze)',
      headline: hasGmTarget ? (success ? 'Pass' : 'Fail') : String(roll.total),
      tag: exploded ? 'Exploding roll!' : null,
      detail: `d100 ${dice} + ${roll.modifier}` +
        (hasGmTarget ? ` = ${roll.total} ${success ? '≥' : '<'} ${roll.gmTarget}` : ' · GM adjudicates'),
    }
  }

  // Spells (roll-under, app-resolved).
  const oor = roll.outOfRange
  const color = oor ? 'var(--ink-400)' : roll.success ? 'var(--story)' : 'var(--danger)'
  const headline = oor ? '—' : roll.success ? 'Success' : 'Miss'
  const detail = oor
    ? 'Target level out of range'
    : `d100 ${roll.roll} ${roll.roll <= roll.target ? '≤' : '>'} ${roll.target}` +
      (roll.margin >= 0 ? ` · +${roll.margin}` : '') +
      // Interim mana pricing (#237): cost is hand-entered per cast until the
      // mana ruling lands, so the banner records what was deducted.
      (roll.manaCost > 0 ? ` · −${roll.manaCost} mana` : '')

  return { color, headline, detail }
}
