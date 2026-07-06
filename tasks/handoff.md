# Session handoff — start here (updated 2026-07-05)

Read this first, then **your memory** (`project_sidherun_app_phase` / Notion), `tasks/todo.md` (shipped log), and `gh issue list` (live tracker).

## Where we are

On `main`, everything deployed and green (**239 tests**, lint zero-warning, build clean).
Production: https://character-builder.sidherun.com (GitHub Pages auto-deploys on push to `main`).
Nothing is stacked/unmerged — every PR from the last session is merged and live.

## ⚠️ Biggest thing to internalize: the game PASSED — this is now an ongoing campaign

The kickoff (**Grandanto's Folly**, ~14 players) ran Father's Day weekend 2026 and shipped. We are **no longer racing a deadline** — this is an ongoing, multi-session campaign. The full context is in memory (`project_sidherun_app_phase.md` + the Notion "Sidherun App — Post-Game Improvement Phase" page). Key framing:

- **Direction (decided, from the session-1 retro): the app's job is a GM control panel + reference.** Build for the GM; make the live-table experience trustworthy.
- **It serves BOTH in-person AND online players** (hybrid). The live-sync / multi-device / dice / roll-feed features are intentional (Ed runs online RPGs) — **do NOT park or strip them.** (An earlier read wrongly proposed cutting them; corrected — see `feedback-sidherun-online-scope`.)
- **Dual-GM: the next session is run by Ed and/or Max Chartier.** GM workflows must serve either.
- The same ~14 PCs level up over time → leveling, correctness, and live-table infra are the durable core.

## ⚠️ Manual steps Ed owes (can't be done from code)

1. **#209 — lock down sign-ups (SECURITY).** The app is now invite-only in code (`shouldCreateUser:false`), but the server-side enforcement is a dashboard toggle: **Supabase → Authentication → disable "Allow new users to sign up."** Until that's off, someone hitting the API directly can still self-register (a stranger, `gafos87523@asitrai.com`, did — since removed). To add a new player once off: Supabase → Users → Add user/Invite → they sign in once → set role in **Manage Roles**.
2. **#203 — weapon data spot-check.** 4 real-roster weapons roll off a suspiciously low skill (Claude Marin Pistol/Knife +5, Uri Krupkin Spear +2 / Short Bow +5). GM call: uncheck "Uses skill" in the Combat editor if any should use the attribute. Not a bug — the migration is behavior-preserving.

## Shipped last session (all merged + live)

**Live-table trust (the session-1 blocker — now fixed + two-device validated):**
- **#196** authed sync hardening — flush pending pushes on tab-hide/close, **reconcile-on-focus** self-heal (newest-wins), and a prominent **SyncBanner** on failure/offline. `App.jsx` + `GMScreen.jsx`.
- **#197** mid-play GM editing (the #178/#180 overlays + inline inventory) verified working at a real table.
- **#218** GM `Stat` stepper **hoisted to module scope** — it was defined in render and remounted on every +/-, eating rapid combat clicks. (Don't move it back inside `GMScreen`.)

**Correctness:**
- **#142/#166** explicit `weapon.usesSkill` flag replaces the nonzero-skill heuristic; **printable HTML export now shows the non-stacking modifier** (it was summing attribute+skill → inflated printed attack bonuses). Schema migration infers the flag for legacy weapons.

**Admin / security:**
- **#179** admin-only **Manage Roles** UI (`#admin` route, `pages/AdminRoles.jsx`, `setUserRole`) — no DB migration needed (existing `profiles_admin_all` policy + trigger allow an admin's direct update).
- **#209** invite-only sign-in (`AuthProvider` `shouldCreateUser:false` + `auth/authErrors.js`).

**UX/a11y batch (10 fixes — from the audit #208 + play-test #219):**
- #218 name gate (no "Unnamed" saves), 0-HP "Down" badge, GM loading/error-vs-empty state, double-roll guard (roll buttons disabled until dice settle).
- #217 play-mode 375px overflow fixed + bigger tap targets (quick-adjust chips + GM +/- 40px).
- #211/#218 NotesPanel `aria-hidden` SR blocker removed + Save-needs-title.
- #213 LoginPage raw-hex → token (focus ring already fine — audit note was stale).
- #216 per-route document titles + global `prefers-reduced-motion` guard.

## New capabilities/patterns to know (so you don't re-learn)

- **Interactive component testing now exists.** React 19 `act` + `createRoot` in jsdom. Template: `src/components/steps/PlayMode.rollguard.test.jsx` (mocks the dice engine, clicks buttons, asserts state). **Use this to verify stateful/interaction fixes headless** — it closes the old "static tests miss interaction bugs" gap. Set `globalThis.IS_REACT_ACT_ENVIRONMENT = true`.
- **`hooks/useFocusOnAdd.js`** — shared "add row → focus it → Enter commits+adds next" for inventory/weapons/skills.
- **Invite-only auth** — `shouldCreateUser:false` in `AuthProvider`; `friendlyAuthError` maps the block to an invite-only message.
- **Roles** — `isAdmin`/`isGmOrAdmin` in `auth/useAuth.js`; `#admin` route is admin-gated in `Router.jsx`.
- **Reduced-motion** — 3D dice already auto-off via `diceSettings.animationsOn()`; #216 added a CSS-wide guard in `index.css`.

## Recommended next work

Everything below is tracked; the annotated log is on **#208**. Grouped:
1. **#213 global contrast rebalance** — the ink-ramp/`--bronze`/`.btn-primary` token changes shift every screen in both themes → **needs Ed's visual pass** (before/after matrix + screenshots). Not a blind auto-merge.
2. **#214** aria-live announcements (first roll/save message never announced) · **#215** dialog/menu focus-trapping (a shared `useModalFocus` hook; NotesPanel unhidden but still no trap; LevelUpDialog, section editor, card menu).
3. **#217 tail** (roster ⋯ 30px, skill pips 14px, ≥11px micro-type) · **#218 tail** (note delete-confirm, undo for HP/Mana/SP, magic-link dead-end).
4. **#219 rules/data DECISIONS — need the GM, not code:** Tenacity/Will not in schema; Story-Points model can't represent permanent loss (ties into **#202** set SP max=3); free-text weapon damage isn't parseable; missing flows (spellcasting, bare-attribute rolls, initiative/NPC tracking, offline roll feed).
5. Product-fit: **#199** daily one-way character sync to Ed's Notion DB (Ed lives in Notion), **#202** Story Points max=3 (+migrate), **#207** ban/suspend account, **#210** audit log, **#220** in-app "Invite player" (needs a Supabase edge function).

Housekeeping: ~12 stale **"Session follow-up"** auto-note issues can be bulk-closed. Older backlog: #183, #171, #169, #167, #173, #164, #161, #127, #125, #43.

## First things to check (2 min)
1. `git branch --show-current` → `main`. **Shared working tree** (bg jobs). Always `git add <paths>`, never `git add -A`. Isolate code work in a worktree.
2. **Pages deploys are flaky and got worse** — "Deployment failed, try again later" now hits **~half** the time, sometimes 2–4 attempts. `gh run rerun <id>` and retry until green; the artifact is fine.
3. Stop hook: any code edit requires updating repo-root `README.md` + filing follow-up issues before the turn ends. Budget for it.
4. **Ed set a merge policy for autonomous runs: "ship as I go, verified"** — auto-merge + deploy each browser-verified fix; **stack (draft PR, don't merge)** anything you can't verify headless or that touches auth/data-model.

## Architecture notes (still current)
- **Two storage planes:** guest (localStorage + capability-token RPCs, `utils/cloudSync.js`) + authed (Supabase `characters` table + RLS, `utils/characterRepo.js`). `repoEnabled()` = `authEnabled && supabase` (**does NOT check for a signed-in user** — a known sharp edge; guests on an auth build can't push, #196 audit).
- **Realtime = Supabase Broadcast, NOT postgres_changes.** Channel `char:<id>`, `self:false`. `live` = counters, `data` = payload-less nudge → refetch. Broadcast is best-effort → the #196 reconcile-on-focus heals dropped nudges.
- **Sheet/Play editing:** the manage sheet (`Step9Review`) and Play Mode (#180 overlay) both reach the **real wizard step editors** via `editSection` — do NOT duplicate editors.
- **Skill budget / leveling:** `utils/skillPoints.js` (pool 30/50/70…, cap 40 by L3), `utils/leveling.js` + `data/xpTable.json`. Combat excluded from the v1 pool.
- **Attack modifier:** `weaponModifier()` = non-stacking skill-OR-attribute via the explicit `usesSkill` flag (legacy fallback = nonzero skill).
- **Tables:** `tableIds` + `_tableNames` on the blob; `deriveRegistry`/`mergeRegistry` in `utils/tables.js`.
- **Design tokens:** all color via `var(--token)` from `src/tokens.css`. Never raw hex in a component (except `generateCharacterHTML.js`).

## Gotchas
- **Verify in a real browser, not just tests** — but now you can also write **interactive tests** (see above) for stateful behavior.
- **`/browse` localStorage clears between daemon restarts** — to test the real roster, re-restore from `/private/tmp/roster197.json` (copy of the repo-root `sidherun-roster-2026-06-28.json`, the real 14 characters) via Roster → Restore.
- **Can't verify live Supabase headless** (no creds / two clients) — cloud realtime, auth, and the authed loading/error states need Ed's real-device check.
- Synchronous JS `.click()` loops read the same stale React closure (all clicks compute off the pre-render value) — use spaced `browse click` commands or an interactive test with `act`.
- See `tasks/lessons.md` for the fuller list.
