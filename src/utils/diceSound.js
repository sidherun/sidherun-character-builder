// Our own dice sound layer. The 3D engine's built-in audio is iOS-fragile (hangs
// init, crashes mid-roll — spike), so we play the clacks ourselves.
//
// The sound is a *continuous rattle synced to the tumble*, not a few discrete
// clacks: playRollSound() starts a thinning pump on the roll tap (dense clatter
// as the dice are thrown, thinning as they slow), and playSettleSound() stops it
// and plays the final clack the instant the dice actually settle (it's called
// from the roll promise's .finally, i.e. at real settle time).
//
// Web Audio (not plain <audio>) because a rattle needs dense polyphony — iOS
// caps overlapping HTML5 Audio elements, but a single AudioContext handles many
// overlapping buffer sources fine once resumed on a gesture. The first
// playRollSound() happens inside the roll tap, which unlocks iOS audio. If Web
// Audio is unavailable, we fall back to spaced HTML5 clacks so sound never
// regresses to silence.

const HITS = [
  'dicehit_plastic8', 'dicehit_plastic9', 'dicehit_plastic11',
  'dicehit_plastic13', 'dicehit_plastic14',
]
const SETTLE = 'dicehit_plastic8'
const SRC = (name) => `/dice3d/sounds/dicehit/${name}.mp3`

let ctx = null
const buffers = new Map() // name -> AudioBuffer
let loading = null
let pumpTimer = null

function ensureCtx() {
  if (ctx) return ctx
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC) return null
  try { ctx = new AC() } catch { ctx = null }
  return ctx
}

async function loadBuffer(c, name) {
  if (buffers.has(name)) return
  try {
    const res = await fetch(SRC(name))
    const arr = await res.arrayBuffer()
    // decodeAudioData works on a suspended context (before the unlock gesture),
    // so buffers can be warmed up on mount and be ready by the first roll.
    const buf = await c.decodeAudioData(arr)
    buffers.set(name, buf)
  } catch { /* leave unloaded; playHit falls back to HTML5 */ }
}

// Warm up the context + decode the hit buffers ahead of the first roll. Called
// on Play Mode mount so the first roll rattles instead of falling back.
export function preloadSound() {
  const c = ensureCtx()
  if (!c || loading) return loading
  loading = Promise.all([...new Set([...HITS, SETTLE])].map((n) => loadBuffer(c, n)))
  return loading
}

function pick() { return HITS[(Math.random() * HITS.length) | 0] }

// Graceful fallback when a buffer isn't decoded yet (or Web Audio is missing).
function htmlPlay(name, volume) {
  try {
    const a = new Audio(SRC(name))
    a.volume = volume
    a.play().catch(() => {})
  } catch { /* ignore */ }
}

function playHit(volume, rate) {
  const name = pick()
  const buf = ctx && buffers.get(name)
  if (!buf) { htmlPlay(name, volume); return }
  try {
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = rate
    const g = ctx.createGain()
    g.gain.value = volume
    src.connect(g).connect(ctx.destination)
    src.start()
  } catch { htmlPlay(name, volume) }
}

const MAX_MS = 2400 // safety: never rattle longer than a roll could take

// Recursive pump — plays a jittered hit, then schedules the next one with an
// interval that lengthens (and a volume that fades) the longer the dice have
// been tumbling, so it sounds like a real roll settling out.
function pump(startedAt) {
  const elapsed = (typeof performance !== 'undefined' ? performance.now() : 0) - startedAt
  if (elapsed >= MAX_MS) { pumpTimer = null; return }
  const t = Math.min(elapsed / MAX_MS, 1) // 0 (throw) → 1 (nearly stopped)
  const volume = 0.5 - 0.34 * t + (Math.random() - 0.5) * 0.08
  const rate = 0.9 + Math.random() * 0.3
  playHit(Math.max(0.12, volume), rate)
  // 45ms dense clatter early → ~230ms sparse bounces late, plus jitter.
  const interval = 45 + 185 * t + Math.random() * 40
  pumpTimer = setTimeout(() => pump(startedAt), interval)
}

// Start the rattle. Call synchronously in the roll tap so it unlocks iOS audio.
export function playRollSound() {
  const c = ensureCtx()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
  preloadSound() // no-op if already warmed; covers a first roll with no mount preload
  stopPump()
  const now = typeof performance !== 'undefined' ? performance.now() : 0
  // Initial throw cluster — two near-simultaneous hits, the dice leaving the hand.
  playHit(0.5, 0.95 + Math.random() * 0.2)
  setTimeout(() => playHit(0.45, 0.95 + Math.random() * 0.2), 55)
  pumpTimer = setTimeout(() => pump(now), 90)
}

function stopPump() {
  if (pumpTimer) { clearTimeout(pumpTimer); pumpTimer = null }
}

// Stop the rattle and play the final settle clack — called at real settle time.
export function playSettleSound() {
  stopPump()
  playHit(0.7, 0.85)
}
