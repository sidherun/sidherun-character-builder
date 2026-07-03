// Our own dice sound layer. The 3D engine's built-in audio is iOS-fragile (hangs
// init, crashes mid-roll — spike), so we play the clacks ourselves with plain
// HTML5 Audio. The first play happens inside the roll tap (a user gesture), which
// unlocks audio on iOS; later plays then work.
const HITS = [
  'dicehit_plastic8', 'dicehit_plastic9', 'dicehit_plastic13',
  'dicehit_coin1', 'dicehit_coin3',
]

function play(name, volume) {
  try {
    const a = new Audio(`/dice3d/sounds/dicehit/${name}.mp3`)
    a.volume = volume
    a.play().catch(() => { /* blocked until a gesture; harmless */ })
  } catch { /* ignore */ }
}

function pick() { return HITS[Math.floor(Math.random() * HITS.length)] }

// A few quick hits to suggest the tumble — call synchronously in the roll tap so
// the first one unlocks iOS audio.
export function playRollSound() {
  play(pick(), 0.5)
  setTimeout(() => play(pick(), 0.45), 190)
  setTimeout(() => play(pick(), 0.5), 430)
}

// The final settle clack.
export function playSettleSound() {
  play('dicehit_plastic8', 0.7)
}
