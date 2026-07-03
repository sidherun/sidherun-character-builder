# Plan: 3D dice-roll animation + sound in Play Mode

**Goal:** when a player taps Roll / Attack / (spell) Roll in Play Mode, physical-looking
dice tumble across the screen, settle realistically, and land showing the correct
number — with sound. The result must match what the rules already computed (and what
gets broadcast to the GM feed).

---

## The one principle that shapes everything

**The animation is cosmetic. The result is already decided.** `dice.js` /
`rollActions.js` compute the roll first (and `rollFeed` broadcasts it to the GM
screen). So the dice must be told what to land on and tumble to *that* value — never
let physics decide the outcome. Any library we pick MUST support **predetermined
results**, or the number on screen won't match the rules / the GM's feed.

Everything the animation needs is already in the roll result:
- skills/attacks: `{ rolls: [d100, ...], modifier, total, exploded, isFumble, fumble }`
- spells: `{ roll, target, success, margin }`

So a roll of `rolls:[97,40]` = two percentile throws (97 then the explosion 40); a
fumble `rolls:[3], fumble:43` = the d100=3 plus a second unmodified d100=43. The
animation just replays these predetermined values.

## Dice representation

Sidherun rolls **d100 = two d10s** (a "tens" die 00–90 + a "units" die 0–9), the
standard percentile pair. Map our 1–100 result to the pair: `47 → 40 + 7`;
`100 → 00 + 0` (read as 100); `1 → 00 + 1`. Modifiers are added *after* the dice, so
the dice show the raw d100 and the banner shows `+modifier · total` as today.

---

## Approach — options & recommendation

| Option | What | Realism | Mobile cost | Effort |
|---|---|---|---|---|
| **A. `@3d-dice/dice-box`** (Babylon + Ammo, workers/offscreen) | drop-in 3D physics, predetermined results, d100, themes | ✅ high | ~400KB (lazy-loadable), WebGL | **low–med** (integrate a library) |
| B. Custom three.js + cannon-es/rapier | full control of look/feel | ✅ high | tune-able, still WebGL+physics | high (build physics + snap-to-face) |
| C. 2D canvas/sprite tumble | dice sprites tumble + flip to result | ⚠️ stylised, not physical | light, no WebGL | med |
| D. Pure CSS 3D | cube transforms | ⚠️ d6 look only (bad for d10) | lightest | low but wrong shape |

**Recommend A (`@3d-dice/dice-box`)** — it's purpose-built, gives the realistic
physics + correct-face landing the request asks for, supports d100 and predetermined
results, and its worker/offscreen-canvas design keeps the main thread free. The one
real cost is bundle/mobile, mitigated below. **Gate it behind a Phase-0 spike** to
confirm mobile perf before committing; if a real phone struggles, fall back to a
lighter three.js build (byWulf/threejs-dice) or Option C.

**Mobile-cost mitigations (all in the plan):**
- **Dynamic import** the dice engine — it loads on the *first* roll, not app start, so
  the initial bundle (currently ~172KB gzip, GitHub Pages) is untouched.
- **Respect `prefers-reduced-motion`** and a **Settings → Animations off** toggle:
  skip the 3D, reveal the result instantly (dice engine never even loads).
- Cap the animation at ~1.2s and make it **tap-to-skip**.
- **Broadcast the result to the GM feed immediately** — the GM never waits on a
  player's local animation.

## Sound

`dice-box` renders visuals only — **sound is a separate layer we own.**
- A short **rattle** on roll start + a **clack** on settle (dice-box fires an
  on-complete callback we hook the clack to). Web Audio API for low-latency.
- **Autoplay is fine** — playback is triggered by the Roll button tap (a user
  gesture), which browsers allow.
- Ship 2–3 small **CC0 / royalty-free** dice SFX (`.ogg`+`.mp3` fallback, a few KB
  each) as static assets; preload on first roll.
- **Mute toggle + volume**, persisted to localStorage; separate from the animation
  toggle. Default: sound **on** but one-tap mutable (courtesy for shared spaces).

