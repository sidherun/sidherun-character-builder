# Session handoff — start here (updated 2026-07-12)

Read this first, then **your memory** (`project_sidherun_app_phase`, `sidherun-golden-pages` / Notion), `tasks/todo.md` (shipped log), `tasks/lessons.md`, and `gh issue list` (live tracker).

## Where we are

On `main`, everything deployed and green. Production: https://character-builder.sidherun.com (GitHub Pages auto-deploys on push to `main`; deploys are flaky — rerun until green). Nothing stacked/unmerged.

**Since 2026-07-10 the two headline code tasks landed and the rules got two more rulings:** the Spell-Target engine now **imports `rules/data/spell-matrix.json` directly** (#245 — red-zone cells add no attribute; the old duplicated table is deleted and had drifted), and **casters can cast** (#237 — per-craft Cast buttons, roll-under, roll-feed). The golden pages now carry **five resolved rulings** (FIDELITY-NOTES §7), the newest being **§1.13 attack bonus is NON-STACKING** (Ed, 2026-07-11): weapon skill when skilled, else the governing attribute, never both — misc bonuses still add. Engine, book, and table practice are formally aligned; the Martinuk example is corrected in text with the original preserved in the ruling note.

## ⚠️ Biggest things to internalize

1. **Ongoing campaign, GM control panel first** (unchanged): the app serves Ed and/or Max as co-GMs, in-person AND online players (do NOT park live-sync/dice/roll-feed — `feedback-sidherun-online-scope`).
2. **Mana pricing is deliberately INTERIM** (#258): Play Mode's cast flow deducts a hand-entered per-cast cost, labeled "interim pricing". It stays that way until **Ed's mana ruling** (R1–R7 recommendations exist from the 2026-07-08 review). Do not invent pricing in code — the ruling lands as a `rules/` PR first.
3. **All rules claims must be grounded** (Ed's standing directive, 2026-07-11): anything the app asserts about the rules gets audited against `rules/` and cites its chapter. The onboarding guide (`src/data/onboardingTips.jsx`) is the model — per-card PHB citations, numbers imported from the engine utils. The last audit caught real errors AND a genuine rules contradiction (→ became ruling §1.13), so audits pay.
4. **The roster data is fully clean.** Every import artifact from the paper sheets is resolved (#203/#249 closed): usesSkill flags, duplicate weapon-skill rows (Uri, Marin), misfiled combat entries (Dante, Tarben, Kell). The repo-root `sidherun-roster-2026-06-28.json` backup was hand-patched to match — **keep it in sync if further data rulings land**, or a Restore silently reverts them.
5. **Rulings are PRs against `rules/`, never silent edits**, citing Ed. Idiom: FIDELITY-NOTES §1.x entry (contradiction) + §7 entry (resolution) + `> ✅ **Ruling (Ed, DATE):**` note block at the affected passage; ruled corrections apply to running text with the original preserved verbatim in the note (§1.1/§1.3/§1.13 precedent).

## ⚠️ Ed decisions queued (can't be done from code)

1. **Mana system ruling** — the R1–R7 discussion (effect-magnitude pricing, target-level surcharge, AoE, failure cost, recovery, WIS/nature tradition). Unblocks #258.
2. **#246** — 2-SP auto-100 vs roll-under casts (note: auto-100 auto-FAILS a roll-under cast — flagged in §7); define Tenacity/Will.
3. **#202** — SP max = 3 vs PHB baseline 2 vs permanent loss.
4. **#213** — visual pass on the contrast rebalance **when it's staged** (token changes shift every screen; not a blind auto-merge). Not yet staged.

## Shipped since 2026-07-10 (all merged + deployed + browser-verified)

- **#245 (PR #256)** — zone-aware Spell Target engine importing the golden-pages matrix; killed 186 cells of silent drift in the old `src/data/spellTarget.json` (deleted).
- **#237 (PR #257)** — per-craft **Cast** in Play Mode: `rollCast()` uses each craft's own casting value (Arcane→INT, Awakened→THA), Success/Miss banner, roll-feed broadcast, interim mana field.
- **#253 (PR #254)** — migration `0003_updated_at_trigger.sql`; **Ed ran the SQL, verified live**. Authed saves now bump `updated_at` (fixes stale "Saved" dates AND the newer-wins reconciliation hazard).
- **#249/#203 closed** — roster data rulings applied via capability-token RPCs + Ed's device (Dante); verified by re-fetch.
- **#250** — sheet Skills badge `+N unspent` informational cue.
- **#198 (PR #263)** — Cinzel "S" monogram favicon: true-vector SVG (glyph outline via opentype.js), multi-res ICO, PNG set, apple-touch, webmanifest. Regeneration recipe in the issue close-out.
- **First-character guide (PR #265)** — rules-grounded per-step onboarding cards in the wizard with PHB citations; auto-on for first-time visitors; 💡 Guide toggle. Built by a Sonnet subagent from spec; copy corrected via an Explore-agent rules audit.
- **Ruling §1.13 (PRs #266/#268)** — non-stacking attack bonus canonical; Martinuk example corrected (78→60, same double-damage outcome).
- **Filed:** #252 (cloud push silently reports 'updated' for dead cloud mappings — real bug), #258 (interim mana → ruled model), #264 (→ resolved same day as §1.13).

## Recommended next work — SEQUENCED

1. **#252 — dead-mapping cloud sync bug (do FIRST among code tasks).** `update_character_data`/`patch_live` with an unknown token match 0 rows and return empty WITHOUT error; `syncCharacter` doesn't check, so a stale mapping looks synced forever. Fix in `cloudSync.js`: empty result → drop/mark the map entry; recreate when `allowCreate` (pushRoster counts it as *new*), surface as failed otherwise. Unit-testable with a mocked `supabase.rpc` returning `[]`. Also: there's no UI to unlink a character from cloud (only full delete does it).
2. **Ed's rulings** (mana R1–R7 → #258; #246; #202) — each lands as a small `rules/` PR + app follow-up.
3. **A11y tails:** #214 aria-live announcements · #215 dialog/menu focus-trapping (shared `useModalFocus`) · #211 remainder · #217/#218 tails · #213 contrast rebalance (needs Ed's visual pass — see decisions queued). #216 is mostly done (titles + reduced-motion shipped).
4. **GM live-table batch** (from #219, rough value order): #236 GM damage entry · #239 encounter mode · #238 attribute rolls + difficulty targets · #240 condition chips · **#241 structured weapon damage — now unblocked** (#203's data call resolved; non-stacking ruled §1.13).
5. **Product-fit backlog:** #243 player roll feed (depends on #173 rosterId scoping; #150 channels) · #242 print scopes · #235 ownership view · #199 Notion sync · #207 ban · #210 audit log · #220 invite button (after #125) · #127 stale-slot duplicate.

## First things to check (2 min)

1. `git branch --show-current`. Bg jobs run in worktrees under `.claude/worktrees/`; **always `git fetch origin main` immediately before every `git checkout -b X origin/main`** — remote-tracking refs go stale mid-session as PRs merge (bit us twice on 2026-07-11). Always `git add <paths>`, never `git add -A`.
2. **Pages deploys are flaky** — `gh run rerun <id>` until green.
3. **Stop hook:** code edits require a repo-root `README.md` update **made with the Edit/Write tools** (edits scripted through Bash/python are not detected — learned 2026-07-11), plus follow-up issues and a session-summary issue before the turn ends.
4. **Merge policy: "ship as I go, verified"** — auto-merge + deploy each browser-verified fix; **stack (draft PR)** anything unverifiable headless or touching auth/data-model. **Rules changes (`rules/`) are PRs with Ed's ruling cited — never silent edits.**
5. Squash-merges mean a branch cut from another feature branch will conflict — always branch from fresh `origin/main`.

## Architecture notes

- **Spell targets:** `utils/spellTarget.js` imports `rules/data/spell-matrix.json` (base grid + color zones) — `getSpellTarget` / `getSpellZone` / `getFinalSpellTarget` (red → raw base, no attribute; else min(base+attr, 95)). `src/data/spellTarget.json` no longer exists. Full-grid test walks all 400 cells.
- **Casting:** `rollCast(character, craft, targetLevel)` + `craftTotal(craft)` in `rollActions.js` — per-craft governing value, NOT the sheet-level `magicAttribute` (that's only `rollSpell`, the generic tile). Banner formatting in `rollFormat.js` (spell branch appends `−N mana`).
- **Attack modifier:** `weaponModifier()` = non-stacking skill-OR-attribute via explicit `usesSkill` flag — now formally canonical (ruling §1.13).
- **Onboarding:** `utils/onboarding.js` (localStorage `sidherun_guide`) + `data/onboardingTips.jsx` (step-number-keyed, rules-cited, numbers imported from `skillPoints.js`) + `components/OnboardingTip.jsx`. Tips key on `character.wizardStep` (1–9 fixed numbers; Powers 5 / Magic 6 conditionally hidden but keep their numbers).
- **Two storage planes** (unchanged): guest (localStorage + capability-token RPCs, `utils/cloudSync.js`) + authed (Supabase `characters` + RLS, `utils/characterRepo.js`). When signed in, the roster IS the cloud table — there's no "Push to cloud" button (guest-only, `!useRepo`). `updated_at` now bumps on every write via the 0003 trigger.
- **Data-repair path:** the roster backup's `_gmKey`/`_cloudMap` drive the same RPCs the app uses — but check ownership first (`list_characters(p_gm_key)`); `cloud-<id>` roster ids are rows imported from someone else's link. Fetch-current → assert → patch → re-fetch, and mirror every fix into the backup JSON.
- **Realtime = Supabase Broadcast, NOT postgres_changes.** Channel `char:<id>`, `self:false`; reconcile-on-focus heals drops (and is now trustworthy thanks to the trigger).
- **Skill budget / leveling:** `utils/skillPoints.js` + `utils/leveling.js` + `data/xpTable.json`. Combat excluded from the v1 pool. Sheet badge shows over-budget warning AND under-spend cue.
- **Design tokens:** all color via `var(--token)` from `src/tokens.css`; never raw hex in components (exceptions: `generateCharacterHTML.js`, the static favicon assets).
- **Favicon:** full set in `public/` (vector `favicon.svg` + ico/png/apple-touch/manifest); regeneration recipe attached to #198.

## Gotchas

- **Verify in a real browser, not just tests** — interactive tests (React 19 `act` + `createRoot`; templates: `PlayMode.rollguard.test.jsx`, `PlayMode.spellzone.test.jsx`) cover stateful behavior headless, but drive the built app with `/browse` before shipping UI.
- **`/browse` localStorage clears between daemon restarts** — fastest re-seed: `$B eval` a script that writes `sidherun_char_<id>` + `sidherun_roster` directly (eval paths must be under `/private/tmp` or the worktree), or Roster → Restore with the repo-root backup.
- **Can't verify live Supabase headless** — cloud realtime, auth, authed loading/error states need Ed's real device. The publishable key + URL are extractable from the deployed bundle for token-RPC reads if needed.
- Synchronous JS `.click()` loops read stale React closures — use spaced clicks or interactive tests.
- The wizard's Step 1 (Welcome) has no header — the 💡 Guide toggle only appears on steps 2–9.
- See `tasks/lessons.md` for the fuller list (authed-vs-guest plane advice, token-RPC surgery preconditions, fetch-before-branch).
