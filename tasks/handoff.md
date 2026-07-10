# Session handoff — start here (updated 2026-07-10)

Read this first, then **your memory** (`project_sidherun_app_phase`, `sidherun-golden-pages` / Notion), `tasks/todo.md` (shipped log), and `gh issue list` (live tracker).

## Where we are

On `main`, everything deployed and green. Production: https://character-builder.sidherun.com (GitHub Pages auto-deploys on push to `main`). Nothing stacked/unmerged.

**New since 2026-07-05 — the rules got a home:** `rules/` is now the **canonical Sidherun ruleset** ("golden pages", PR #244): 22 Markdown chapters + 10 machine-readable tables in `rules/data/` (incl. the full 20×20 spell matrix **with color zones**), `VERSION` 2.8, and `FIDELITY-NOTES.md`. The Word doc and the Notion "Full Rules" page are **derived artifacts** — rule changes are PRs against `rules/`, and adventure prep quotes rules **by link, never restated**.

## ⚠️ Biggest things to internalize

1. **Ongoing campaign, GM control panel first** (unchanged): the app serves Ed and/or Max as co-GMs, in-person AND online players (do NOT park live-sync/dice/roll-feed — `feedback-sidherun-online-scope`). Leveling, dice/combat correctness, and live-table infra are the durable core.
2. **Four rules RULINGS landed 2026-07-09** (all in `rules/FIDELITY-NOTES.md` §7):
   - Crit = **natural 96-00 only** (a modified total never crits)
   - Rating-8 armor max durability = **160**
   - XP Level 15 starting = **150001** (golden pages now agree with `src/data/xpTable.json`)
   - **Red-zone spell-matrix cells add NO attribute** — raw base is the Spell Target; green/yellow = `min(base+attr, 95)`. Verified by exhaustive 2-agent computation (171 cells affected, −15 each at stat 15).
3. **The engine does not implement the red-zone ruling yet** → that's **#245**, the first code task (see below).

## ⚠️ Manual steps Ed owes (can't be done from code)

1. **#209 — Supabase dashboard: disable "Allow new users to sign up"** (server-side enforcement of invite-only). If already done, close the note.
2. **#203 — weapon data spot-check** (4 real-roster weapons roll off a suspiciously low skill — GM call per weapon).
3. **#205 — verify Manage Roles end-to-end on live Supabase** (5-step checklist in the issue).
4. **#213 — visual pass on the contrast rebalance** when it's staged (token changes shift every screen; not a blind auto-merge).

## Shipped since 2026-07-05

- **PR #244 — golden pages migration** (faithful-copy mandate; contradictions preserved → then ruled). Includes `rules/data/spell-matrix.json`: `base` grid (authoritative, from Ed's stat-0 spreadsheet image), `displayed_at_stat_15` (superseded docx render), per-cell `color_zones`, and the five rules-notes from the source sheet.
- **Rulings commit + red-zone ruling** (see above) — chapter 16, README, and data files all carry provenance notes.
- **PR #247 — PDF handout build recipe** in `rules/README.md` §"Generating the print handout" — **deliberately deferred** until rules stabilize; executable cold from the README (chapter order, cover/VERSION stamp, data appendix incl. the matrix from JSON, `/make-pdf`, docx retirement).
- **Notion "Full Rules" page repointed** at the repo; embedded docx marked reference-only.
- **Issue-base restructure (2026-07-05):** 13 stale "Session follow-up" records closed; conflicts cross-linked (#127 re-scoped to the cloud-first-load root fix; #125↔#220 sequenced); six missing trackers filed from the #219 play-test: **#236** GM damage entry, **#237** spell-cast flow, **#238** attribute rolls + GM difficulty targets, **#239** encounter mode (initiative + NPC rows), **#240** condition chips, **#241** structured weapon damage.
- **New specs:** #242 print scopes (one/all/table), #243 player-visible table roll feed (with design research from 8 comparable products), #235 Manage-Roles ownership view, #246 rules clarifications (2-SP auto-100 vs roll-under casts; define Tenacity/Will).

## Recommended next work — SEQUENCED (Ed confirmed the order 2026-07-09)

1. **#245 — engine red-zone alignment (bug, do FIRST).** Sheet Spell-Target table + Play-Mode lookup tile must go zone-aware (`red → base`, no attribute). Import from `rules/data/spell-matrix.json` rather than duplicating values — the golden-pages goal is that engine and book physically can't drift. Full-grid test required (acceptance numbers in the issue).
2. **#237 — spell casting flow, AFTER #245**, on the same zone-aware computation. ⚠ Its **mana pricing is blocked on Ed's mana ruling** — build the roll flow; leave mana deduction behind a clearly-marked interim (prompt or manual) until the ruling lands.
3. **Ed discussions queued after #245/#237 land** (do not pre-empt in code): the **mana system** (recommendations R1–R7 exist from the 2026-07-08 review — merge of effect-magnitude pricing with target-level surcharge, AoE, failure cost, recovery, WIS/nature tradition) and **#246** (2-SP auto-100; Tenacity/Will). Each ruling then lands as a small PR against `rules/` (+ schema/app follow-ups if a new stat is born). Related open decision: **#202** SP max=3 vs PHB baseline 2 vs permanent loss.
4. **A11y/UX tails:** #214 aria-live announcements · #215 dialog/menu focus-trapping (shared `useModalFocus`) · #217 tail (roster ⋯ 30px, skill pips, micro-type) · #218 tail (note delete-confirm, HP/Mana/SP undo, magic-link dead-end) · #213 contrast rebalance (needs Ed's visual pass — see manual steps).
5. **GM live-table batch** (from #219, in rough value order): #236 GM damage entry · #239 encounter mode · #238 attribute rolls + difficulty targets · #240 condition chips · #241 structured weapon damage (blocked-ish on #203's data call).
6. **Product-fit backlog:** #243 player roll feed (depends on #173 rosterId scoping; #150 channels) · #242 print scopes · #199 Notion character sync · #207 ban · #210 audit log · #220 invite button (after #125) · #235 ownership view.

## First things to check (2 min)

1. `git branch --show-current` → `main`. **Shared working tree** (bg jobs run in worktrees under `.claude/worktrees/`). Always `git add <paths>`, never `git add -A`.
2. **Pages deploys are flaky** — "Deployment failed, try again later" ~half the time; `gh run rerun <id>` until green.
3. Stop hook: code edits require a repo-root `README.md` update + follow-up issues before the turn ends. (Now correctly scoped to git-tracked files only — scratch/tmp writes no longer trigger it.)
4. **Merge policy for autonomous runs: "ship as I go, verified"** — auto-merge + deploy each browser-verified fix; **stack (draft PR)** anything unverifiable headless or touching auth/data-model. **Rules changes (`rules/`) are PRs with Ed's ruling cited — never silent edits.**

## Architecture notes (still current)

- **Two storage planes:** guest (localStorage + capability-token RPCs, `utils/cloudSync.js`) + authed (Supabase `characters` + RLS, `utils/characterRepo.js`). `repoEnabled()` does NOT check for a signed-in user (sharp edge, #196 audit).
- **Realtime = Supabase Broadcast, NOT postgres_changes.** Channel `char:<id>`, `self:false`; `live` counters + payload-less `data` nudge → refetch; reconcile-on-focus heals drops.
- **Sheet/Play editing:** manage sheet (`Step9Review`) and Play Mode overlay both reach the real wizard step editors via `editSection` — do NOT duplicate editors.
- **Skill budget / leveling:** `utils/skillPoints.js` + `utils/leveling.js` + `data/xpTable.json`. Combat excluded from the v1 pool.
- **Attack modifier:** `weaponModifier()` = non-stacking skill-OR-attribute via explicit `usesSkill` flag.
- **Tables:** `tableIds` + `_tableNames`; `deriveRegistry`/`mergeRegistry` in `utils/tables.js`.
- **Design tokens:** all color via `var(--token)` from `src/tokens.css`; never raw hex in components (except `generateCharacterHTML.js`).
- **NEW — rules data:** `rules/data/*.json` is the canonical source for game tables. When touching spell targets, XP, movement, armor, or the difficulty ladder, consume/reconcile with `rules/data/` (goal state: `src/` imports it). `rules/VERSION` pinning: adventures record the rules version they were written against.

## Gotchas

- **Verify in a real browser, not just tests** — interactive tests (React 19 `act` + `createRoot`, template `PlayMode.rollguard.test.jsx`) cover stateful behavior headless.
- **`/browse` localStorage clears between daemon restarts** — re-restore the real 14-character roster from repo-root `sidherun-roster-2026-06-28.json` via Roster → Restore.
- **Can't verify live Supabase headless** — cloud realtime, auth, authed loading/error states need Ed's real device.
- Synchronous JS `.click()` loops read stale React closures — use spaced clicks or interactive tests.
- See `tasks/lessons.md` for the fuller list.
