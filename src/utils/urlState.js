import LZString from 'lz-string'

export function encodeCharacterToURL(character) {
  const json = JSON.stringify(character)
  const encoded = LZString.compressToEncodedURIComponent(json)
  return `${window.location.origin}${window.location.pathname}#share=${encoded}`
}

export function encodeCharacterToPlayURL(character) {
  const json = JSON.stringify(character)
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
  try { return JSON.parse(json) } catch { return null }
}

export function getURLRouteType() {
  const hash = window.location.hash
  if (hash.startsWith('#play='))  return 'play'
  if (hash.startsWith('#share=')) return 'share'
  return null
}
