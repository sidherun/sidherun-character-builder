const KEY = 'sidherun_login_destination'
const ALLOWED = new Set(['app', 'roster', 'gm', 'admin'])

export function validDestination(value) {
  return ALLOWED.has(value) ? value : null
}

export function rememberDestination(value) {
  const destination = validDestination(value)
  if (destination) {
    try { sessionStorage.setItem(KEY, destination) } catch { /* storage may be unavailable */ }
  }
}

export function pendingDestination() {
  const fromUrl = validDestination(new URL(window.location.href).searchParams.get('returnTo'))
  if (fromUrl) return fromUrl
  try { return validDestination(sessionStorage.getItem(KEY)) } catch { return null }
}

export function clearDestination() {
  try { sessionStorage.removeItem(KEY) } catch { /* storage may be unavailable */ }
  const url = new URL(window.location.href)
  url.searchParams.delete('returnTo')
  window.history.replaceState(null, '', url)
}

export function signInRedirectUrl() {
  const url = new URL(window.location.pathname, window.location.origin)
  const destination = pendingDestination()
  if (destination) url.searchParams.set('returnTo', destination)
  return url.href
}
