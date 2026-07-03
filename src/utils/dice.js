// Dice core for Sidherun (PHB 2.8.2026). Two resolution shapes:
//
//   rollTotal   — roll d100 and add a single modifier, then DISPLAY the total.
//                 Used for skill checks and attacks: the player reads the total
//                 aloud and the GM adjudicates against difficulty/defense
//                 verbally (faster than typing a target on every roll). No
//                 pass/fail is computed here. Two special cases:
//                 - EXPLODE: a die over 95 (96-100) rolls again and adds; this
//                   repeats for each new die over 95. All dice sum BEFORE the
//                   modifier is added.
//                 - FUMBLE: a natural 1-5 on the first die is a fumble. Show it,
//                   then roll one unmodified "fumble die" the GM uses to
//                   determine the fumble result. The check fails.
//   resolveUnder — roll d100 against a known target and resolve pass/fail in
//                 app. Used for spells, whose target is fully computed
//                 (spell matrix + magic attribute, capped 95). Success is
//                 roll <= target. (No explode/fumble — spells are roll-under.)
//
// `rng` is injectable (defaults to Math.random) so rolls are deterministic in
// tests and can later be driven from a shared/verifiable seed.

// Roll a d100 → integer in [1, 100].
export function rollD100(rng = Math.random) {
  return Math.min(100, Math.max(1, Math.floor(rng() * 100) + 1))
}

// Skills + attacks. Returns the summed dice (`rolls`/`roll`), the `modifier`,
// and the `total` to read aloud, plus `exploded` / `isFumble` flags and (on a
// fumble) the unmodified `fumble` die for the GM.
export function rollTotal({ modifier = 0, rng = Math.random } = {}) {
  const first = rollD100(rng)

  // Fumble: a natural 1-5 on the first die. Roll one unmodified fumble die for
  // the GM to adjudicate; the check itself is a failure.
  if (first <= 5) {
    return {
      rolls: [first], roll: first, modifier, total: first + modifier,
      isFumble: true, fumble: rollD100(rng),
    }
  }

  // Explode: a die over 95 rolls again and adds; repeat while each new die is
  // over 95. The cap is a safety valve against a misbehaving rng — real rolls
  // never approach it.
  const rolls = [first]
  while (rolls[rolls.length - 1] > 95 && rolls.length < 50) {
    rolls.push(rollD100(rng))
  }
  const sum = rolls.reduce((a, b) => a + b, 0)
  return { rolls, roll: sum, modifier, total: sum + modifier, exploded: rolls.length > 1 }
}

// Spells: roll d100 under a computed target. roll === target is a success (≤).
export function resolveUnder({ target, rng = Math.random }) {
  const roll = rollD100(rng)
  if (target == null) {
    return { roll, target: null, success: false, margin: null, outOfRange: true }
  }
  return { roll, target, success: roll <= target, margin: target - roll }
}
