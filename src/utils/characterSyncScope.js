import { createPendingCharacterWrites } from './pendingCharacterWrites.js'

function createScope(identity) {
  const writes = createPendingCharacterWrites()
  return {
    identity,
    writes,
    revisions: new Map(),
    disposed: false,
    dispose() {
      if (this.disposed) return
      this.disposed = true
      writes.dispose()
      this.revisions.clear()
    },
  }
}

// Keeps sync work alive across route remounts for the same identity, while
// guaranteeing that an account/link change destroys every callback, failure,
// timer and revision owned by the previous identity. A null identity means auth
// is still resolving; retain the current scope but do not write until resolved.
export function createCharacterSyncScopeRegistry() {
  let current = null
  return {
    forIdentity(identity) {
      if (identity == null) {
        if (!current) current = createScope(null)
        return current
      }
      if (current && current.identity == null) {
        current.identity = identity
        return current
      }
      if (!current) {
        current = createScope(identity)
        return current
      }
      if (current.identity !== identity) {
        current.dispose()
        current = createScope(identity)
      }
      return current
    },
    reset() {
      current?.dispose()
      current = null
    },
  }
}

export const appCharacterSyncScopes = createCharacterSyncScopeRegistry()
