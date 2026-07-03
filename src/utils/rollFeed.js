import { supabase } from './supabaseClient.js'

// Shared roll feed (#148). Every player + the GM in the game broadcast their
// dice rolls to ONE table-scoped channel; the GM screen renders a live feed.
// Rolls are ephemeral — pure Supabase broadcast, no DB rows, no migration.
//
// APPROACH A (single home table): one hardcoded session id. Fine for a single
// Sidherun game. Per-campaign / multi-table channels are a backlog story
// (issue #150) — when needed, make SESSION_ID dynamic and everything else here
// keeps working unchanged.
export const SESSION_ID = 'default'
const TOPIC = `session:${SESSION_ID}`

// Plane-agnostic: works under the auth plane or the guest plane — it only needs
// the shared Supabase client, which exists whenever cloud is enabled. Inert
// (safe no-ops) when cloud is off, so the localStorage-only build is unaffected.
let channel = null
const listeners = new Set()

function ensureChannel() {
  if (!supabase) return null
  if (!channel) {
    // self:true so a client that both rolls and views its own feed still sees
    // the roll (harmless for the GM screen, which doesn't broadcast).
    channel = supabase.channel(TOPIC, { config: { broadcast: { self: true } } })
    channel.on('broadcast', { event: 'roll' }, ({ payload }) => {
      listeners.forEach(fn => { try { fn(payload) } catch { /* a listener throwing is not our concern */ } })
    })
    channel.subscribe()
  }
  return channel
}

// Broadcast a dice roll to the table. Best-effort and ephemeral; `ts` is stamped
// here so callers (PlayMode) stay clean. No-op when cloud is off.
export function broadcastRoll(entry) {
  const ch = ensureChannel()
  if (!ch) return
  ch.send({ type: 'broadcast', event: 'roll', payload: { ...entry, ts: Date.now() } })
}

// Subscribe to the shared roll feed (the GM screen). Returns an unsubscribe fn.
// Multiple subscribers share the one channel; it's torn down when the last one
// leaves. Returns a no-op unsubscribe when cloud is off.
export function subscribeRollFeed(onRoll) {
  if (!supabase) return () => {}
  ensureChannel()
  listeners.add(onRoll)
  return () => {
    listeners.delete(onRoll)
    if (listeners.size === 0 && channel && supabase) {
      supabase.removeChannel(channel)
      channel = null
    }
  }
}
