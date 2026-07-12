# Fidelity Notes

This is the permanent audit log for the migration of `Sidherun PHB 2_8_2026.docx` into the `rules/` golden pages. It records every internal contradiction found in the source, every judgment call made during conversion, every image classified, and every source-section-to-chapter mapping. Per the migration's prime directive, none of the contradictions below were resolved — they are preserved verbatim in the prose and flagged here for the game's designer to rule on.

Do not delete entries here when a contradiction is eventually resolved by a rules change; instead, append a note saying how/when it was resolved and in which `rules/VERSION`.

---

## 1. Internal contradictions preserved from the source

### 1.1 Critical-roll definition: "natural 96-100" vs. "roll total over 95"
- **Canonical definition** (`rules/01-dice-rolling.md`, source ~line 160): "**Critical Success:** Any roll resulting in a natural 96-100 (96-00) allows the player to roll again..."
- **Restated identically** (`rules/08-crits-and-fumbles.md`, source line 1449): "A 'critical hit' is determined anytime a player rolls a natural % roll of 96-00."
- **Conflicting statement** (`rules/10-story-points.md`, source line 1796, Story Points worked example): "New total = 127, which allows him to roll again (**as any roll total over a 95 is a crit**)..." — This example computes a crit off a *combined total* (a natural 56 + a Story-Point bonus roll of 71 = 127), not off a *natural* die result. This directly contradicts the "natural 96-100" rule stated twice elsewhere.
- **Status:** Unresolved. Preserved verbatim in both locations. A GM ruling is needed on whether Story Points can produce a "total-based" crit as an exception to the natural-roll rule, or whether the Story Points example is simply mis-worded.