---

## Integration points (existing code)

- `src/components/steps/PlayMode.jsx` — the three roll handlers already funnel through
  `emitRoll(entry)` (sets the banner + broadcasts). Hook the animation here: on roll,
  kick off the dice animation with the raw `rolls`/`fumble`, play sound, and reveal
  the `RollResult` banner on settle. Broadcast to the feed stays immediate.
- New `src/components/DiceStage.jsx` — a fixed full-screen overlay hosting the dice
  canvas; `dynamic import('@3d-dice/dice-box')` inside it; exposes `roll(spec, onDone)`.
- New `src/utils/diceNotation.js` (pure, unit-testable) — maps a roll result →
  the engine's predetermined-roll spec (e.g. `rolls:[97,40] → "2d100@97,40"`, fumble
  → the d100 + a fumble d100). This is the piece we can test deterministically.
- New `src/hooks/useDiceSound.js` + `src/utils/diceSound.js` — Web Audio playback +
  mute/volume state.
- Settings: a small **Animations / Sound** control (Play Mode header or a settings
  popover) + `prefers-reduced-motion` respect.

---

## Phased build

**Phase 0 — Spike / de-risk (do first, ~1–2 days).** Throwaway branch: integrate
`@3d-dice/dice-box`, roll `1d100@47`, confirm (a) it lands on 47 as two d10s, (b) real
mobile perf (fps, first-load time with dynamic import), (c) the on-complete callback,
(d) theming to something Codex-ish. **Go/no-go** vs. a lighter fallback.

**Phase 1 — Core animation.** `DiceStage` overlay + dynamic import + `diceNotation` for
a single d100. Wire the three PlayMode roll handlers: animate → land on the raw value →
reveal the banner. Reduced-motion / animations-off path skips it. Unit-test
`diceNotation`.

**Phase 2 — Exploding + fumble.** Animate multi-d100 explosions (show the throws that
sum, e.g. 97 then 40) and the fumble die (d100 + the unmodified fumble die). Decide
sequenced (more dramatic) vs. all-at-once (simpler) — recommend all-at-once first,
sequence as polish.

**Phase 3 — Sound.** SFX assets + Web Audio + rattle/clack synced to the animation +
mute/volume setting (persisted). Autoplay via the Roll gesture.

**Phase 4 — Polish.** Codex-matched dice theme/colors; tap-to-skip; mobile tuning;
accessibility (result still announced via the existing `aria-live` banner regardless
of animation); Settings toggles.

**Phase 5 (optional).** Play the animation on the **GM Screen** roll feed too, and/or a
"reduced" 2D fallback for low-end devices.

---

## Risks & watch-items

- **Mobile bundle/perf (biggest).** ~400KB engine + WebGL physics on phones.
  Mitigated by lazy import + reduced-motion skip + tap-to-skip + Phase-0 validation.
- **Determinism.** Must land on the pre-computed number — solved by dice-box
  predetermined results; verify in the spike.
- **Don't block the table.** Keep it short/skippable; broadcast the result to the GM
  immediately so play never waits on an animation.
- **Sound courtesy + licensing.** Mutable, remembered; CC0/royalty-free assets only.
- **Accessibility.** The result must never depend on seeing the animation — the
  existing text banner + `aria-live` stays the source of truth; reduced-motion skips
  cleanly.
- **Third-party dep.** Pin the `dice-box` version; it's actively maintained but it's a
  WebGL/WASM dependency — keep the reduced-motion path as a permanent escape hatch.

## Verification

- Spike: real-phone perf + predetermined-landing confirmation.
- Unit: `diceNotation` mapping (each roll type incl. explode/fumble).
- Live (browser + phone): every roll type lands on the number that matches the banner
  and the GM feed; sound plays and mutes; reduced-motion shows the result instantly;
  tap-to-skip works; acceptable fps on a mid-range phone.

## Rough effort (solo + Claude Code)

Spike ~1–2 days · Phases 1–4 ~1 week total, dominated by mobile tuning, sound, and
polish. Phase 5 optional.
