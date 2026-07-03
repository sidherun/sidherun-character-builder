// Copy the dice-box-threejs runtime assets (dice textures + collision sounds)
// into public/dice3d so Vite serves/bundles them. Kept out of git (gitignored)
// and reproduced from node_modules at dev/build time — see the predev/prebuild
// scripts in package.json. Runs in CI after `npm ci`.
import { cpSync, existsSync, mkdirSync } from 'node:fs'

const src = 'node_modules/@3d-dice/dice-box-threejs/public'
const dest = 'public/dice3d'

if (!existsSync(src)) {
  console.error(`[copy-dice-assets] source not found: ${src}\nRun "npm install" first.`)
  process.exit(1)
}
mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
console.log(`[copy-dice-assets] copied ${src} → ${dest}`)
