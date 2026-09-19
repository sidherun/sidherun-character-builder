// Serializes debounced cloud writes per character. Pending callbacks are removed
// before they are queued, so switch/pagehide signals cannot replay them. Failed
// newest snapshots remain retryable, and structural remote nudges wait until the
// local queue (including failures) is clear.
export function createPendingCharacterWrites({
  setTimer = (...args) => setTimeout(...args),
  clearTimer = timer => clearTimeout(timer),
} = {}) {
  const states = new Map()
  let sequence = 0
  let disposed = false

  const stateFor = characterId => {
    if (!states.has(characterId)) {
      states.set(characterId, {
        pending: new Map(),
        queue: [],
        running: false,
        failed: new Map(),
        latestBySlot: new Map(),
        deferredRemote: null,
        remoteRunning: false,
        retryRequested: false,
      })
    }
    return states.get(characterId)
  }

  const isBusy = characterId => {
    if (disposed) return false
    const state = states.get(characterId)
    return Boolean(state && (
      state.pending.size || state.queue.length || state.running || state.failed.size
    ))
  }

  const runRemote = (characterId, task) => {
    if (disposed) return
    const state = stateFor(characterId)
    if (state.remoteRunning) {
      state.deferredRemote = task
      return
    }
    state.remoteRunning = true
    Promise.resolve().then(() => {
      if (disposed) return
      return task()
    }).then(() => {
      state.remoteRunning = false
      drainRemote(characterId)
    }, () => {
      state.remoteRunning = false
      // Broadcasts are nudges, so retain a failed refetch for the next
      // online/focus retry rather than losing the only signal.
      state.deferredRemote = task
    })
  }

  const drainRemote = characterId => {
    const state = states.get(characterId)
    if (!state || state.remoteRunning || isBusy(characterId) || !state.deferredRemote) return
    const task = state.deferredRemote
    state.deferredRemote = null
    runRemote(characterId, task)
  }

  const runNext = characterId => {
    const state = stateFor(characterId)
    if (state.running || !state.queue.length) return
    const entry = state.queue.shift()
    state.running = true
    const expectedRevision = typeof entry.expectedRevision === 'function'
      ? entry.expectedRevision()
      : entry.expectedRevision

    Promise.resolve()
      .then(() => {
        if (disposed) return
        return entry.run({ characterId, expectedRevision })
      })
      .then(() => {
        if (disposed) return
        const failed = state.failed.get(entry.slot)
        if (!failed || failed.sequence <= entry.sequence) state.failed.delete(entry.slot)
      }, () => {
        if (disposed) return
        // Only retry the newest snapshot for a slot. A newer pending/queued edit
        // supersedes this failure and will run next.
        if (state.latestBySlot.get(entry.slot)?.sequence === entry.sequence) {
          state.failed.set(entry.slot, entry)
        }
      })
      .finally(() => {
        if (disposed) return
        state.running = false
        if (state.queue.length) runNext(characterId)
        else if (state.retryRequested) {
          state.retryRequested = false
          if (!retryCharacter(characterId)) drainRemote(characterId)
        }
        else drainRemote(characterId)
      })
  }

  const enqueue = entry => {
    if (disposed) return
    const state = stateFor(entry.characterId)
    state.queue.push(entry)
    runNext(entry.characterId)
  }

  const consume = (characterId, slot) => {
    const state = states.get(characterId)
    const entry = state?.pending.get(slot)
    if (!entry) return null
    state.pending.delete(slot) // atomic: later lifecycle signals cannot replay it
    clearTimer(entry.timer)
    enqueue(entry)
    return entry
  }

  const schedule = (slot, { characterId, expectedRevision = null, delay, run }) => {
    if (disposed) return null
    const state = stateFor(characterId)
    const previous = state.pending.get(slot)
    if (previous) clearTimer(previous.timer)

    const entry = {
      slot,
      characterId,
      expectedRevision,
      run,
      sequence: ++sequence,
      timer: null,
    }
    state.failed.delete(slot) // the new snapshot supersedes a failed older one
    state.latestBySlot.set(slot, entry)
    entry.timer = setTimer(() => consume(characterId, slot), delay)
    state.pending.set(slot, entry)
    return entry.sequence
  }

  const flushCharacter = characterId => {
    if (disposed) return []
    const state = states.get(characterId)
    if (!state) return []
    return [...state.pending.keys()].map(slot => consume(characterId, slot)).filter(Boolean)
  }

  const flushAll = () => {
    if (disposed) return []
    const flushed = []
    for (const characterId of states.keys()) flushed.push(...flushCharacter(characterId))
    return flushed
  }

  const retryCharacter = characterId => {
    if (disposed) return false
    const state = states.get(characterId)
    if (!state || !state.failed.size) return false
    if (state.running || state.queue.length) {
      state.retryRequested = true
      return true
    }
    const retries = [...state.failed.values()].sort((a, b) => a.sequence - b.sequence)
    state.failed.clear()
    for (const entry of retries) enqueue(entry)
    return retries.length > 0
  }

  const retryAllFailed = () => {
    if (disposed) return false
    let retried = false
    for (const [characterId, state] of states) {
      retried = retryCharacter(characterId) || retried
      if (!isBusy(characterId) && state.deferredRemote) {
        drainRemote(characterId)
        retried = true
      }
    }
    return retried
  }

  const requestRemote = (characterId, task) => {
    if (disposed) return false
    const state = stateFor(characterId)
    if (isBusy(characterId) || state.remoteRunning) {
      state.deferredRemote = task // one fresh refetch is enough
      return false
    }
    runRemote(characterId, task)
    return true
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    for (const state of states.values()) {
      for (const entry of state.pending.values()) clearTimer(entry.timer)
      state.pending.clear()
      state.queue.length = 0
      state.failed.clear()
      state.deferredRemote = null
      state.retryRequested = false
    }
    states.clear()
  }

  return {
    schedule,
    flushCharacter,
    flushAll,
    retryCharacter,
    retryAllFailed,
    requestRemote,
    isBusy,
    dispose,
  }
}
