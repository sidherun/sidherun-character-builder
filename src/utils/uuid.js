// Generate a v4-style UUID.
//
// crypto.randomUUID() only exists in a *secure context* (HTTPS or localhost),
// so over plain http it's undefined/throws — which would crash roster saves,
// item adds, and toasts before the custom domain's TLS cert provisions. Prefer
// it when available, then fall back to crypto.getRandomValues (which IS
// available in non-secure contexts), and finally to Math.random on ancient
// browsers. These ids are opaque local keys, not secrets, so the fallback's
// randomness quality is not security-sensitive.
export function uuid() {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') {
    try { return c.randomUUID() } catch { /* not a secure context — fall through */ }
  }
  if (c && typeof c.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16))
    b[6] = (b[6] & 0x0f) | 0x40 // version 4
    b[8] = (b[8] & 0x3f) | 0x80 // variant 10xx
    const h = Array.from(b, x => x.toString(16).padStart(2, '0'))
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = Math.floor(Math.random() * 16)
    const v = ch === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
