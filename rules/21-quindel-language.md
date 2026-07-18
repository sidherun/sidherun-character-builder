# Quin'dhel Language Primitives

<!-- source: derived from the Sidherun Notion (World Map, Southern Shores — An Overview, Grandanto's Folly session rosters) and the PHB; authored 2026-07-18 -->

**v1.2 (2026-07-18).** This golden page is the canonical copy of the Quin'dhel language reference. The Notion page "Quin'dhel Language Primitives" is a derived mirror, and edits happen here first, via PR like any other rules change.

Reference for generating Elven names in Sidherun. Derived from every attested elven-styled name in the Notion wiki (World Map, Southern Shores, session rosters) and the PHB. This is the go-forward standard: new elven names for places, people, artifacts, and festivals should be built from the tables below.

**Canon change (v1.1, 2026-07-18):** the elf kindreds are renamed. High elves are **Quin'dhel** (retiring *Eledhel*); wild elves are **Gla'mdroi** (retiring *Glamredhel*). Both retired names were Raymond E. Feist coinages; the replacements are native formations, and the rename gives the language a second productive pattern (see §6, demonyms). The rename shipped to app data and the rules chapters in #270.

**Spelling decision:** the roster-attested form is **Quin'dhel** ("Bella D'Antonia — Human/Quin'dhel"). "Quin'Del" and the Southern Shores page's "Quin''tiel" are treated as variant spellings. This doc standardizes on Quin'dhel, Gla'mdroi, and Quin'Tiel.

---

## 1. Attested corpus

Every elven or elven-styled name in canon, including the two retired forms (kept because they still carry phonological evidence):

| Name | Source | What it is |
|---|---|---|
| Quin'dhel | Session 1 & 2 rosters; races.json (#270) | The high elves; Bella D'Antonia's elven heritage |
| Gla'mdroi | races.json (#270) | The wild elves, named for their hold Gla'mDroia |
| Quin'Tiel / Quin'tiel / Quin-Tiel | World Map, PHB, Southern Shores | City that "marks the beginning of the Grove" |
| Quin'meori | World Map | Forested settlement, NE interior |
| Qu'Droia | World Map | The Sylvan Wood, central interior (red-dot marker) |
| Gla'mDroia | World Map | Settlement, western foothills of the Kaelorun Range — now canonically the Gla'mdroi seat |
| Al'l-AmaDroia | World Map | Settlement, eastern foothills of the Kaelorun Range |
| Qaal'el | PHB ("trust Qaal'el's mercy") | A deity, invoked in an example; not in the Deities DB |
| Nol'Hradadra | World Map | Settlement, southern desert edge — flagged, see §9 |
| *Eledhel* (retired) | PHB & races.json until #270 | Former high-elf name; survives as evidence for the roots el + dhel |
| *Glamredhel* (retired) | PHB & races.json until #270 | Former wild-elf name; survives as evidence for glam + dhel |

Adjacent but non-elven naming families, kept distinct on purpose: Dûrakhar dwarven (Karak Vohn, Bryndak, Khelvar, û-circumflex), Rohnar human (King's Town, Starquay, plain compounds), the divine register (Vælloria, Nocthyra, æ-ligature), and the Hul- pair (HulFadar, HulDramar).

## 2. Core morphemes

Status column: **A** = attested directly, **I** = inferred from attested names, **N** = new in this doc.

| Root | Meaning | Status | Evidence |
|---|---|---|---|
| quin | the Grove; living wood, green | A | Quin'Tiel sits at the Grove's edge; Quin'meori is forested; Qu'Droia is the Sylvan Wood |
| dhel | people, kin (by blood-line) | A | Quin'dhel; retired Eledhel/Glamredhel |
| droi(a) | hold, haven, a settled circle; as droi, the folk of a hold | A | Qu'Droia, Gla'mDroia, Al'l-AmaDroia; Gla'mdroi |
| el | light; the divine | A | Qaal'el; retired Eledhel ("high elves of great grace and magical attunement") |
| glam | wild, untamed | A | Gla'mDroia, Gla'mdroi |
| tiel | gate, threshold | I | Quin'Tiel "marks the beginning of the Grove" |
| meori | memory; a remembering-place | I | Quin'meori |
| ama | mother, elder | I | Al'l-AmaDroia |
| al | high, ancient | I | Al'l-AmaDroia |
| qaal | mercy, grace | I | "trust Qaal'el's mercy" |
| sidhe | spirit, the otherworld | I | Sidherun, sidhedroia |
| run | road, way | I | Sidherun (optional gloss: "the spirits' road" — see §7) |

**The two kindred names now describe how each kindred sees itself.** Quin'dhel = "kin of the Grove" — a blood-line term; the high elves define themselves by lineage. Gla'mdroi = "folk of the Wild-Hold" — a dwelling term; the wild elves define themselves by where they live. The map encodes both homelands: Qu'Droia (the Sylvan Wood) is the Quin'dhel heartwood, Gla'mDroia in the Kaelorun foothills is the Gla'mdroi seat.

## 3. Phonology

**Consonants (native inventory):** d, dh (soft th as in *this*), l, m, n, r, s, t, th (as in *thin*), v, w, y, h — plus the signature onset **qu** (pronounced kw). g appears only in the root glam. Absent on purpose: k, kh, z, hard clusters — those read as Dûrakhar.

**Vowels:** a, e, i, o, u. Long vowels written doubled (qaal). Diphthongs are the flavor of the language: **ae, ai, ei, ia, io, oi, eo** (Droia, Tiel, meori, droi).

**Syllable shape:** (C)(C)V(V)(C). Legal onset clusters: dr, gl, thr, sl, qu. Legal codas: l, n, r, s, m, th. Open syllables preferred; never end a name on a stop (no -k, -t, -d endings). A final -oi (Gla'mdroi) is a legal open ending.

**Stress:** first syllable of the head (final) root. Quin'TIEL, Qu'DROI-a, Quin'MEO-ri, Quin'DHEL, Gla'm-DROI.

## 4. Orthography rules

1. **The apostrophe marks an elided linking vowel** at the seam between two roots. Full form Quin-i-Tiel contracts in speech to Quin'Tiel.
2. **Standard join:** full modifier + ' + head. Coin new names in this shape (Quin'Tiel style).
3. **Archaic liaison spellings** exist where a consonant migrated across the seam: Gla'mDroia, Al'l-AmaDroia, and the clipped Qu'Droia. Keep these as-is in canon; do not coin new ones. Gla'mdroi inherits its liaison spelling from Gla'mDroia.
4. **Capitalization:** capitalize the head root in place names (Qu'Droia, Quin'Tiel); lowercase it in people and category terms (Quin'dhel, Gla'mdroi, Quin'meori). The pair Gla'mDroia (place) / Gla'mdroi (people) shows the rule working.
5. **No diacritics.** û belongs to the Dûrakhar, æ to the divine register. An elven name with a circumflex is a canon error.

## 5. Extended root lexicon (new)

Enough vocabulary to name most things. All follow §3 phonotactics.

| Root | Meaning | | Root | Meaning |
|---|---|---|---|---|
| ael | star | | lae | song, speech |
| sil | moon, silver light | | syl | weave; weaving (the Quin'dhel weavers are healers, per the PHB) |
| thal | tree | | ith | deep |
| laen | river, flowing water | | sae | spring, well |
| myr | sea | | wen | wind |
| orin | stone | | nim | white, snow |
| ver | leaf, new growth | | eth | first, eldest |

The language's own name: **Quin'lae** ("grove-song"), the speech shared by both kindreds.

## 6. Name grammar

**Compounds:** modifier first, head last, joined by apostrophe. The modifier possesses or qualifies the head: Quin'Tiel "the Grove's gate", Gla'mDroia "the wild hold".

**Place-name heads:** droia (settlement), tiel (gate/pass/border town), meori (memorial site, shrine, old battlefield), laen (river), myr (bay/coast), thal (forest), sae (spring/oasis); droia doubles for "haven" in the wilderness sense.

**Kindred and demonym terms — two productive patterns:**
- **X'dhel** — "kin of X", a blood-line/lineage term, lowercase head: Quin'dhel.
- **X'droi** — "folk of X'Droia", a demonym formed by dropping the final -a of a hold name: Gla'mDroia → Gla'mdroi. Any settlement ending in Droia yields a demonym this way (dwellers of Al'l-AmaDroia = the Al'l-Amadroi).

**Personal names:** given name = root + suffix. Suffixes (all gender-neutral): **-iel, -ael, -is, -eth, -ai, -wen, -orin**. Formal style adds origin: *Thaleth of Qu'Droia*. Elves of mixed descent keep a human surname (Bella D'Antonia).

## 7. Proposed glosses for existing canon

These are proposals to adopt, offered because they make the map cohere:

| Name | Gloss | Note |
|---|---|---|
| Quin'dhel | Kin of the Grove | The high elves; also what humans loosely call all elves |
| Gla'mdroi | Folk of the Wild-Hold | The wild elves, named for Gla'mDroia |
| Quin'Tiel | Grove-Gate | Matches the Southern Shores text exactly |
| Qu'Droia | Grove-Hold | The Sylvan Wood as the Quin'dhel heartwood |
| Quin'meori | Grove-Memory | A remembering-place; hook: what is remembered there? |
| Gla'mDroia | Wild-Hold | Seat of the Gla'mdroi — explains its frontier position in the foothills |
| Al'l-AmaDroia | Hold of the High Mothers | Suggests a matriarchal elder-seat; its people would be the Al'l-Amadroi |
| Qaal'el | The Merciful Light | Either an elven-only deity or the Quin'lae name for an existing one (Selinthræ fits the domain) |
| Sidherun | The Spirits' Road | Optional deep-lore: the old elven name for the continent, from sidhe + run |

**Collective term:** with Eledhel retired, "Quin'dhel" no longer needs to serve as an umbrella. Proposal: elvenkind as a whole are **the Dhel** (both kindreds, one blood); humans say "elves" or use Quin'dhel loosely. Alternatively both kindreds under **Sidhe'dhel** ("spirit-kin"). Ed to pick.

## 8. Generation recipe

To coin a new elven name:

1. Pick the head from what the thing *is* (droia, tiel, meori, thal, laen...).
2. Pick a modifier root for its distinguishing quality (§2 and §5).
3. Join as Modifier'Head, capitalize the head for places, lowercase for peoples.
4. Check the register table (§9) — if it could pass for dwarven, redo it.

Ready-made examples:

- **Places:** Sil'Droia (moon-hold), Ael'Tiel (star-gate), Thal'meori (tree-memorial), Laen'Droia (river-haven), Nim'Tiel (snow-pass), Myr'Droia (sea-hold), Ith'sae (deepwell), Ver'thal (greenwood)
- **Demonyms:** Sil'droi (folk of Sil'Droia), Laen'droi, Myr'droi — free with every Droia-name
- **People:** Quiniel, Aelis, Silwen, Thaleth, Laenai, Meorin, Sylai, Veriel, Orineth, Ithael, Saewen, Amariel, Elorin, Quinweth
- **Artifacts:** the Syl'orin (weaving-stone), a Qaal'sil (mercy-light, a healer's lamp), the Eth'lae (the First Song)
- **Festivals:** Ael'meori (the Star-Remembering), Ver'eth (First Leaf, spring rite)

## 9. Register contrast — keeping the cultures distinct

| Culture | Signature | Never |
|---|---|---|
| Quin'dhel / Gla'mdroi (elven) | qu-, dh, diphthongs, apostrophe joins, open endings | k/kh, û, æ, heavy codas |
| Dûrakhar (dwarven) | k, kh, v, r clusters, û, blunt stems (Karak, Vosk, Bryndak) | apostrophes, diphthong chains |
| Rohnar (human) | plain common-tongue compounds (King's Town, Starquay) | invented morphemes |
| Divine register | long flowing polysyllables, æ, endings -a/-on/-is (Vælloria, Kaelorun) | apostrophes |
| Hul- family | Hul + stem (HulFadar, HulDramar) — unassigned; candidate for a trader/frontier culture | — |

## 10. Open items

- **Provenance: resolved.** With Eledhel and Glamredhel retired, no load-bearing Feist coinage remains in elven canon. #270 also renamed Stardock → Starquay and Spine of the World → **Kaelorun Range** (formal name; "the Spine" survives as the colloquial). Rillanon survives only as a blank legacy PC page.
- **Rename touch-points: shipped in #270.** `races.json` ids are `quindhel` / `glamdroi`, a `normalizeLegacyRace` transform migrates stored and imported characters (with regression tests), and rules chapters 05/16/18/20 carry the new names, including **the Quin'dhel Deep**. The PHB docx is a generated artifact per `rules/README.md` — it picks up the renames on the next render from these golden pages.
- Bella D'Antonia's roster line reads Human/Quin'dhel — as of v1.1 that means half *high* elf specifically.
- **Nol'Hradadra** breaks elven phonotactics (hr- onset, stacked heavy syllables, desert location). Options: reassign it to another culture, or canonize it as a Quin'lae adaptation of a foreign name. Undecided.
- **Qaal'el** appears once, in a PHB example. Decide whether it stands alone or aliases an existing deity.
- **The double-apostrophe "Quin''tiel"** on the Southern Shores Notion page is worth a one-time cleanup pass.
