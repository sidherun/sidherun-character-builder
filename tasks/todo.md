# Tasks

## Legend
- [ ] not started
- [~] in progress — note which session
- [x] done
- [!] blocked

---

## Session A — Import Pipeline (`feat/import-pipeline`)

- [ ] Define the character photo → JSON extraction workflow (how Ed sends photos, how we parse them)
- [ ] Audit characterSchema.js — confirm all fields needed for a full import are covered
- [ ] Create JSON template / guide for each of the 13 characters
- [ ] Batch-test: import all 13 JSONs, verify no schema errors
- [ ] Validate dulu-breac-import.json loads cleanly end-to-end after magic defense fix

## Session B — GM Mode + Printout (`feat/gm-play-mode`)

- [ ] GM roster view: see all 13 characters at a glance, quick HP/resource adjustments
- [ ] Play mode: add inventory, attributes visible during session
- [ ] Printout: table-ready HTML export (HP, Mana, Defense, Skills, Powers, Weapons)
- [ ] UX/contrast pass on key screens

## Shared / Unassigned

- [ ] Confirm GitHub Actions deploy is green after magic defense commits
- [ ] Close or update accessibility issue #21 (work is done, issue still open)

---

## Shipped

| What | Session | PR/Commit | Date |
|---|---|---|---|
| Accessibility audit + fixes (10 files) | A | 6bc1d37 | 2026-06-12 |
| Roster nav bug (title click → home) | A | — | 2026-06-12 |
| Magic defense formula fix (characterDerived + Step4Combat) | A | 2441db9 | 2026-06-13 |
| dulu-breac-import.json attribute case fixes | A | — | 2026-06-12 |
| README update | A | f5dd789 | 2026-06-13 |
