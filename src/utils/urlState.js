import LZString from 'lz-string'

const ATTR_KEYS = [
  'strength', 'agility', 'dexterity', 'endurance', 'constitution', 'intelligence',
  'wisdom', 'thaumaturgy', 'enlightenment', 'charisma', 'comeliness', 'fame',
]

// Compact, positional representation of a character for the #play= URL. Full
// JSON.stringify of a character produces a 2,000+ char compressed URL, which
// yields a QR-version-39 code that's too dense to scan when printed. This
// compact form (arrays instead of keyed objects, defaults dropped) cuts the
// payload ~3-4x, bringing the QR down to a scannable version. It only carries
// what Play Mode and the printout need; expand() reconstructs the full schema
// shape (ids, defaults) so safeParse still validates on decode.
function toCompact(c) {
  const at  = ATTR_KEYS.map(k => c.attributes?.[k]?.base || 0)
  const w   = (c.weapons || []).map(x => [x.name, x.attribute, x.attributeBonus || 0, x.skillBonus || 0, x.descriptor || '', x.usesSkill ? 1 : 0])
  const sk  = (c.skills  || []).map(x => [x.name, x.attributeName, x.attributeScore || 0, x.skillPoints || 0, x.tempMod || 0, x.isSpecialty ? 1 : 0, x.usePips || 0])
  const pw  = (c.powers  || []).map(x => [x.name, x.base || 0, x.attributeBonus || 0, x.skillBonus || 0, x.misc || 0, x.description || '', x.attributeType || '', x.powerBonus || 0])
  const cr  = (c.crafts  || []).map(x => [x.name, x.attributeName, x.attributeValue || 0, x.skillBonus || 0, x.misc || 0, x.description || ''])
  const inv = (c.inventory || []).map(x => typeof x === 'string' ? x : [x.name, x.quantity || '', x.notes || ''])
  const a   = c.armor || {}
  const d   = c.defense || {}
  const dv  = t => [d[t]?.skillBonus || 0, d[t]?.misc || 0]
  return [
    c.name || '', c.race || '', c.archetype || '', c.level || 1,
    (c.hasPowers ? 1 : 0) + (c.hasMagic ? 2 : 0), c.magicAttribute || 0,
    at, w, [a.type || 'none', a.absorption || 0, a.remaining || 0, a.max || 0], c.shield || 'none',
    [dv('typical'), dv('prone'), dv('magic'), dv('psychic'), [d.other?.base || 0, d.other?.skillBonus || 0, d.other?.misc || 0]],
    pw, cr, sk, inv,
    [c.hitPoints?.total || 0, c.hitPoints?.current || 0, c.mana?.total || 0, c.mana?.current || 0,
     c.storyPoints?.total || 0, c.storyPoints?.current || 0, c.xp?.current || 0, c.xp?.needed || 0],
    c.playerName || '', // appended last for back-compat with older links
  ]
}

function fromCompact(a) {
  const [name, race, archetype, level, flags, magicAttribute, at, w, arm, shield, def, pw, cr, sk, inv, res, playerName] = a
  const attributes = {}
  ATTR_KEYS.forEach((k, i) => { attributes[k] = { base: (at && at[i]) || 0, racialMod: 0, tempMod: 0 } })
  const dt = (pair) => ({ skillBonus: (pair && pair[0]) || 0, misc: (pair && pair[1]) || 0 })
  return {
    wizardStep: 9, _rosterId: null,
    name: name || '', playerName: playerName || '', race: race || 'human', raceType: 'healthy', raceValue: 20, raceSize: 'medium',
    archetype: archetype || 'worldly', hasPowers: !!(flags & 1), hasMagic: !!(flags & 2),
    magicAttribute: magicAttribute || null, level: level || 1, ageCategory: 'adult', backstory: '',
    attributes,
    // usesSkill (x[5]) is only present on links minted after the flag shipped;
    // omit it for older links so the schema migrates them from the skill bonus.
    weapons: (w || []).map((x, i) => ({ id: 'w' + i, name: x[0] || '', attribute: x[1] || '', attributeBonus: x[2] || 0, skillBonus: x[3] || 0, descriptor: x[4] || '', ...(x.length > 5 ? { usesSkill: !!x[5] } : {}) })),
    armor: { type: (arm && arm[0]) || 'none', absorption: (arm && arm[1]) || 0, remaining: (arm && arm[2]) || 0, max: (arm && arm[3]) || 0 },
    shield: shield || 'none',
    defense: {
      typical: dt(def && def[0]), prone: dt(def && def[1]), magic: dt(def && def[2]), psychic: dt(def && def[3]),
      other: { base: (def && def[4] && def[4][0]) || 0, skillBonus: (def && def[4] && def[4][1]) || 0, misc: (def && def[4] && def[4][2]) || 0 },
    },
    powers: (pw || []).map((x, i) => ({ id: 'p' + i, name: x[0] || '', base: x[1] || 0, attributeBonus: x[2] || 0, skillBonus: x[3] || 0, misc: x[4] || 0, description: x[5] || '', attributeType: x[6] || '', powerBonus: x[7] || 0 })),
    crafts: (cr || []).map((x, i) => ({ id: 'c' + i, name: x[0] || '', attributeName: x[1] || '', attributeValue: x[2] || 0, skillBonus: x[3] || 0, misc: x[4] || 0, description: x[5] || '' })),
    skills: (sk || []).map((x, i) => ({ id: 's' + i, name: x[0] || '', attributeName: x[1] || '', attributeScore: x[2] || 0, skillPoints: x[3] || 0, tempMod: x[4] || 0, isSpecialty: !!x[5], usePips: x[6] || 0 })),
    inventory: (inv || []).map(x => typeof x === 'string' ? x : { name: x[0] || '', quantity: x[1] || '', notes: x[2] || '' }),
    hitPoints:   { total: (res && res[0]) || 0, current: (res && res[1]) || 0 },
    mana:        { total: (res && res[2]) || 0, current: (res && res[3]) || 0 },
    storyPoints: { total: (res && res[4]) || 0, current: (res && res[5]) || 0 },
    xp:          { current: (res && res[6]) || 0, needed: (res && res[7]) || 0 },
    _notes: [], _tracking: { hp: 0, mana: 0, storyPoints: (res && res[4]) || 0 },
  }
}

