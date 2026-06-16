// Pure +/- adjustment of a character's live counters for the GM Screen.
// A non-positive total means the cap is unknown — treat as no cap so a value
// can still be raised (mirrors PlayMode).
const capOf = (total) => (total > 0 ? total : Infinity)

export function applyAdjust(c, kind, delta) {
  if (kind === 'hp') {
    return { ...c, hitPoints: { ...c.hitPoints, current: Math.max(0, Math.min(capOf(c.hitPoints?.total), (c.hitPoints?.current || 0) + delta)) } }
  }
  if (kind === 'mana') {
    return { ...c, mana: { ...c.mana, current: Math.max(0, Math.min(capOf(c.mana?.total), (c.mana?.current || 0) + delta)) } }
  }
  return { ...c, storyPoints: { ...c.storyPoints, current: Math.max(0, Math.min(capOf(c.storyPoints?.total), (c.storyPoints?.current || 0) + delta)) } }
}
