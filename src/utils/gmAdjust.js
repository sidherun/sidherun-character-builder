import { applyStoryPointOp } from './storyPoints.js'

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

// GM screen Story Points edits (#377). Reasons, added rows and deletions are
// structural (the list lives in `data`), so the GM saves them with the data
// revision check rather than the live patch. Always start from the freshest
// row so the GM never overwrites a player's newer sheet; if a player saves in
// between, re-apply the same op to the new copy once, then give up loudly.
// `repo` supplies getCharacter + saveCharacterData (characterRepo.js).
export async function saveStoryPointOp(id, op, repo, attempts = 2) {
  for (let i = 0; i < attempts; i++) {
    const fresh = await repo.getCharacter(id)
    if (!fresh) throw new Error('Character not found')
    const next = { ...fresh, storyPoints: applyStoryPointOp(fresh.storyPoints, op) }
    const saved = await repo.saveCharacterData(id, next, fresh._dataRev)
    if (!saved?.conflict) return { next, saved }
  }
  throw new Error('Story Points not saved: the character changed on another device. Try again.')
}
