// Shared by the browser and the realtime-token Edge Function. Topic names,
// guest-token lifetime, and the claims the database policies trust live here
// so the two sides cannot drift apart.

// Seeded by migration 0007. Fresh installs use this id; clients still learn
// the campaign id from the server (character row or token exchange).
export const HOME_CAMPAIGN_ID = 'a1111111-1111-4111-8111-111111111111'

// Postgres role created for guest realtime JWTs. It has no table grants, so
// the token cannot be reused as a Data API session.
export const GUEST_REALTIME_ROLE = 'realtime_guest'

// Not an auth.users id. Policies for this role ignore `sub` and read the
// capability claims below.
export const GUEST_SUBJECT = '00000000-0000-0000-0000-000000000000'

// Realtime caches channel policies until the JWT expires or a new one is
// sent. Rotation stops new tokens immediately; an already-open socket dies
// at this bound.
export const REALTIME_TOKEN_TTL_SECONDS = 600

export function characterTopic(characterId) {
  return characterId ? `char:${characterId}` : null
}

export function tableTopic(campaignId) {
  return campaignId ? `table:${campaignId}` : null
}

export function buildCharacterGrantClaims({ characterId, campaignId, tokenHash }) {
  return {
    realtime_scope: 'character',
    character_id: characterId,
    campaign_id: campaignId,
    token_hash: tokenHash,
  }
}

export function buildGmGrantClaims({ ownerHash }) {
  return {
    realtime_scope: 'gm',
    owner_hash: ownerHash,
  }
}

// Identity fields are filled by the database from the character row. Anything
// the browser puts here is discarded before the broadcast.
const CLIENT_IDENTITY_KEYS = [
  'actor', 'rosterId', 'characterId', 'userId', 'campaignId', 'ts', 'gmTarget', 'transport',
]

export function stripRollIdentity(roll) {
  const next = { ...(roll && typeof roll === 'object' ? roll : {}) }
  for (const key of CLIENT_IDENTITY_KEYS) delete next[key]
  return next
}

export { CLIENT_IDENTITY_KEYS }
