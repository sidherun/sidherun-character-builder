// Dice core for Sidherun (PHB 2.8.2026). Two resolution shapes:
//
//   rollTotal   — roll d100 and add a single modifier, then DISPLAY the total.
//                 Used for skill checks and attacks: the player reads the total
//                 aloud and the GM adjudicates against difficulty/defense
//                 verbally (faster than typing a target on every roll). No
//                 pass/fail is computed here.
//   resolveUnder — roll d100 against a known target and resolve pass/fail in
//                 app. Used for spells, whose target is fully computed
//                 (spell matrix + magic attribute, capped 95). Success is
//                 roll <= target.
//
// `rng` is injectable (defaults to Math.random) so rolls are deterministic in
// tests and can later be driven from a shared/verifiable seed.

// Roll a d100 → integer in [1, 100].
export function rollD100(rng = Math.random) {
  return Math.min(100, Math.max(1, Math.floor(rng() * 100) + 1))
}

// Skills + attacks: roll d100, add one modifier, return the total to read aloud.
export function rollTotal({ modifier = 0, rng = Math.random } = {}) {
  const roll = rollD100(rng)
  return { roll, modifier, total: roll + modifier }
}

// Spells: roll d100 under a computed target. roll === target is a success (≤).
export function resolveUnder({ target, rng = Math.random }) {
  const roll = rollD100(rng)
  if (target == null) {
    return { roll, target: null, success: false, margin: null, outOfRange: true }
  }
  return { roll, target, success: roll <= target, margin: target - roll }
}