### 1.2 Spell Matrix: does the attribute bonus apply to "red zone" (hardest) cells?
- **Source A — "Define Your Spell Target" spreadsheet image** (provided directly by Ed 2026-07-08, stat-0 render; authoritative for `rules/data/spell-matrix.json`'s `base` grid): its own notes state explicitly: *"If you attempt to target a foe who's spell target is colored red, you do not add your attribute to the target. Ex: ... if the same caster attempted to cast at a level 3, their spell target would be 30, with no modifier."* I.e., red-zone cells get NO attribute bonus.
- **Source B — docx embedded screenshot `image8.png`** (stat-15 render; `displayed_at_stat_15` grid): mathematically equals `min(base + 15, 95)` for **every single cell in the 20x20 grid**, including red-zone ones. Example: row "Your Level 1" / column "Target's Level 3" is base=30 (red, per Source A's own rule, should stay 30), but image8 shows 45 (=30+15, i.e. the attribute WAS added).
- **Status:** Unresolved, flagged per explicit boss instruction. Both grids are preserved in `rules/data/spell-matrix.json` (`base`, `color_zones`, `displayed_at_stat_15`) without picking a side. Needs Ed's ruling on which behavior is correct: (a) never add attribute to red-zone targets, or (b) always add attribute, capped at 95.

### 1.3 Armor durability for rating 8: 160 vs. 180
- **"Typical armor total values" table** (`rules/14-armor.md` and, duplicated, `rules/09-movement.md`; source ~line 2506 / ~1656): for "armor rated 8," typical total (max durability) = **160**.
- **Worked example directly above it** (Oleg's chain mail, `rules/14-armor.md`, source line 2485): armor notation "8/96(180)" — an 8-rated armor with **180** max durability.
- **Status:** Unresolved. Preserved verbatim in both spots (`rules/data/armor-values.json` records both the table value and the worked-example value under `worked_example_contradiction`). Could be two intentionally distinct armors (a generic illustrative example vs. Oleg's specific found item) rather than a true contradiction — but the source does not say so, so it is flagged rather than assumed.

### 1.4 Armor absorption formula notation: "8/60(180)" vs. "8/96(180)"
- The abstract illustration of the armor notation (`rules/14-armor.md`, source ~line 2475) uses "8/60(180)" (60 points of durability remaining) as its example.
- The very next paragraph's worked example (Oleg's chain mail) uses "8/96(180)" (96 points remaining) for what reads as the same armor concept.
- **Status:** Likely just two different illustrative numbers for the same notation pattern (not necessarily a contradiction, since "60" and "96" both fit within a max of "180" and represent different remaining-durability states) — flagged for completeness since the two numbers are close together in the text and could be confused.

### 1.5 Duplicate "armor rated / typical total / shift movement left" table appears in two chapters
- The exact same 3-column, 6-row table appears verbatim (identical header text, identical numbers) in **both** `rules/09-movement.md` ("Notes on Armor's impact on Movement," source ~line 1656) and `rules/14-armor.md` ("Typical armor total values," source ~line 2506).
- **Status:** Not a numeric contradiction (the two copies agree), but flagged as a source-document duplication. Both chapters preserve their own copy per the verbatim-copy mandate; `rules/data/armor-values.json` is the single shared machine-readable source for both.

### 1.6 Level 15 XP typo: "15001" instead of "150001"
- `rules/11-leveling-and-xp.md` (source line 2033): Level 15 "Starting" = **15001**. This breaks numeric contiguity with Level 14's Ending (150000) — every other level's Starting = previous level's Ending + 1, which would put Level 15's Starting at 150001.
- Reproduced verbatim in `rules/11-leveling-and-xp.md` and in `rules/data/xp-table.json` (with an explicit `fidelity_flag` field on that entry).
- **Comparison with existing app data** `src/data/xpTable.json` (not modified by this migration): the app's file already has `xpStart: 150001` for level 15 — i.e., the app silently "corrected" this typo at some point prior to this migration. This is the one substantive numeric difference between the two data sources across all 20 levels.
- Additionally, the app's `src/data/xpTable.json` encodes Level 20's `xpEnd`/`bonus` as `null`/`null`, while the docx literally reads "beyond" / "?" for those cells (a reasonable encoding choice, not a contradiction).
- **Status:** Not resolved in `rules/data/xp-table.json` (kept verbatim per mandate); flagged here for whoever eventually reconciles `src/data/` with `rules/data/` (explicitly out of scope for this migration — see `rules/README.md`).

### 1.7 Two versions of the Difficulty table; the second is not in the document's Table of Contents
- "Example Roll Difficulties" (`rules/01-dice-rolling.md`, source ~line 195): Difficulty + Target columns only.
- "Difficulty Targets" under "Difficulty & Resolution Heuristics" (`rules/06-skills.md`, source ~line 680): identical Difficulty/Target pairs, PLUS a "Narrative Meaning" column.
- The "Difficulty & Resolution Heuristics" section title does not appear anywhere in the document's own Table of Contents (source lines 55-117), even though every other major section does. It reads like a later addition that was never backfilled into the ToC.
- Additionally, in the second table, the "Effortless" row's Target cell is a genuinely **empty** HTML paragraph in the source (not the text "No Roll (GM Discretion)" used in the first table) — reproduced as an empty Markdown table cell in `rules/06-skills.md` rather than silently copying over the first table's wording.
- **Status:** Not reconciled. `rules/data/difficulty-ladder.json` merges the numeric ladder (both tables agree on numbers) and carries the "Narrative Meaning" column, with a note explaining the ToC/duplication issue.

### 1.8 Defender/Defense blank worksheet: row-label mismatch between two source locations
- Inline HTML blank worksheet in "Defender Considerations" (`rules/07-combat-essentials.md`, source ~line 1190): rows are **Typical / Prone / Magic / Psychic / Other**.
- Embedded image `media/image7.png` (a separate blank worksheet found elsewhere in the source, not tied to a specific chapter by proximity): rows are **Typical / Prone / Psychic / Spell / Other** — different row order, and "Magic" is renamed "Spell."
- **Status:** Both are blank templates (no filled-in example data in the source), so there's no numeric contradiction — just an unreconciled naming/ordering inconsistency between two copies of what's meant to be the same worksheet. Flagged in `rules/07-combat-essentials.md` and `rules/data/combat-defense-modifiers.json`.

### 1.9 Missing table referenced in "Magic – The Fickle Mistress"
- Source text (`rules/16-magic-and-spellcasting.md`, ~line 2706): "...this is represented by their Spell Defense, Psychic Defense, or in some cases one of the other Defenses **represented in the table below**." No table follows in the HTML export — only an empty paragraph placeholder. This is presumably a cross-reference to the same blank Defender-Considerations worksheet discussed in 1.8, but the source doesn't explicitly link them.
- **Status:** Gap flagged in `rules/16-magic-and-spellcasting.md`; not reconstructed (no visible embedded image was found in `media/` that matches this specific reference beyond the two worksheets already covered in 1.8).

### 1.10 Toxic/acidic/poison cloud naming drift in the "Taking Damage" example
- `rules/15-damage-death-dying.md` (source ~2613-2626): the same in-fiction hazard is called a "vile, toxic cloud of stench," then "the acidic cloud," then explicitly "the toxic cloud is **not** acidic" (a direct in-text negation of the label used two sentences earlier), and finally, in the accompanying results table, "poison cloud." Reproduced verbatim; not reconciled to a single consistent name.

### 1.11 Garbled/incomplete sentences in Basic Spellcasting
- `rules/16-magic-and-spellcasting.md` (source ~2733): "...(see general rules below the Spell Matrix table" — missing closing parenthesis.
- `rules/16-magic-and-spellcasting.md` (source ~2734): "If so, this modifier is noted in the next" — sentence trails off, missing its object (presumably "...in the next section" or similar).
- `rules/16-magic-and-spellcasting.md` (source ~2744): "Ingrid rolls two ten-sided dice and 53 (SUCCESS!)" — missing a verb before "53" (likely "rolls a 53" or "gets a 53").
- `rules/18-spell-damage-and-healing.md` (source ~2870): "...after fighting a group of which creatures called the Dark Initiates" — garbled phrasing, likely intended "a group of creatures called the Dark Initiates."
- All four reproduced verbatim per the typo-vs-wording distinction in the prime directive (these are more than single-word typos, so not silently corrected).

### 1.12 Damage-multiplier scale: overlapping/inconsistent thresholds
- "Damage Modifier scale" as stated (`rules/07-combat-basics.md` and `rules/07-combat-essentials.md`, source ~lines 1412 and 1027ish, appears twice near-identically): `1-20 = x1`, `16-45 = x1.5`, `46++ = x2` — note ranges 16-20 overlap between the first two tiers.
- The "Simple examples" a few lines later in each copy give a *different* breakdown by margin-over-target (e.g., one copy says roll 70-85 = normal, 86-115 = 1.5x, 116+ = 2x for a target of 70; the other copy of the same passage says 70-90 = normal, 91-115 = 1.5x, 116+ = 2x for the same target of 70). The two "Simple examples" blocks in the two combat chapters do not even agree with each other on the exact breakpoint (85 vs. 90).
- **Status:** Unresolved, preserved verbatim in both `rules/07-combat-basics.md` and `rules/07-combat-essentials.md` exactly as each appeared in its source location (the document contains near-duplicate combat-math passages in two places).

### 1.13 Attack bonus: do the key attribute and the weapon skill stack?
- The Martinuk worked example (`rules/07-combat-essentials.md`) **sums** them: "attack bonus of 78 → 18(AGI)+30(Dual Wield Skill)+20(fighting from above)+10(affinity for orcs)", and both combat chapters' Attacker worksheets list *Ability bonus* and *Skill/Trait/Power bonus* as separate additive columns.
- The app (and the campaign as played since the Grandanto's Folly kickoff) treats them as **non-stacking**: a weapon rolls its weapon-skill value when the character is skilled, otherwise the governing attribute — never both (`weaponModifier()`, app #152; per-weapon GM data rulings, app #203).
- Discovered 2026-07-11 by a rules audit (app #264) — the "they do not stack" sentence the app cites does not appear in the migrated text.
- **Status:** RESOLVED — see §7 (Ed, 2026-07-11): **non-stacking is canonical**.

---

## 2. Image classification

| Image | Classification | Where used |
|---|---|---|
| `image1.png` | Rule data (table) — Constitution Modification Table | `rules/05-hit-points.md`, `rules/data/constitution-modification.json` |
| `image2.png` | Blank worksheet template (no data) — Example Skill Tracker | `rules/06-skills.md` (structure only, no JSON — nothing to transcribe) |
| `image3.png` | Rule data (table) — Skill Pool Allocation by level | `rules/06-skills.md`, `rules/data/skill-pool-allocation.json` |
| `image4.png` | Rule data (table) — Skill Usage Bonus by level | `rules/06-skills.md`, `rules/data/skill-usage-bonus.json` |
| `image5.png` | Rule data (table) — Specialty Pool by level | `rules/06-skills.md`, `rules/data/specialty-pool.json` |
| `image6.png` | Rule data (table) — Movement speed by Agility descriptor | `rules/09-movement.md`, `rules/data/movement.json` |
| `image7.png` | Blank worksheet template (no data) — Defense worksheet, rows Typical/Prone/Psychic/Spell/Other | `rules/07-combat-essentials.md` (flagged for row-label mismatch vs. inline HTML version, see 1.8) — no JSON, no data to transcribe |
| `image8.png` | Rule data (table) — Spell Matrix, displayed at relevant-stat 15 (docx screenshot) | `rules/16-magic-and-spellcasting.md`, `rules/data/spell-matrix.json` (`displayed_at_stat_15`) |
| `image9.jpg` | Decorative art — Southern Shores world map | `rules/20-world-southern-shores.md` (noted, not transcribed — pure cartographic illustration, not a rule table) |
| `spell-matrix-base-stat0-FROM-ED.png` | Rule data (table), authoritative — "Define Your Spell Target" spreadsheet, stat-0 render, supplied directly by Ed 2026-07-08 (not part of the original docx export) | `rules/16-magic-and-spellcasting.md`, `rules/data/spell-matrix.json` (`base`, `color_zones`) |

---

## 3. Spell Matrix spot-check (requested verification)

All values below are read directly from the derived/generated grids in `rules/data/spell-matrix.json` and cross-checked by eye against both source images.

| Check | Expected | Actual | Pass? |
|---|---|---|---|
| `base` row5,col4 (Your Lvl 5 vs Target Lvl 4) | 60 | 60 | Yes |
| `base` row1,col1 (Lvl 1 vs Lvl 1) | 50 | 50 | Yes |
| `base` row1,col3 (Lvl 1 vs Lvl 3), zone=red | 30, red | 30, red | Yes |
| `base` row20,col20 (Lvl 20 vs Lvl 20) | 50 | 50 | Yes |
| `displayed_at_stat_15` row5,col4 (= base+15) | 75 | 75 | Yes |
| `displayed_at_stat_15` row3,col3 (= base+15) | 65 | 65 | Yes |
| Cross-check vs. prose worked example (Ingrid, Lvl 5 caster vs. Lvl 4 target, Enlightenment 15) | 75 | 75 | Yes |

`base` grid formula (derived and verified against every visible cell in the source image): let `d = target's level − your level`. Then `base = 95` if `d ≤ −5`; `90` if `d = −4`; `80` if `d = −3`; `70` if `d = −2`; `60` if `d = −1`; `50` if `d = 0`; `40` if `d = 1`; `30` if `d = 2`; `15` if `d = 3`; `5` if `4 ≤ d ≤ 8`; `1` if `d ≥ 9`.

Color zone (from the stat-0 source image, verified against its own worked notes examples): `green` if `d ≤ −2`; `yellow` if `−1 ≤ d ≤ 1`; `red` if `d ≥ 2`.

`displayed_at_stat_15 = min(base + 15, 95)` — verified exactly against all readable cells of `image8.png`, no exceptions found.

---

## 4. Source-section-to-chapter coverage map

Every top-level section from the source document's own Table of Contents (source lines 55-117), plus the extra sections found in the body that are absent from the ToC, mapped to exactly one output file:

| Source section (ToC or body) | Source lines | Chapter file |
|---|---|---|
| Story Driven | 121-126 | `00-overview.md` |
| Dice Rolling | 127-271 | `01-dice-rolling.md` |
| *(Character Creation — not in ToC, body only)* | 272-298 | `02-character-creation.md` |
| Try not to: | 299-310 | `02-character-creation.md` |
| A good character story: | 311-334 | `02-character-creation.md` |
| *(Archetypes in Sidherun — not in ToC, body only)* | 335-343 | `03-archetypes.md` |
| Archetype Examples: | 344-357 | `flavor/archetype-fiction.md` (linked from `03-archetypes.md`) |
| Attributes in Sidherun | 358-360 | `04-attributes.md` |
| Attribute Definitions: | 361-464 | `04-attributes.md` |
| Social Attributes | 465-487 | `04-attributes.md` |
| Hit Points | 488-579 | `05-hit-points.md` |
| Skills – Displaying your knowledge | 580-667 | `06-skills.md` |
| Impact of Skills | 609-667 | `06-skills.md` |
| *(Difficulty & Resolution Heuristics — not in ToC, body only)* | 668-789 | `06-skills.md` |
| SKILLS Point Allocations | 790-802 | `06-skills.md` |
| Additional Skill Points Available: | 803-813 | `06-skills.md` |
| Specialties – A reminder: | 814-825 | `06-skills.md` |
| Specialties | 826-830 | `06-skills.md` |
| Some notes: (Specialties) | 831-843 | `06-skills.md` |
| Combat as a Skill: | 844-1097 | `07-combat-basics.md` |
| Combat in Sidherun – Essential Rules: | 1098-1126 | `07-combat-essentials.md` |
| Attacker Considerations: | 1127-1176 | `07-combat-essentials.md` |
| Defender Considerations: | 1177-1387 | `07-combat-essentials.md` |
| Other Situational Modifiers | 1388-1444 | `07-combat-essentials.md` |
| Critical Rolls and their Use in Sidherun | 1445-1456 | `08-crits-and-fumbles.md` |
| In Combat: | 1447-1456 | `08-crits-and-fumbles.md` |
| Effects of a crit - Damage - MELEE: | 1457-1495 | `08-crits-and-fumbles.md` |
| ADDITIONAL MODIFIERS - DAMAGE | 1496-1516 | `08-crits-and-fumbles.md` |
| Fumbles - Sometimes things just don't work out | 1517-1520 | `08-crits-and-fumbles.md` |
| Fumble Mechanics: | 1521-1537 | `08-crits-and-fumbles.md` |
| Fumble(s) in Combat: | 1538-1563 | `08-crits-and-fumbles.md` |
| Movement and Time– General Rules | 1564-1567 | `09-movement.md` |
| Combat (movement subsection) | 1568-1596 | `09-movement.md` |
| Flight/Special Move Notes: | 1597-1646 | `09-movement.md` |
| Notes on Armor's impact on Movement | 1647-1766 | `09-movement.md` |
| Story Points – Driving the Narrative forward | 1767-1781 | `10-story-points.md` |
| How to use Story Points: | 1782-1812 | `10-story-points.md` |
| Character Leveling | 1813-2131 | `11-leveling-and-xp.md` |
| Combat Order | 2132-2417 | `12-combat-order.md` |
| Resolving Combat - When is the hill ACTUALLY Taken? | 2418-2430 | `13-resolving-combat.md` |
| Some rules to help | 2431-2432 | `13-resolving-combat.md` |
| Tenacity Check | 2433-2448 | `13-resolving-combat.md` |
| Withdrawing from Combat | 2449-2466 | `13-resolving-combat.md` |
| Armor as an Absorption Factor | 2467-2490 | `14-armor.md` |
| Armor absorbs incoming damage with the following formula: | 2470-2490 | `14-armor.md` |
| Armor values: | 2491-2591 | `14-armor.md` |
| Combat Damage, Death, and Dying in Sidherun | 2592-2602 | `15-damage-death-dying.md` |
| Taking Damage | 2603-2688 | `15-damage-death-dying.md` |
| Magic – Supporting the Narrative and Introducing Wonder | 2689-2693 | `16-magic-and-spellcasting.md` |
| Magic as a plot point | 2694-2701 | `16-magic-and-spellcasting.md` |
| Magic – The Fickle Mistress | 2702-2713 | `16-magic-and-spellcasting.md` |
| Some notes: (Magic) | 2714-2719 | `16-magic-and-spellcasting.md` |
| Spells in Sidherun | 2720-2722 | `16-magic-and-spellcasting.md` |
| Basic Spellcasting in Sidherun | 2723-2749 | `16-magic-and-spellcasting.md` |
| Channeling | 2750-2834 | `17-channeling.md` |
| Damage and Healing by Spellcasting | 2835-2875 | `18-spell-damage-and-healing.md` |
| Mana – The Power Powering Your Power | 2876-2888 | `19-mana.md` |
| Using Mana | 2889-2906 | `19-mana.md` |
| How Much Mana Do I Have? | 2907-2942 | `19-mana.md` |
| Southern Shores – An Overview | 2943-2946 | `20-world-southern-shores.md` |
| The Rohnar, the Southern Shores People, the Inner Sea, and the East-West Highway | 2947-2971 | `20-world-southern-shores.md` |

Front matter (source lines 1-120: HTML head, inline CSS, and the document's own Table of Contents listing) is not reproduced as prose — it is source metadata, not rules content. The document title "Sidherun – Rule Update Feb 8, 2026" (source line 53) is the basis for `rules/VERSION` (`2.8`).

---

## 5. Other judgment calls made during conversion

- **Chapter numbering**: two files were independently produced as "07-combat-*" by two parallel conversion passes (`07-combat-basics.md` for "Combat as a Skill," `07-combat-essentials.md` for "Combat in Sidherun – Essential Rules"). Both are kept as adjacent chapters; downstream chapter numbers were **not** globally renumbered to close the gap, since both source sections are legitimately distinct (one is the general skill-based combat philosophy, the other is the specific Attacker/Defender mechanical breakdown) and renumbering the entire back half of the book for a cosmetic numbering gap risked introducing file-rename churn without benefit. See the Chapter Map in `rules/README.md` for the authoritative reading order.
- **Long archetype fiction** (Acrobat/Barbarian/Conjurer/Druid/Enlightened vignettes) was moved to `rules/flavor/archetype-fiction.md` per the migration brief's allowance for relocating long narrative passages that interrupt rule flow, with a link left in `rules/03-archetypes.md`.
- **Embedded-image tables** (Constitution Modification, Skill Pool Allocation, Skill Usage Bonus, Specialty Pool, Movement-by-Agility, Spell Matrix) were manually transcribed from the source PNGs (there was no OCR or embedded text to extract) and cross-checked cell-by-cell against the rendered images before being written into both the prose chapters and `rules/data/*.json`.
- **Blank worksheets** (Example Skill Tracker, the two Attacker/Defender "adds the following" tables, `image2.png`, `image7.png`) were reproduced as header-only Markdown tables with their column/row structure intact, since there is no data in the source to transcribe — no corresponding JSON file was created for these (nothing to encode).
- Obvious single-word typos (e.g. "inito" → "into") were silently corrected per the prime directive's allowance for typo-level fixes; anything touching wording, numbers, or rule meaning was left as-is even when clearly garbled (see contradictions above, plus minor items like an unclosed parenthetical at source line 1581 and a stray "= 15" duplicated into an example list at source line 524 — both reproduced verbatim).

## §6 Editor-audit fixes (2026-07-08, post-conversion)
An independent fidelity audit (full 22-chapter read, 1,200-cell matrix verification, zero coverage gaps / zero prose drift found) required three fixes, applied by the reviewing agent:
1. Chapter 16: the five rules-notes from the stat-0 spell-matrix sheet added verbatim to prose (previously JSON-only), incl. the red-zone rule and the preserved-contradiction pointer.
2. `data/spell-matrix.json` notes[3]/[4]: relabeled/reworded entries replaced with truly verbatim source text.
3. `data/combat-defense-modifiers.json`: added the Cover modifier table (Line of sight +10 / ≤50% +25 / ≤75% +50 / >75% 50++++) and the Misc row, verified against source prose (present in both prose chapters all along).

## §7 Rulings applied (Ed, 2026-07-09)
- §1.1 **RESOLVED** — Crit definition: **natural 96-00 only**; modified totals never crit. Story-Points example clause superseded (original text preserved in the ruling note, ch10).
- §1.3 **RESOLVED** — Rating-8 armor max durability: **160** (table canonical); ch14 worked-example 180s corrected.
- §1.6 **RESOLVED** — XP Level 15 starting: **150001** (source's 15001 ruled a missing-digit typo); now matches src/data/xpTable.json.
- §1.2 (spell-matrix red-zone attribute rule) — **OPEN, under test**: a math evaluation across all levels/zones at stat 15 is in progress before ruling.
- §1.2 **RESOLVED** (Ed, 2026-07-09) — **Red-zone cells add no attribute**: Spell Target = raw base in red; min(base+attribute, 95) in green/yellow. Ruled after an exhaustive two-agent independent computation at stat 15 (171 affected cells, delta exactly 15 each, monotone under both readings, 25-pt boundary cliff). The docx stat-15 render is superseded on this point. Side-note for a future amendment: the 2-Story-Point "automatic 100" benefit is meaningless for roll-under spellcasting (100 auto-fails) — flagged, not ruled.
- §1.13 **RESOLVED** (Ed, 2026-07-11) — **Attack bonus is non-stacking**: a weapon attack uses the weapon-skill value when the character is skilled with the weapon, otherwise the governing attribute — never both. Situational and misc bonuses (positioning, affinities, buffs, items) still add on top. The Martinuk example's "18(AGI)+30(Dual Wield Skill)" summing is superseded on that point (under this ruling his bonus is 30+20+10 = 60); the Attacker worksheets' *Ability bonus* and *Skill/Trait/Power bonus* columns are alternatives for the weapon roll, not addends. Matches the app (#152) and the per-weapon data rulings (#203); the campaign has been played non-stacking since kickoff. App tracker: #264.
