# Tasks

## Legend
- [ ] not started
- [~] in progress
- [x] done
- [!] blocked

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
