// Player prefs for the dice animation + sound (persisted per device). Animation
// is force-off under prefers-reduced-motion. Sound defaults on but is one-tap
// mutable (courtesy for shared spaces).
const K_ANIM = 'sidherun_dice_anim'
const K_SOUND = 'sidherun_dice_sound'

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function animationsOn() {
  if (prefersReducedMotion()) return false
  try { return localStorage.getItem(K_ANIM) !== 'off' } catch { return true }
}

export function soundOn() {
  try { return localStorage.getItem(K_SOUND) !== 'off' } catch { return true }
}

export function setAnimations(on) {
  try { localStorage.setItem(K_ANIM, on ? 'on' : 'off') } catch { /* ignore */ }
}

export function setSound(on) {
  try { localStorage.setItem(K_SOUND, on ? 'on' : 'off') } catch { /* ignore */ }
}
