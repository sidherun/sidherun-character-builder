// Singleton controller for the 3D dice engine (@3d-dice/dice-box-threejs),
// lazy-loaded on the first roll so it never weighs down app start. Initialised
// with sounds:false — the engine's built-in audio hangs initialize() and crashes
// mid-roll on iOS (spike finding); we own the sound layer separately (diceSound).
const STAGE_ID = 'sidherun-dice-stage'
let boxPromise = null
let ready = false // true once the engine has loaded and initialised

// Whether a roll can animate right now. A roll made before the engine is ready
// skips the animation instead of waiting on the download/init (#365).
export function diceReady() { return ready }

export function stageId() { return STAGE_ID }

async function getBox() {
  if (!boxPromise) {
    boxPromise = (async () => {
      const { default: DiceBox } = await import('@3d-dice/dice-box-threejs')
      const box = new DiceBox('#' + STAGE_ID, {
        assetPath: '/dice3d/',
        sounds: false,
        theme_surface: 'green-felt',
        theme_colorset: 'white',
        theme_material: 'plastic',
        baseScale: 100,
        gravity_multiplier: 400,
      })
      await box.initialize()
      ready = true
      return box
    })().catch((err) => { boxPromise = null; ready = false; throw err }) // allow a retry after a failed init
  }
  return boxPromise
}

// Warm the engine (import + init) ahead of the first roll so it isn't a dead
// ~1–2s wait. Best-effort; safe to call repeatedly (idempotent). Needs the
// stage element to already be mounted.
export function preloadDice() { getBox().catch(() => {}) }

// The settled dice linger on the full-screen overlay until this fires, so each
// roll shows a clean tumble then clears instead of leaving dice frozen over the
// UI. A new roll cancels a pending clear (the engine clears on its own at the
// start of the next throw).
let clearTimer = null

// Roll the given engine notation; resolves when the dice settle (~3s). Best-effort —
// callers must not wait on it unboundedly: a roll interrupted by the next throw
// never resolves (measured, #365), so PlayMode races it against a short cap.
export async function rollDice(notation) {
  const box = await getBox()
  if (clearTimer) { clearTimeout(clearTimer); clearTimer = null }
  const scheduleClear = () => {
    clearTimer = setTimeout(() => { try { box.clearDice() } catch { /* ignore */ } clearTimer = null }, 1600)
  }
  try {
    return await box.roll(notation)
  } finally {
    scheduleClear()
  }
}
