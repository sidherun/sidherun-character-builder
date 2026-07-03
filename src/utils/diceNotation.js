// Maps a Sidherun roll result to what the 3D dice engine (dice-box-threejs)
// should physically show. Pure + unit-tested so the animation layer stays
// deterministic and matches the rules-computed number exactly (spike-validated).
//
// A Sidherun d100 is a percentile PAIR: a tens die + a ones die. In
// dice-box-threejs a `d100` die shows the tens (faces 00,10,…,90; the "00" face
// has value 100) and a `d10` shows the units (faces 0–9; the "0" face has value
// 10). So `1d100+1d10` renders the authentic pair, and we read tens*10 + units
// ourselves (00 + 0 = 100).

// A 1–100 result → the forced dice values + engine notation for one percentile pair.
export function percentileForced(n) {
  const m = n % 100                       // 100 → 0
  const tens = Math.floor(m / 10)         // 0–9
  const units = m % 10                    // 0–9
  const d100val = tens === 0 ? 100 : tens * 10   // "00" face is value 100
  const d10val = units === 0 ? 10 : units        // "0" face is value 10
  return { d100val, d10val, notation: `1d100+1d10@${d100val},${d10val}` }
}

// Inverse: read the two dice values back to a 1–100 result (00 + 0 → 100).
export function percentileRead(d100val, d10val) {
  const tens = d100val === 100 ? 0 : d100val / 10
  const units = d10val === 10 ? 0 : d10val
  const pct = tens * 10 + units
  return pct === 0 ? 100 : pct
}

// The primary raw d100 to animate for a roll result from rollActions.js:
// spells animate their single roll; skills/attacks animate their first d100
// (the banner remains the source of truth for the full total / explosion /
// fumble — the animation is a flourish on the lead die).
export function primaryRoll(entry) {
  if (!entry) return null
  if (entry.kind === 'spell') return entry.roll ?? null
  return (Array.isArray(entry.rolls) && entry.rolls.length) ? entry.rolls[0] : (entry.roll ?? null)
}

// Full engine spec for a roll result, or null when there's nothing to animate
// (e.g. an out-of-range spell). `{ notation, d100val, d10val }`.
export function rollToDiceSpec(entry) {
  const p = primaryRoll(entry)
  if (p == null || p < 1 || p > 100) return null
  return percentileForced(p)
}
