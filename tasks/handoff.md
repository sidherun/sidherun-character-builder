# Session handoff — start here (updated 2026-07-04, PM)

Read this first, then `tasks/todo.md` (shipped log) and `gh issue list` (live tracker).

## Where we are

On `main`, everything deployed and green (**221 tests**, lint zero-warning, build clean).
Production: https://character-builder.sidherun.com (GitHub Pages auto-deploys on push to `main`).

**Shipped this session (all closed, all browser-verified):**
- **#158** Roster ⋯ menu + named confirm-before-delete.
- **#154** GM Screen "In session" filter (later superseded by tables).
- **#175** Named **tables** — group characters, filter roster/GM screen (many-to-many; membership on the blob, registry GM-side).
- **#178** Editable sheet from empty (every section add/editable, reusing the wizard editors) + Identity editable + **skills point guardrail** (level-aware pool from `utils/skillPoints.js`, warn-not-block, GM-visible over-budget badge on sheet/roster/GM).
- **#134** **Leveling engine** — ⬆ Level Up flow (XP-cued), per-level baseline snapshot, "available points" display.
- **#157** Spell-check "did you mean" for skill/item names (`utils/spellcheck.js`, per-character `_dictionary`).
- **#180** In-Play section editing (✎ opens the real editor in an overlay; Play Mode stays mounted).
- **#176** Cross-device table names (denormalized `_tableNames` on the blob; `deriveRegistry`/`mergeRegistry`).
- **#188** Bug fix: legacy tables were showing a raw UUID as the name → now "Untitled table" placeholder + rename recovery.

## ⚠️ One manual step Ed still owes (from #188)
On the live authed roster, the existing table shows as **"Untitled table"** (its 14 members were assigned pre-#176, so the name isn't on their cloud blobs). **Fix once:** Roster → **Tables** → rename "Untitled table" to the real name → it stamps the name onto all 14 members' blobs and it's recovered everywhere. (Or Back up on a device that still shows the name, then Restore.)

## First things to check (2 min)
1. `git branch --show-current` → must be `main`. **Shared working tree** — other bg jobs may be running. Always `git add <paths>`, never `git add -A`.
2. GitHub Pages deploys are **flaky** — "Deployment failed, try again later" hits ~1 in 3. Fix: `gh run rerun <id>` (whole run). Retry until green; the artifact is fine.
3. Stop hook: any code edit requires updating `README.md` + filing follow-up issues before the turn ends. Budget for it.

## Recommended next work
1. **#185 — Play mode: Enter in inventory notes should commit + open a new item** (bug, quick, live-play ergonomics). Pairs with the existing add-item focus behavior.
2. **#183 — spell-check scope + shared dictionary** (extend to name/notes; campaign-shared dict so homebrew is known across characters — could ride the same GM-side store as tables/#176).
3. **#179 — Admin UI to manage user roles** (Ed explicitly wants this; today it's a manual SQL `update profiles.role`). Ed already created the issue for it.
4. **#169** — exploding rolls animate one die per throw + list each value (dice code is warm). Delight.

Security/dedup workstream (separate): **#162 / #164 / #166 / #127 / #142**. Infra: **#161** (dev-dep advisories, needs breaking bump), **#125** (GoTrue 500). Bigger: **#43** (Squarespace embed).

## Key architecture notes (so you don't re-learn)
- **Two storage planes:** guest (localStorage + Supabase capability-token RPCs, `utils/cloudSync.js`) + authed (Supabase `characters` table, RLS, `utils/characterRepo.js`). `repoEnabled()` selects (logged in → authed). **Only GM-owned synced data is the character blobs** — hence #176 denormalizes table names onto them.
- **Realtime = Supabase Broadcast, NOT postgres_changes** (RLS blocks pg_changes for authed browsers). Channel `char:<id>`, `self:false`. `live` events carry counters; `data` events are payload-less nudges → refetch.
- **Sheet editing (#178):** the manage-mode sheet (`Step9Review`) reaches the **real wizard step editors** via `editSection` (a focused `‹ Done` shell) — do NOT duplicate editors. Play Mode (#180) reuses the same editors in an overlay. Sections unhide when editable so empty ones aren't dead-ends.
- **Skill budget (PHB pp.14-15):** single source of truth `utils/skillPoints.js` (pool 30/50/70…, per-skill cumulative cap 40 by L3). `utils/leveling.js` + `data/xpTable.json` drive Level Up. Combat is pooled with skills in the rulebook but **excluded from the v1 pool** (weapons stored separately) — see #134 scope. Rules saved to memory (`reference_sidherun_leveling_rules.md`).
- **Tables:** membership `tableIds` + names `_tableNames` on the blob; `deriveRegistry(chars)` + `mergeRegistry(local, derived)` in `utils/tables.js`; localStorage `sidherun_tables` + backup file hold the GM-side registry.
- **Design tokens:** all color via `var(--token)` from `src/tokens.css`. Never raw hex in a component (except `generateCharacterHTML.js`). See CLAUDE.md.

## Gotchas learned this session
- **Verify in a real browser, not just tests.** Two bugs this session (createTable returning the wrong shape → `tables.map` crash; the #188 UUID display) were invisible to the static-render tests and only caught by driving the app with the `/browse` skill. Static component tests use `renderToStaticMarkup` (no interaction) — they won't catch stateful/interaction bugs.
- Simulated `blur`/`change` events don't reliably trigger React handlers via raw `dispatchEvent`. Use the browse tool's `fill` + `press Tab` for controlled inputs / on-blur handlers.
- Can't verify live Supabase cloud headless (no creds / two clients) — cloud realtime + authed-plane specifics need Ed's real-device check.
- See `tasks/lessons.md` for the fuller list.
