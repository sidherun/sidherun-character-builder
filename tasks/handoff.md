# Session handoff — start here (written 2026-07-04)

Read this first, then `tasks/todo.md` (shipped log) and `gh issue list` (live tracker).

## Where we are

On `main`, everything deployed and green (168 tests, lint zero-warning, build clean).
Production: https://character-builder.sidherun.com (GitHub Pages auto-deploys on push to `main`).

**Shipped + verified this session:**
- Dice: 3D tumble confined to a bottom tray, auto-clears after settle; sound via HTML5
  `<audio>` (iOS-reliable) with 3 rotating roll recordings. Confirmed on desktop + iPhone.
- Roll banner readability + "Exploding roll!" tag (#155, closed).
- **Inventory→GM live sync (the big one):** structural edits (inventory, skills, name) now
  propagate to a connected GM in real time — they broadcast a payload-less `data` nudge and
  the viewer refetches the fresh row (both sync planes). GM "Open" also refetches fresh.
  Verified live across two tabs. #170 closed. All `[inv-sync]` tracing removed.

## First things to check (2 min)

1. `git branch --show-current` → must be `main`. **This repo is a shared working tree with
   other background jobs** — a job left HEAD on a `fix/…` branch mid-session and a commit
   landed there by accident. Before committing, confirm the branch. Always `git add <paths>`,
   never `git add -A` (you'll sweep another job's files).
2. GitHub Pages deploys are **flaky** — "Deployment failed, try again later" hits ~1 in 3
   even when the build is clean. Fix: `gh run rerun <id>` (whole run, not just `--failed`).
   Retry until green; the artifact is fine.
3. There's a Stop hook: any code edit requires updating `README.md` + filing follow-up
   issues before the turn ends. Budget for it.

## Recommended next work (my ranking, unchanged)

1. **#158 — Roster: confirm-before-Delete (+ hamburger menu).** Data-loss guard. 13
   hand-imported characters, Delete is one un-confirmed tap. Low effort, highest safety ROI.
2. **#154 — GM Screen: filter to the session's characters.** GM workflow for a 13-char
   roster with 4–6 present. Medium effort, high game-day value.
3. **#157 — Spell-check / "did you mean" for player-entered text.** Real bug ("Seamonship").
   Keep it scoped to known skill names + Levenshtein; don't build a full dictionary.

Runner-up: **#169** (exploding rolls animate one die per throw + list each value) — dice code
is fresh, cheap while warm. Delight over utility.

## Open follow-ups (not urgent)
- **#167** — dice sound: compress `roll.wav`→mp3 (~150KB), decide if 🔊 should work with 🎲 off.
- **#161** — vite/vitest/esbuild dev-dep advisories (needs a breaking bump).
- **#162 / #164 / #166** — belong to the *other* workstream (security PR #160, dedup #127/#163,
  usesSkill #142/#165). Leave for that job to close.

## Key architecture notes (so you don't re-learn)
- **Two cloud planes:** guest capability-token (`src/utils/cloudSync.js`) + authed
  (`src/utils/characterRepo.js`). Selected by `repoEnabled()` (logged in → authed).
- **Realtime = Supabase Broadcast, NOT postgres_changes** (RLS blocks postgres_changes on the
  realtime socket for authed browsers). Channel `char:<id>`, `self:false`. `live` events carry
  HP/Mana counters directly; `data` events are payload-less nudges → receiver refetches.
- **Concurrency:** authed structural saves use optimistic `data_rev` (#146); the nudge-refetch
  approach is deliberately refetch-not-payload so it can't clobber a concurrent change.
- **Design tokens:** all color via `var(--token)` from `src/tokens.css`. Never raw hex in a
  component (except `generateCharacterHTML.js`). See CLAUDE.md.
- **Dice sound files** live in `public/sfx/` (committed). `public/dice3d/` is gitignored +
  rebuilt from node_modules at build — don't put committed assets there.

## Gotchas learned this session
- Debugging a realtime fix: **hard-reload both tabs** (Empty Cache and Hard Reload) before
  concluding it's broken. Stale cached JS on GitHub Pages made a working fix look broken (old
  HP-live code kept working and masked that the new build hadn't loaded).
- Can't verify live Supabase cloud headless (no creds / two clients) — cloud realtime changes
  need Ed's two-tab check, same as #146.
- See `tasks/lessons.md` for the fuller list.
