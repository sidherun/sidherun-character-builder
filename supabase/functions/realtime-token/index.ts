// Exchange a character capability token or a legacy GM key for a short-lived
// realtime JWT. The token is signed with REALTIME_GUEST_JWT_SECRET, which must
// be a JWT secret the project still trusts (the legacy JWT secret, or an
// imported signing key). It is never shipped to the browser.
//
// verify_jwt is off (supabase/config.toml): guests have no user session. The
// capability token or GM key is the credential, and it is checked in the
// database before anything is signed.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignJWT } from 'npm:jose@5'
import {
  GUEST_REALTIME_ROLE,
  GUEST_SUBJECT,
  REALTIME_TOKEN_TTL_SECONDS,
  buildCharacterGrantClaims,
  buildGmGrantClaims,
} from '../_shared/realtimeContract.js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  const secret = Deno.env.get('REALTIME_GUEST_JWT_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!secret || !supabaseUrl || !serviceKey) return json({ error: 'unavailable' }, 503)

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'unauthorized' }, 401)
  }

  const capabilityToken = typeof body?.capabilityToken === 'string' ? body.capabilityToken : ''
  const gmKey = typeof body?.gmKey === 'string' ? body.gmKey : ''
  if (Boolean(capabilityToken) === Boolean(gmKey)) return json({ error: 'unauthorized' }, 401)

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let claims
  let characterId = null
  let campaignIds = []
  let scope

  if (capabilityToken) {
    const { data, error } = await admin.rpc('lookup_realtime_capability', { p_token: capabilityToken })
    const row = Array.isArray(data) ? data[0] : data
    if (error || !row?.character_id || !row?.token_hash) return json({ error: 'unauthorized' }, 401)
    scope = 'character'
    characterId = row.character_id
    campaignIds = row.campaign_id ? [row.campaign_id] : []
    claims = buildCharacterGrantClaims({
      characterId: row.character_id,
      campaignId: row.campaign_id,
      tokenHash: row.token_hash,
    })
  } else {
    const { data, error } = await admin.rpc('lookup_realtime_gm', { p_gm_key: gmKey })
    const row = Array.isArray(data) ? data[0] : data
    if (error || !row?.owner_hash) return json({ error: 'unauthorized' }, 401)
    scope = 'gm'
    campaignIds = row.campaign_ids || []
    claims = buildGmGrantClaims({ ownerHash: row.owner_hash })
  }

  const accessToken = await new SignJWT({ role: GUEST_REALTIME_ROLE, ...claims })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(`${supabaseUrl}/auth/v1`)
    .setAudience('authenticated')
    .setSubject(GUEST_SUBJECT)
    .setIssuedAt()
    .setExpirationTime(`${REALTIME_TOKEN_TTL_SECONDS}s`)
    .sign(new TextEncoder().encode(secret))

  return json({
    accessToken,
    expiresAt: Date.now() + REALTIME_TOKEN_TTL_SECONDS * 1000,
    expiresIn: REALTIME_TOKEN_TTL_SECONDS,
    scope,
    characterId,
    campaignIds,
  })
})
