# Sidherun Rules — Golden Pages

> Everything in this directory is Sidherun game content: **Copyright © 2026 Ed
> Martin, all rights reserved**, with permission for personal at-table use —
> see [`../COPYRIGHT.md`](../COPYRIGHT.md). It is *not* covered by the repo's MIT
> code license.

This directory is the **source of truth** for the Sidherun Player's Handbook (PHB) rules text. It replaces the Word document (`Sidherun PHB 2_8_2026.docx`) as the canonical, version-controlled copy of the rules.

## What "golden pages" means here

- The original `.docx` is now a **generated artifact**, not a source. If anyone needs a Word/PDF copy for printing or sharing outside the repo, it should be *rendered from* these Markdown files, not edited independently and re-imported. Any future edit to the rules happens here first.
- Every chapter file (`00-overview.md` … `20-world-southern-shores.md`) starts with an H1 title and a one-line provenance comment:
  ```
  <!-- source: Sidherun PHB 2_8_2026.docx -->
  ```
  That comment marks content as migrated from the original docx. New rules content written directly in this repo (not migrated from the docx) should omit that comment or replace it with a note about where it originated.
- Long narrative/flavor fiction that isn't a rule (e.g. the archetype flavor-text vignettes) lives under `rules/flavor/` and is linked from the chapter it was pulled out of, so rules chapters stay skimmable.
- `rules/data/*.json` files hold the **machine-readable** version of every rule table found in the PHB (difficulty ladder, XP table, spell matrix, movement, armor, skill-point pools, etc). Prose chapters carry the same numbers as Markdown tables for human readers; the JSON is what code should read from.
- `rules/FIDELITY-NOTES.md` is the permanent record of every place the source document contradicted itself, every judgment call made while splitting/converting it, and every image classified along the way. It is not a changelog — it's a fidelity audit. Do not delete entries from it when the underlying contradiction gets resolved by a future rules change; instead, add a note that it was resolved and in which version.

## This is a faithful copy, not a cleanup

The migration from `.docx` to these files was done under a **verbatim-reproduction mandate**: wording, numbers, and rule meaning were not changed, only reformatted (HTML → Markdown, images → JSON/Markdown tables). Known internal contradictions in the source (e.g. two different definitions of a critical roll, or two different max-durability values for the same armor rating) were preserved on purpose and logged in `FIDELITY-NOTES.md` rather than silently fixed. If you're reading a rule that seems to contradict another rule elsewhere in this repo, check `FIDELITY-NOTES.md` first — it's very likely already a known, flagged issue waiting on a ruling from the game's designer, not a transcription error.

## How to propose a rule change

1. Open a PR against the relevant chapter file(s) under `rules/` (and the matching `rules/data/*.json` file, if the rule has a machine-readable table).
2. State in the PR description: what changes, why, and which `rules/data/*.json` consumers (see below) are affected.
3. If the change resolves a documented contradiction in `FIDELITY-NOTES.md`, update that entry to say how/when it was resolved instead of deleting it.
4. Bump `rules/VERSION` per the versioning convention below if the change is substantive enough to matter to an in-progress campaign (GM's call).
5. Get review from whoever is running the active campaign(s) before merging — these are live rules, not just documentation.

## Consumers of `rules/data/*.json`

These JSON files are meant to be consumed by two things:
- **The prose chapters themselves**, indirectly — when a chapter references a table, it should match the corresponding JSON exactly. If you change one, change the other in the same PR.
- **The character-builder app engine** (this repo's `src/`), eventually. As of this migration, the app has its own `src/data/xpTable.json` which predates this effort and has minor differences from the docx-derived `rules/data/xp-table.json` (see `FIDELITY-NOTES.md`). This migration does **not** touch anything under `src/` — reconciling the app's data files with the golden-pages data files is a separate, deliberate follow-up task, not a side effect of this one.

## Version pinning for adventures

`rules/VERSION` holds the current rules version (currently `2.8`, matching the source docx's "2_8_2026" filename date). When an adventure module, one-shot, or campaign log references a rule, it should pin the rules version it was written against (e.g. "written against rules v2.8") in its own front matter. That way, if a future rules change alters a table or a mechanic, old adventure notes stay interpretable in the context of the rules version they assumed, instead of silently drifting out of sync with the live rules.

## Chapter map

| File | Covers |
|---|---|
| `00-overview.md` | Story Driven (intro philosophy) |
| `01-dice-rolling.md` | Core d100 mechanic, crit/fumble basics, first difficulty table |
| `02-character-creation.md` | Session-0 guidance, character story |
| `03-archetypes.md` | Archetypes intro (fiction moved to `flavor/archetype-fiction.md`) |
| `04-attributes.md` | Core attributes, social attributes |
| `05-hit-points.md` | HP formula, Constitution Modification Table |
| `06-skills.md` | Skills, specialties, skill point allocation, difficulty heuristics |
| `07-combat-basics.md` / `07-combat-essentials.md` | Combat as a skill, attacker/defender considerations |
| `08-crits-and-fumbles.md` | Critical rolls, fumbles |
| `09-movement.md` | Movement/time, agility-based speed, armor movement penalty |
| `10-story-points.md` | Story Points mechanic |
| `11-leveling-and-xp.md` | Character leveling, XP table |
| `12-combat-order.md` | Initiative and turn order |
| `13-resolving-combat.md` | Resolving combat, tenacity, withdrawing |
| `14-armor.md` | Armor absorption, armor values |
| `15-damage-death-dying.md` | Damage order, death and dying |
| `16-magic-and-spellcasting.md` | Magic philosophy, Spell Matrix, basic spellcasting |
| `17-channeling.md` | Channeling mechanics |
| `18-spell-damage-and-healing.md` | Spell damage/healing math |
| `19-mana.md` | Mana resource |
| `20-world-southern-shores.md` | Southern Shores setting lore |

See `FIDELITY-NOTES.md` for the full source-section-to-chapter-file coverage map, and `VERSION` for the current rules version.

## Generating the print handout (PDF)

Deliberately deferred (2026-07-09) while rules changes are still landing — regenerate on demand after any material `rules/` merge. Recipe:

1. **Assemble the book:** concatenate the chapter files in numeric order (`00-overview.md` → `20-world-southern-shores.md`; skip `flavor/` or append it as a closing section). Prepend a cover block: title, `rules/VERSION`, "rulings as of" date (last `FIDELITY-NOTES.md` ruling), and a generated table of contents.
2. **Render the data appendix:** the prose chapters intentionally do NOT inline the big grids. Generate appendix pages from `rules/data/`: the full 20×20 spell matrix **with color zones** (from `spell-matrix.json` — red cells are rules-bearing: no attribute added, per the 2026-07-09 ruling), plus the XP, movement, armor, and difficulty-ladder tables.
3. **Produce the PDF** from the assembled Markdown (e.g. the `/make-pdf` skill or pandoc/typst). One character sheet of a page-break discipline: each chapter starts on a new page.
4. **Retire the source docx** the first time this ships: rename `~/Code/Sidherun/Sidherun PHB 2_8_2026.docx` → `SUPERSEDED-...` (or move to an archive folder) so the dead copy can't be edited by accident.

If regeneration becomes frequent, promote steps 1–3 into `scripts/build-rules-pdf` and wire it to CI on `rules/` changes.