export function encodeCharacterToURL(character) {
  const json = JSON.stringify(character)
  const encoded = LZString.compressToEncodedURIComponent(json)
  return `${window.location.origin}${window.location.pathname}#share=${encoded}`
}

export function encodeCharacterToPlayURL(character) {
  // Compact form keeps the QR scannable (see toCompact).
  const json = JSON.stringify(toCompact(character))
  const encoded = LZString.compressToEncodedURIComponent(json)
  return `${window.location.origin}${window.location.pathname}#play=${encoded}`
}

function decodeEncoded(encoded) {
  // Try LZString first (new format)
  const lz = LZString.decompressFromEncodedURIComponent(encoded)
  if (lz) return lz
  // Fall back to old plain base64 format for existing share links
  try { return decodeURIComponent(atob(encoded)) } catch { return null }
}

export function decodeCharacterFromURL() {
  const hash = window.location.hash
  const prefix = hash.startsWith('#share=') ? '#share='
               : hash.startsWith('#play=')  ? '#play='
               : null
  if (!prefix) return null
  const encoded = hash.slice(prefix.length)
  const json = decodeEncoded(encoded)
  if (!json) return null
  try {
    const parsed = JSON.parse(json)
    // Compact play payloads are arrays; full share payloads are objects.
    return Array.isArray(parsed) ? fromCompact(parsed) : parsed
  } catch { return null }
}

// Stable roster id derived from the raw #play= payload. The same play link
// always maps to the same roster entry, so re-opening or refreshing it resumes
// the tracked copy (HP/Mana/notes) instead of re-importing the pristine URL
// state and spawning a duplicate. Returns null when not on a play link.
export function getPlayLinkId() {
  const hash = window.location.hash
  if (!hash.startsWith('#play=')) return null
  const encoded = hash.slice('#play='.length)
  let h = 5381
  for (let i = 0; i < encoded.length; i++) {
    h = ((h << 5) + h + encoded.charCodeAt(i)) >>> 0 // djb2
  }
  return 'play-' + h.toString(36)
}

// Cloud links reference a server row + capability token instead of embedding the
// character data. Format: #c=<uuid>~<token>. The token is base64url (no '~'),
// and the uuid has no '~', so a single split is unambiguous. Much shorter than
// the embedded #play= blob, so the play-mode QR stays easily scannable.
export function encodeCloudLink(id, token) {
  return `${window.location.origin}${window.location.pathname}#c=${id}~${token}`
}

export function parseCloudLink() {
  const hash = window.location.hash
  if (!hash.startsWith('#c=')) return null
  const sep = hash.indexOf('~')
  if (sep < 0) return null
  const id = hash.slice('#c='.length, sep)
  const token = hash.slice(sep + 1)
  if (!id || !token) return null
  return { id, token }
}

export function getURLRouteType() {
  const hash = window.location.hash
  if (hash.startsWith('#c='))     return 'cloud'
  if (hash.startsWith('#play='))  return 'play'
  if (hash.startsWith('#share=')) return 'share'
  return null
}
