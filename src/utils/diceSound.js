// Our own dice sound layer. The 3D engine's built-in audio is iOS-fragile (hangs
// init, crashes mid-roll — spike), so we play the sound ourselves.
//
// iOS is why this uses plain HTML5 <audio>, NOT the Web Audio API: a Web Audio
// context created outside a user gesture gets stuck suspended on iOS, and Web
// Audio is silenced by the ringer/mute switch. A plain <audio> element played
// inside the tap gesture unlocks reliably and routes through media playback. A
// single recording per roll needs no polyphony, so <audio> is the right tool.
//
// PRIMARY: real roll recordings in `public/sfx/`, rotated per roll so it doesn't
// sound identical every time (roll.wav = mixed offline from the engine's real
// dice-hit + felt samples; roll-b/roll-c.mp3 = recorded RPG dice rolls). Add more
// files to `ROLL_SRCS` to widen the rotation — they're picked up automatically.
//
// FALLBACK: if no recording loads, a thinning rattle of individual hit samples.

const ROLL_SRCS = ['/sfx/roll.wav', '/sfx/roll-b.mp3', '/sfx/roll-c.mp3']
const HITS = [
  'dicehit_plastic8', 'dicehit_plastic9', 'dicehit_plastic11',
  'dicehit_plastic13', 'dicehit_plastic14',
]
const SETTLE = 'dicehit_plastic8'
const SRC = (name) => `/dice3d/sounds/dicehit/${name}.mp3`

const rollAudios = [] // one <audio> per recording, rotated per roll
let rollIndex = 0
let built = false
let primed = false
let pumpTimer = null

const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : 0)

// Create an <audio> element per recording. A file that fails to load prunes
// itself so the rotation only cycles real sounds.
function ensureBuilt() {
  if (built || typeof Audio === 'undefined') return
  built = true
  for (const url of ROLL_SRCS) {
    const a = new Audio()
    a.preload = 'auto'
    a.addEventListener('error', () => {
      const i = rollAudios.indexOf(a)
      if (i >= 0) rollAudios.splice(i, 1)
    }, { once: true })
    a.src = url
    try { a.load() } catch { /* ignore */ }
    rollAudios.push(a)
  }
}

// iOS only allows programmatic <audio> playback after an in-gesture play(). Prime
// every element with a muted play/pause on the first touch so the first real roll
// isn't the one that gets swallowed while unlocking.
function primeOnFirstGesture() {
  if (primed || typeof document === 'undefined') return
  primed = true
  const prime = () => {
    for (const a of rollAudios) {
      try {
        a.muted = true
        const p = a.play()
        if (p && p.then) p.then(() => { a.pause(); a.currentTime = 0; a.muted = false }).catch(() => { a.muted = false })
        else { a.pause(); a.muted = false }
      } catch { a.muted = false }
    }
    document.removeEventListener('touchend', prime)
    document.removeEventListener('pointerdown', prime)
  }
  document.addEventListener('touchend', prime, { once: true, passive: true })
  document.addEventListener('pointerdown', prime, { once: true, passive: true })
}

// Build the elements + arm the unlock ahead of the first roll. Called on Play
// Mode mount (and again, harmlessly, on the first roll).
export function preloadSound() {
  ensureBuilt()
  primeOnFirstGesture()
}

function pick() { return HITS[(Math.random() * HITS.length) | 0] }

// Fallback per-hit player (also used to unlock nothing — pure HTML5).
function htmlHit(name, volume) {
  try {
    const a = new Audio(SRC(name))
    a.volume = volume
    const p = a.play()
    if (p && p.catch) p.catch(() => {})
  } catch { /* ignore */ }
}

const MAX_MS = 2400 // safety: never rattle longer than a roll could take

// Recursive fallback pump — a hit, then the next scheduled with a lengthening
// interval and fading volume so it sounds like a roll settling out.
function pump(startedAt) {
  const elapsed = perfNow() - startedAt
  if (elapsed >= MAX_MS) { pumpTimer = null; return }
  const t = Math.min(elapsed / MAX_MS, 1) // 0 (throw) → 1 (nearly stopped)
  const volume = Math.max(0.1, 0.42 - 0.3 * t + (Math.random() - 0.5) * 0.06)
  htmlHit(pick(), volume)
  const interval = 95 + 220 * t + Math.random() * 70
  pumpTimer = setTimeout(() => pump(startedAt), interval)
}

function stopPump() {
  if (pumpTimer) { clearTimeout(pumpTimer); pumpTimer = null }
}

// Play the roll sound. Call synchronously in the roll tap so iOS allows playback.
export function playRollSound() {
  preloadSound()
  stopPump()
  // Preferred: a roll recording, one shot, rotating through the loaded set.
  if (rollAudios.length) {
    const a = rollAudios[rollIndex % rollAudios.length]
    rollIndex++
    try { a.currentTime = 0 } catch { /* not yet seekable; plays from 0 anyway */ }
    a.muted = false
    a.volume = 0.9 // ignored on iOS (device volume), applied on desktop
    try {
      const p = a.play()
      if (p && p.catch) p.catch(() => {})
      return
    } catch { /* fall through to the synth */ }
  }
  // Fallback: a thinning rattle from the hit samples.
  const start = perfNow()
  htmlHit(pick(), 0.5)
  pumpTimer = setTimeout(() => pump(start), 110)
}

// Called at real settle time. The recordings include their own settle, so this
// only does anything in the fallback path (stop the rattle + a final clack).
export function playSettleSound() {
  if (rollAudios.length) return
  stopPump()
  htmlHit(SETTLE, 0.7)
}
