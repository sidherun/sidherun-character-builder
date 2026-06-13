// Simple base64 URL encoding — no external deps
function compress(str) {
  return btoa(encodeURIComponent(str))
}

function decompress(str) {
  try { return decodeURIComponent(atob(str)) } catch { return null }
}

export function encodeCharacterToURL(character) {
  const json = JSON.stringify(character)
  const encoded = compress(json)
  return `${window.location.origin}${window.location.pathname}#share=${encoded}`
}

export function decodeCharacterFromURL() {
  const hash = window.location.hash
  if (!hash.startsWith('#share=')) return null
  const encoded = hash.slice('#share='.length)
  const json = decompress(encoded)
  if (!json) return null
  try { return JSON.parse(json) } catch { return null }
}
