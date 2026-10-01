import { supabase } from './supabaseClient.js'
import { ensureRealtimeAuth, cachedCampaignIds, openAuthorizedChannel } from './realtimeAuth.js'
import {
  stripRollIdentity,
  tableTopic,
} from '../../supabase/functions/_shared/realtimeContract.js'

// Shared roll feed. Rolls are ephemeral. A signed-in player or a guest with a
// live link publishes through an RPC that stamps the actor from the character
// row and broadcasts on the private channel `table:<campaign id>`. There is no
// world-writable `session:default` topic.
//
// Same-device play without a cloud session uses a browser BroadcastChannel
// (and an in-page fallback). That path never leaves the browser. A LAN table
// with no sign-in and no shared browser still has no network feed — there is
// no local server to authorize.

const LOCAL_TOPIC = 'sidherun-local-roll-feed'
let localChannel = null
const localListeners = new Set()

let publisher = { characterId: null, capabilityToken: null }

export function bindRollPublisher(next) {
  publisher = {
    characterId: next?.characterId || null,
    capabilityToken: next?.capabilityToken || null,
  }
}

function deliverLocal(payload) {
  localListeners.forEach(fn => { try { fn(payload) } catch { /* a listener throwing is not our concern */ } })
}

function ensureLocal() {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!localChannel) {
    localChannel = new BroadcastChannel(LOCAL_TOPIC)
    localChannel.onmessage = (event) => deliverLocal(event.data)
  }
  return localChannel
}

export function publishLocalRoll(entry) {
  const payload = { ...entry, ts: entry.ts || Date.now(), transport: 'local' }
  const channel = ensureLocal()
  if (channel) channel.postMessage(payload)
  else deliverLocal(payload)
}

export function subscribeLocalRollFeed(onRoll) {
  ensureLocal()
  localListeners.add(onRoll)
  return () => {
    localListeners.delete(onRoll)
    if (localListeners.size === 0 && localChannel) {
      localChannel.close()
      localChannel = null
    }
  }
}

// The play view calls this with the roll facts only. Identity is bound by
// bindRollPublisher and then replaced by the database.
export async function broadcastRoll(entry) {
  const facts = stripRollIdentity(entry)
  try {
    if (!supabase) {
      publishLocalRoll({ ...entry, ts: Date.now() })
      return
    }
    if (publisher.capabilityToken) {
      const { error } = await supabase.rpc('publish_roll_for_token', {
        p_token: publisher.capabilityToken,
        p_roll: facts,
      })
      if (error) throw error
      return
    }
    if (publisher.characterId) {
      const { error } = await supabase.rpc('publish_roll', {
        p_character_id: publisher.characterId,
        p_roll: facts,
      })
      if (error) throw error
      return
    }
    publishLocalRoll({ ...entry, ts: Date.now() })
  } catch {
    // The roller's own banner already showed the result. The feed is best-effort.
  }
}

// Map a server-attested character id onto the roster id the GM screen already
// uses. Local same-device rolls keep the roster id they were sent with.
export function adoptServerRoll(entry, chars, cloudIdFor) {
  if (!entry?.characterId || entry.transport === 'local') return entry
  const match = (chars || []).find(c =>
    c._rosterId === entry.characterId || cloudIdFor?.(c._rosterId) === entry.characterId)
  if (!match) return { ...entry, rosterId: entry.characterId }
  return { ...entry, rosterId: match._rosterId }
}

// `local: true` listens to the same-device channel. `campaignId` joins that
// campaign's private channel. `campaignsFromAuth` joins every campaign the
// current GM-key grant can see.
export function subscribeRollFeed(onRoll, { local = false, campaignId = null, campaignsFromAuth = false } = {}) {
  const stops = []
  if (local || !supabase) stops.push(subscribeLocalRollFeed(onRoll))
  if (supabase && campaignId) {
    const topic = tableTopic(campaignId)
    if (topic) stops.push(openAuthorizedChannel(topic, { self: true, events: { roll: ({ payload }) => onRoll(payload) } }))
  }
  if (supabase && campaignsFromAuth) {
    let cancelled = false
    const nested = []
    ensureRealtimeAuth().then(() => {
      if (cancelled) return
      for (const id of cachedCampaignIds() || []) {
        const topic = tableTopic(id)
        if (topic) nested.push(openAuthorizedChannel(topic, { self: true, events: { roll: ({ payload }) => onRoll(payload) } }))
      }
    }).catch(() => {})
    stops.push(() => {
      cancelled = true
      nested.forEach(stop => stop())
    })
  }
  return () => stops.forEach(stop => stop())
}
