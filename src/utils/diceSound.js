// Our own dice sound layer. The 3D engine's built-in audio is iOS-fragile (hangs
// init, crashes mid-roll — spike), so we play the sound ourselves.
//
// PRIMARY: real roll recordings in `public/sfx/`, rotated per roll so it doesn't
// sound identical every time (roll.wav = mixed offline from the engine's real
// dice-hit + felt samples; roll-b/roll-c.mp3 = recorded RPG dice rolls). Add more
// files to `ROLL_SRCS` to widen the rotation — they're picked up automatically.
//
// FALLBACK: if the recording can't load, we synthesize a rattle live from the
// individual hit samples (a thinning pump of Web Audio buffer sources, or spaced
// HTML5 <audio> if Web Audio is unavailable) so sound never drops to silence.
//
// The first playRollSound() happens inside the roll tap, which unlocks iOS audio.

// Roll recordings, rotated per roll so it doesn't sound identical every time.
// roll.wav = mixed offline from the engine's real samples; roll-b.mp3 / roll-c.mp3
// = recorded RPG dice rolls (freesound). Add more paths here to widen the rotation.
const ROLL_SRCS = ['/sfx/roll.wav', '/sfx/roll-b.mp3', '/sfx/roll-c.mp3']
const HITS = [
  'dicehit_plastic8', 'dicehit_plastic9', 'dicehit_plastic11',
  'dicehit_plastic13', 'dicehit_plastic14',
]
const SETTLE = 'dicehit_plastic8'
const SRC = (name) => `/dice3d/sounds/dicehit/${name}.mp3`

let ctx = null
const buffers = new Map() // name -> AudioBuffer
const rollBuffers = []    // the roll recordings, once decoded (alternated per roll)
let rollIndex = 0         // rotation cursor across rollBuffers
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

// Decode every roll recording that loads; playRollSound alternates through them.
async function loadRolls(c) {
  const decoded = await Promise.all(ROLL_SRCS.map(async (url) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      return await c.decodeAudioData(await res.arrayBuffer())
    } catch { return null } // missing/undecodable → skip; synth is the fallback
  }))
  rollBuffers.length = 0
  rollBuffers.push(...decoded.filter(Boolean))
}

// Warm up the context + decode buffers ahead of the first roll. Called on Play
// Mode mount so the first roll uses the recording (or the fallback rattle) with
// no dead first-play latency.
export function preloadSound() {
  const c = ensureCtx()
  if (!c || loading) return loading
  loading = Promise.all([
    loadRolls(c),
    ...[...new Set([...HITS, SETTLE])].map((n) => loadBuffer(c, n)),
  ])
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
  const volume = 0.42 - 0.3 * t + (Math.random() - 0.5) * 0.06
  const rate = 0.92 + Math.random() * 0.16
  playHit(Math.max(0.1, volume), rate)
  // Distinct clacks, not a buzz: ~95ms between bounces early (≈10/sec, still
  // reads as individual dice) stretching to ~320ms as they settle, plus jitter
  // so the spacing feels physical rather than metronomic.
  const interval = 95 + 220 * t + Math.random() * 70
  pumpTimer = setTimeout(() => pump(startedAt), interval)
}

// Play the roll sound. Call synchronously in the roll tap so it unlocks iOS audio.
export function playRollSound() {
  const c = ensureCtx()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
  preloadSound() // no-op if already warmed; covers a first roll with no mount preload
  stopPump()
  // Preferred: a roll recording, one shot, alternating through the loaded set.
  if (ctx && rollBuffers.length) {
    try {
      const src = ctx.createBufferSource()
      src.buffer = rollBuffers[rollIndex % rollBuffers.length]
      rollIndex++
      const g = ctx.createGain()
      g.gain.value = 0.9
      src.connect(g).connect(ctx.destination)
      src.start()
      return
    } catch { /* fall through to the synth */ }
  }
  // Fallback: synthesize a thinning rattle from the hit samples. A single crisp
  // throw hit (dice leaving the hand), then the pump takes over.
  const now = typeof performance !== 'undefined' ? performance.now() : 0
  playHit(0.5, 0.95 + Math.random() * 0.16)
  pumpTimer = setTimeout(() => pump(now), 110)
}

function stopPump() {
  if (pumpTimer) { clearTimeout(pumpTimer); pumpTimer = null }
}

// Called at real settle time. The recordings already include their own settle,
// so this only does anything in the synth-fallback path (stop the pump + a clack).
export function playSettleSound() {
  if (rollBuffers.length) return
  stopPump()
  playHit(0.7, 0.85)
}
