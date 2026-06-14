# Tasks

## Legend
- [ ] not started
- [~] in progress — note which session
- [x] done
- [!] blocked

---

## Session A — Import Pipeline (`feat/import-pipeline`)

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
- [ ] QR codes on printed character sheets (#34) — Session B print scope

## Session B — GM Mode + Printout (`feat/gm-play-mode`)

- [x] GM Play Mode — HP/Mana/Story tracking, armor soak, inventory, attributes, use tracking
- [x] Printout — table-ready HTML export, Print all batch
- [x] UX/contrast pass
- [ ] QR code per character on printed sheet (#34)
- [ ] GM coordination layer — view/edit all characters at a glance (#35)

## Shared / Unassigned

- [x] Confirm GitHub Actions deploy is green after magic defense commits
- [x] Close accessibility issue #21 (closed 2026-06-13)

---

## Shipped

| What | Session | PR/Commit | Date |
|---|---|---|---|
| Accessibility audit + fixes (10 files) | A | 6bc1d37 | 2026-06-12 |
| Roster nav bug (title click → home) | A | — | 2026-06-12 |
| Magic defense formula fix (characterDerived + Step4Combat) | A | df96734 | 2026-06-13 |
| dulu-breac-import.json attribute case fixes | A | — | 2026-06-12 |
| README update | A | f5dd789 | 2026-06-13 |
| evie-cress-import.json | A | — | 2026-06-13 |
| Schema: import error detail + deep defaults | A | af314a2 | 2026-06-13 |
| Inventory in Step 9 Review (#29) | A | bd4bb5d | 2026-06-13 |
| Toast moved to top-right | A | 208eb61 | 2026-06-13 |
| Sidherun header from Roster → Welcome screen (#28) | A | 9970ed4 | 2026-06-13 |
| LZString share URL compression (#32) | A | d49c441 | 2026-06-14 |
| #play= route + Copy play link + auto-save (#33) | A | d49c441 | 2026-06-14 |
| TinyURL shortening for play links | A | ac814f7 | 2026-06-14 |
| Skill Use tracking — 10 circles (#31) | B | 8696926 | 2026-06-14 |
| Armor soak-per-hit fix (#30) | B | — | 2026-06-14 |
| Load from Roster → step 9 (#27) | B | d714ff6 | 2026-06-14 |
