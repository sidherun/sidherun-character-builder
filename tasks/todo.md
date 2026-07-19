# Tasks

**▶ New session? Read `tasks/handoff.md` first.**

**Live tracker = GitHub issues** (`gh issue list`). This file is now just the
shipped-history log; open/planned work lives in issues, not here.

**Append-only:** each PR adds its own row to the shipped table, in that same PR.
Never rewrite or reorganize this file — session working notes belong in the PR
or issue (see `AGENTS.md` § Multi-agent coordination).

## Legend
- [ ] not started · [~] in progress · [x] done · [!] blocked

---

## Shipped

| What | PR/Commit | Date |
|---|---|---|
| Accessibility audit + fixes (10 files) | 6bc1d37 | 2026-06-12 |
| Roster nav bug (title click → home) | — | 2026-06-12 |
| Magic defense formula fix (characterDerived + Step4Combat) | df96734 | 2026-06-13 |
| Schema: import error detail + deep defaults | af314a2 | 2026-06-13 |
| Inventory in Step 9 Review (#29) | bd4bb5d | 2026-06-13 |
| LZString share URL compression (#32) | d49c441 | 2026-06-14 |
| #play= route + Copy play link + auto-save (#33) | d49c441 | 2026-06-14 |
| Skill Use tracking — 10 circles (#31) | 8696926 | 2026-06-14 |
| Armor soak-per-hit fix (#30) | — | 2026-06-14 |
| Load from Roster → step 9 (#27) | d714ff6 | 2026-06-14 |
| GMScreen live-subs re-bind on id-set change (#147) | b66c479 | — |
| Cloud sync status badge — Live/Saving/Error/Offline (#145) | 53664c1 | — |
| Optimistic concurrency guard — data_rev conflict-adopt (#146) | 184964b | — |
| Tap-to-roll dice — skills/combat/spells (Phase 1) | — | — |
| Shared roll feed — session:default broadcast (#148) | — | — |
| Non-stacking weapon modifier (#152) | — | — |
| Exploding (>95) + fumble (1-5) rolls | — | — |
| Inventory-field focus on add (#153) | — | — |
| Mobile sheet overflow fix (#138) | — | — |
| 3D dice-roll animation + sound in Play Mode (#156) | — | 2026-07-03 |
| Roll-banner readability + player-facing tag, no "exploded" jargon (#155) | — | 2026-07-03 |
| Roster ⋯ menu + named confirm-before-delete (#158) | d2512dd | 2026-07-04 |
| GM Screen: "In session" filter + roll-feed scope (#154) | 0fefe99 | 2026-07-04 |
| Named tables — group + filter roster/GM (#175, supersedes #154) | 10e3652 | 2026-07-04 |
| Editable sheet from empty + skill-points guardrail/badges (#178) | 3b11ad9 | 2026-07-04 |
| Leveling engine — Level Up flow + per-level baseline guardrail (#134) | 9a0b4bb | 2026-07-04 |
| Spell-check "did you mean" for skill/item names (#157) | cdbd855 | 2026-07-04 |
| In-Play section editing (weapons/skills/powers/crafts overlay) (#180) | a56378b | 2026-07-04 |
| Cross-device table names — derive registry from blobs (#176) | b1af04f | 2026-07-04 |
| Fix: table registry showed raw UUID for pre-#176 members (#188) | 2f258b9 | 2026-07-04 |
| Enter in inventory notes commits + opens next item focused (#185) | 01452fc | 2026-07-04 |
| Enter-to-next-row extended to weapons + skills; shared useFocusOnAdd hook (#189) | 095bdf4 | 2026-07-04 |
| Authed sync hardening — flush + reconcile-on-focus + SyncBanner (#196) | ba6680f | 2026-07-04 |
| Explicit weapon.usesSkill flag + non-stacking printout fix (#142/#166) | 21c0edc | 2026-07-04 |
| Admin-only Manage Roles UI — no SQL (#179) | 58a8988 | 2026-07-04 |
| Invite-only sign-in — stop open sign-ups (#209) | 42816e7 | 2026-07-04 |
| Verified mid-play GM editing at a real table (#197) | — | 2026-07-04 |
| GM stat remount that ate rapid combat clicks (#218) | bb97de6 | 2026-07-05 |
| Play-mode 375px overflow + bigger tap targets (#217) | f237021, b4bf179 | 2026-07-05 |
| Wizard name gate — no "Unnamed" saves (#218) | 44a290b | 2026-07-05 |
| 0-HP "Down" indicator (#218) | b0e3c11 | 2026-07-05 |
| GM loading/error vs empty state (#218) | ece544e | 2026-07-05 |
| NotesPanel a11y — unhide dialog + Save needs title (#211/#218) | c425a5e | 2026-07-05 |
| Double-roll guard (verified via interactive test) (#218/#222) | cbcf659 | 2026-07-05 |
| Per-route titles + reduced-motion guard (#216) | d808d68 | 2026-07-05 |
| LoginPage raw-hex → token (#213) | f73fd88 | 2026-07-05 |
| Data rulings applied to live roster (#203/#249): usesSkill×4, Uri/Marin duplicate skill rows, Dante/Tarben/Kell combat-plane moves | — (data via token RPCs + backup JSON) | 2026-07-10/11 |
| Sheet skills badge '+N unspent' informational cue | #250 | 2026-07-10 |
| Migration 0003 — updated_at trigger on characters (authed saves bumped; fixes stale Saved dates + newer-wins hazard) (#253) | #254 | 2026-07-11 |
| Spell-Target engine red-zone alignment — imports rules/data/spell-matrix.json, zone-aware UI, full-grid test (#245) | — | 2026-07-11 |
| Play Mode spell casting flow — per-craft Cast (zone-aware, craft's own value), interim mana cost, banner+feed (#237) | — | 2026-07-11 |
| Sidherun favicon — Cinzel S monogram, vector SVG + ico/png set + manifest (#198) | — | 2026-07-11 |
| First-character guide — rules-grounded per-step onboarding cards + 💡 toggle (built by sonnet agent, rules-audited) | — | 2026-07-11 |
| Security fixes — GM key entropy, dep CVEs, HTML escape completeness (#160) | 30afb62 | 2026-07-18 |
| Dedup-safe authed save against stale localStorage 'current' slot (#127/#163) | 09c15e1 | 2026-07-18 |
| Cloud push dead-mapping detection + recovery — no false 'updated' on rotated/deleted tokens (#252) | fae44c5 (#282) | 2026-07-18 |
