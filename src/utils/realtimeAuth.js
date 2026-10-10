import { supabase } from './supabaseClient.js'
import { REALTIME_TOKEN_TTL_SECONDS } from '../../supabase/functions/_shared/realtimeContract.js'

// One realtime identity per page. Character channels and the roll feed share
// it: a signed-in session, one capability token, or the legacy GM key.
// `secret` is read at exchange time so a rotated token is what we send next.
let mode = null
let installedKey = 'off'
let cache = null
let requestSerial = 0
let inflight = null
let refreshTimer = null
const channelClosers = new Set()

function invalidateGrant() {
  cache = null
  inflight = null
  requestSerial += 1
  clearTimeout(refreshTimer)
  refreshTimer = null
}

export function installRealtimeAuth(next) {
  const key = next?.key || next?.type || 'off'
  mode = next
  if (key === installedKey) return
  installedKey = key
  invalidateGrant()
}

export function resetRealtimeAuthForTests() {
  mode = null
  installedKey = 'off'
  invalidateGrant()
  channelClosers.clear()
}

function scheduleRefresh(grant) {
  clearTimeout(refreshTimer)
  const delay = Math.max(5_000, grant.expiresAt - Date.now() - 60_000)
  refreshTimer = setTimeout(() => { void refreshRealtimeAuth() }, delay)
  // Node tests must not wait out the guest TTL. Browsers have no unref; the
  // timer still fires there and renews the socket token.
  if (typeof refreshTimer?.unref === 'function') refreshTimer.unref()
}

async function exchange(body) {
  const { data, error } = await supabase.functions.invoke('realtime-token', { body })
  if (error || !data?.accessToken) {
    const status = error?.context?.status
    return { revoked: status === 401 || status === 403 || data?.error === 'unauthorized' }
  }
  return {
    accessToken: data.accessToken,
    expiresAt: data.expiresAt || (Date.now() + REALTIME_TOKEN_TTL_SECONDS * 1000),
    campaignIds: data.campaignIds || [],
    characterId: data.characterId || null,
    scope: data.scope,
  }
}

async function loadGrant() {
  if (!mode) return null
  if (mode.type === 'user') {
    const { data } = await supabase.auth.getSession()
    const session = data?.session
    if (!session?.access_token) return { revoked: true }
    return {
      accessToken: session.access_token,
      expiresAt: (session.expires_at || 0) * 1000 || (Date.now() + 50 * 60 * 1000),
      campaignIds: null,
      scope: 'user',
    }
  }
  const secret = mode.secret?.()
  if (!secret) return { revoked: true }
  if (mode.type === 'capability') return exchange({ capabilityToken: secret })
  if (mode.type === 'gm') return exchange({ gmKey: secret })
  return { revoked: true }
}

function dropOpenChannels() {
  for (const close of [...channelClosers]) close()
}

// One exchange at a time per identity. Character channels and the roll feed
// subscribe together; a second caller must not cancel the first channel's grant.
async function loadGrantIntoCache(key, serial) {
  let grant
  try {
    grant = await loadGrant()
  } catch {
    grant = { failed: true }
  }
  if (inflight?.serial === serial) inflight = null
  // A newer exchange (rotation, or a second subscribe) owns the result. Wait
  // for it instead of telling this channel the grant failed.
  if (serial !== requestSerial || key !== installedKey) {
    if (inflight?.key === installedKey) return inflight.promise
    return cache?.key === installedKey ? cache : null
  }
  if (!grant?.accessToken) {
    if (grant?.revoked) {
      cache = null
      dropOpenChannels()
    }
    return null
  }
  cache = { ...grant, key }
  await supabase.realtime.setAuth(grant.accessToken)
  if (serial !== requestSerial || key !== installedKey) {
    if (inflight?.key === installedKey) return inflight.promise
    return cache?.key === installedKey ? cache : null
  }
  scheduleRefresh(cache)
  return cache
}

// Resolves the current token and installs it on the realtime socket.
// A 401 from the exchange drops open channels; a transport failure keeps an
// unexpired token so a blip does not end the table's live view.
export async function ensureRealtimeAuth() {
  if (!supabase || !mode) return null
  const key = installedKey
  if (cache && cache.key === key && cache.expiresAt - Date.now() > 60_000) {
    await supabase.realtime.setAuth(cache.accessToken)
    return cache
  }
  if (inflight?.key === key) return inflight.promise
  const serial = requestSerial
  const promise = loadGrantIntoCache(key, serial)
  inflight = { key, serial, promise }
  return promise
}

export async function refreshRealtimeAuth() {
  invalidateGrant()
  return ensureRealtimeAuth()
}

// Private channel only. The channel object exists immediately so a caller can
// drop it, but subscribe() waits for a token. A refused token never joins.
export function openAuthorizedChannel(topic, { self = false, events = {} } = {}) {
  if (!supabase || !topic) return () => {}
  const channel = supabase.channel(topic, {
    config: { private: true, broadcast: { self } },
  })
  for (const [event, handler] of Object.entries(events)) {
    channel.on('broadcast', { event }, handler)
  }
  let stopped = false
  const close = () => {
    if (stopped) return
    stopped = true
    channelClosers.delete(close)
    supabase.removeChannel(channel)
  }
  channelClosers.add(close)
  ensureRealtimeAuth().then(grant => {
    if (stopped) return
    if (!grant) { close(); return }
    channel.subscribe()
  }).catch(() => { close() })
  return close
}

export function cachedCampaignIds() {
  return cache?.campaignIds || null
}
