// App-wide cloud sync health, so a player can trust their changes are actually
// reaching the cloud instead of failing silently (#145). Status reflects the
// last push plus the browser's online state — not per character.
//
//   off      cloud disabled (localStorage-only build) — show nothing
//   offline  the browser is offline
//   syncing  a push is in flight
//   synced   the last push succeeded
//   error    the last push failed
import { cloudEnabled } from './supabaseClient.js'

let lastPush = 'synced' // optimistic until something actually fails
const listeners = new Set()

function compute() {
  if (!cloudEnabled) return 'off'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline'
  return lastPush
}

function emit() {
  const s = compute()
  listeners.forEach(fn => { try { fn(s) } catch { /* a listener throwing is not our concern */ } })
}

// Reflect network changes immediately (going offline/online flips the badge).
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('online', emit)
  window.addEventListener('offline', emit)
}

export function getCloudStatus() {
  return compute()
}

export function setCloudStatus(s) {
  lastPush = s
  emit()
}

// Wrap a push promise so the badge tracks it: syncing → synced / error. Returns
// the same promise so callers keep their existing `.catch`.
export function trackPush(promise) {
  setCloudStatus('syncing')
  return Promise.resolve(promise).then(
    (v) => { setCloudStatus('synced'); return v },
    (e) => { setCloudStatus('error'); throw e },
  )
}

export function subscribeCloudStatus(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
