import { createCharacter, replaceCharacterFromBackup, currentUserId } from './characterRepo.js'

export async function restoreCloudCharacters(plan, services = {}) {
  const create = services.create || createCharacter
  const replace = services.replace || replaceCharacterFromBackup
  const getUser = services.getUser || currentUserId
  const { characters, mode, targets, existing, userId, signal } = plan
  if (!userId || !['copy', 'replace'].includes(mode)) throw new Error('Sign in before restoring characters.')
  const chosen = mode === 'replace' ? Object.values(targets).filter(Boolean) : []
  if (new Set(chosen).size !== chosen.length) throw new Error('Choose each existing character only once.')
  const results = []
  for (const [index, character] of characters.entries()) {
    if (signal?.aborted) break
    try {
      if (await getUser() !== userId) throw new Error('Your account changed. Review the restore again after signing in.')
    } catch (error) {
      for (const remaining of characters.slice(index)) {
        results.push({ name: remaining.name, status: 'failed', message: error.message || 'Could not confirm your sign-in.' })
      }
      break
    }
    if (signal?.aborted) break
    const target = mode === 'replace' ? existing.find(c => c._rosterId === targets[index]) : null
    if (mode === 'replace' && !target) {
      results.push({ name: character.name, status: 'skipped', message: 'No replacement selected.' })
      continue
    }
    try {
      const saved = mode === 'copy'
        ? await create({ ...character, _rosterId: null }, { ownerUserId: userId, signal })
        : await replace(target, character, { signal })
      if (!saved?._rosterId) throw new Error('The cloud did not confirm this character was saved.')
      results.push({ name: character.name, status: 'saved', saved, message: mode === 'copy' ? 'Imported as a new copy.' : `Replaced ${target.name}.` })
    } catch (error) {
      if (signal?.aborted) break
      results.push({ name: character.name, status: 'failed', message: error.message || 'Could not save this character.' })
    }
  }
  return results
}
