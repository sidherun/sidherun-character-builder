# Tasks

## Legend
- [ ] not started
- [~] in progress
- [x] done
- [!] blocked

---

## Sheet-First Character Management (#133)

**Goal:** Existing characters open as a scrollable, mobile-first **character sheet**
with a ✎ Edit on each section. Creation stays the guided wizard; Play Mode stays a
separate live tracker. **Identity (name/race/archetype) is read-only on the sheet**
— edited only in the builder. Leveling is a separate effort (#134).

### Two modes
- **Create mode** (new character): today's wizard — StepIndicator + steps + WizardNav. Unchanged.
- **Manage mode** (existing character): the Sheet (no step bar). Tap a section's ✎ → that
  section's existing editor in a focused `‹ Done · [Section]` shell → Done returns to the sheet.

### Build
- [ ] `mode` (create|manage) + `editingSection` state in `App.jsx`
- [ ] Create mode renders the wizard exactly as today
- [ ] Manage + no section → Character Sheet; hide StepIndicator, WizardNav, "not saved yet" banner
- [ ] Manage + section → `STEP_COMPONENTS[N]` in a focused `‹ Done · [Section]` shell (no step bar / Next-Back)
- [ ] Repurpose `Step9Review.jsx` → Character Sheet: stacked section cards (Attributes, Combat,
      Powers*, Magic*, Skills, Resources, Inventory) each with summary + ✎; keep ▶ Play Mode + exports
- [ ] Identity = read-only header on the sheet (no ✎)
- [ ] Inventory = inline add/edit/remove on the sheet (reuse Play Mode's item UI)
- [ ] Section→editor map: Attributes→Step3, Combat→Step4, Powers→Step5*, Magic→Step6*, Skills→Step7, Resources→Step8 (*if hasPowers/hasMagic)
- [ ] `RosterPage` Load → opens manage mode (the sheet), not "Review + step bar"
- [ ] Edits persist via existing continuous autosave (#119); Done just returns to the sheet
- [ ] Mobile-first vertical layout; no horizontal step/tab bar
- [ ] Lint + tests + build green; add a test for mode routing

### Verify
- [ ] New char: wizard → Complete → lands on the sheet (no step bar)
- [ ] Existing char: Roster → sheet → tap Skills ✎ → edit → Done → saved; reload persists
- [ ] Inventory add from the sheet persists
- [ ] Play Mode button → live tracker (separate)
- [ ] Phone: clean vertical sheet, tappable

### Next (separate)
- [ ] Leveling experience — dedicated "Level up" flow on the sheet (#134)

---

## Import Pipeline

- [x] Define the character photo → JSON extraction workflow (Excel/photo → JSON via Claude)
- [x] Audit characterSchema.js — confirm all fields needed for a full import are covered
- [x] claude-marin-import.json created from Claude_Marin_Character_Sheet.xlsx
- [x] evie-cress-import.json created from photo
- [x] Schema fix: import error now surfaces failing field; deep objects defaulted so partial files don't reject
- [x] LZString share URL compression (#32) — 82% smaller, backwards-compat fallback
- [x] #play= route — loads character directly into Play Mode, auto-saves to roster (#33)
- [x] Copy play link button on Roster cards — TinyURL-shortened, fallback to long URL (#33)
- [x] uri-krupkin-import.json — 9 skills, 3 powers, hasPowers:true (power 3 desc TBD; inventory TBD pending player)
- [ ] Remaining 9 character JSONs — waiting on player sheets
- [ ] Batch-validate all JSONs before game day

## GM Mode + Printout

- [x] GM Play Mode — HP/Mana/Story tracking, armor soak, inventory, attributes, use tracking
- [x] Printout — table-ready HTML export, Print all batch
- [x] UX/contrast pass
- [x] Skill Use tracking — 10 circles (#31)
- [x] Armor soak-per-hit fix (#30)
- [x] Load from Roster → step 9 (#27)
- [ ] QR code per character on printed sheet (#34)
- [ ] GM coordination layer — view/edit all characters at a glance (#35)

---

## Phase 0 — Unlock the shared table  → detail in `tasks/phase-0-1-plan.md`

- [ ] 0.1 Provision Supabase + apply `0001_init.sql`; grab URL + anon key
- [ ] 0.2 Add `VITE_SUPABASE_URL`/`ANON_KEY` secrets to deploy.yml + local `.env`; default `VITE_CLOUD_SYNC=on`
- [ ] 0.3 Cloud roster hydrate — wire up unused `list_characters` RPC (cloudSync + GMScreen/Roster)
- [x] 0.4 GMScreen live-subs re-bind on id-set change, not just count (#147, b66c479)
- [x] 0.5 Cloud sync status badge — Live/Saving…/Sync error/Offline; stops silent push failures (#145, 53664c1)
- [x] 0.6 Contain LWW clobber (#146, 184964b) — optimistic data_rev guard + conflict-adopt; 18 repo tests + live two-tab confirm (edits propagate, no clobber).
- [x] 0.7 Two-device edit test — confirmed: same character in two tabs, edits propagate on reload (no lost edits).
- [x] 0.1/0.2 (was: provision + enable cloud) — already done in prod; #144 closed as mis-scoped

## Phase 1 — Tap-to-roll dice, wired to the engine  → detail in `tasks/phase-0-1-plan.md`

- [x] DECIDE: mechanics confirmed — skills + combat roll d100 + additive value, DISPLAY TOTAL only (GM adjudicates verbally, like D&D Beyond); spells roll-UNDER, app resolves pass/fail; non-stacking skill-or-attribute modifier
- [x] 1.1 `src/utils/dice.js` — `rollD100` + `rollTotal` (skills+combat, display total) + `resolveUnder` (spells), injectable rng + test (9 tests)
- [x] 1.2 `src/utils/rollActions.js` — `rollSkill`/`rollAttack` (roll + display total, non-stacking modifier); `rollSpell` (under) + test (11 tests)
- [x] 1.3 PlayMode tap-to-roll — one-tap Roll/Attack on skills & weapons (sticky result banner shows total); spell Roll shows pass/fail; FIXED `:254` summed-modifier bug; `formatRoll` extracted + tested (228 tests total). Live browser QA still pending.
- [x] 1.4 Shared roll log — `session:default` broadcast channel (approach A, single home table; multi-table = backlog #150); GMScreen "Live Rolls" feed. Shipped #148, verified live across two clients.
- [x] 1.5 Trust model documented — act-and-broadcast, ephemeral (no DB), no server-authoritative dice (rollFeed.js + #148)
- [x] 1.6 Tests green (250) + two-browser realtime verify ✓

---

## Shipped

| What | PR/Commit | Date |
|---|---|---|
| Accessibility audit + fixes (10 files) | 6bc1d37 | 2026-06-12 |
| Roster nav bug (title click → home) | — | 2026-06-12 |
| Magic defense formula fix (characterDerived + Step4Combat) | df96734 | 2026-06-13 |
| dulu-breac-import.json attribute case fixes | — | 2026-06-12 |
| README update | f5dd789 | 2026-06-13 |
| evie-cress-import.json | — | 2026-06-13 |
| Schema: import error detail + deep defaults | af314a2 | 2026-06-13 |
| Inventory in Step 9 Review (#29) | bd4bb5d | 2026-06-13 |
| Toast moved to top-right | 208eb61 | 2026-06-13 |
| Sidherun header from Roster → Welcome screen (#28) | 9970ed4 | 2026-06-13 |
| LZString share URL compression (#32) | d49c441 | 2026-06-14 |
| #play= route + Copy play link + auto-save (#33) | d49c441 | 2026-06-14 |
| TinyURL shortening for play links | ac814f7 | 2026-06-14 |
| Skill Use tracking — 10 circles (#31) | 8696926 | 2026-06-14 |
| Armor soak-per-hit fix (#30) | — | 2026-06-14 |
| Load from Roster → step 9 (#27) | d714ff6 | 2026-06-14 |
