# Quin'dhel Language Primitives

<!-- source: derived from the Sidherun Notion (World Map, Southern Shores — An Overview, Grandanto's Folly session rosters) and the PHB; authored 2026-07-18 -->

**v1.4 (2026-07-18).** This file (`languages/quindel.md`) is the canonical copy of the Quin'dhel language reference; it moved here from `rules/21-quindel-language.md` when the `languages/` directory was created. The Notion page "Quin'dhel Language Primitives" is a derived mirror, and edits happen here first, via PR like any other canon change.

**Canon decisions (v1.4, 2026-07-18):** the §7 glosses are adopted as canon (including Sidherun = "the Spirits' Road"); elvenkind collectively are the **Sidhe'dhel**; Qaal'el is the Quin'lae name for Selinthræ; Nol'Hradadra is reassigned to the Hul (§9, §10).

**v2.0 (2026-07-18).** Sentence grammar added (§11–§12) after stress-testing the primitives against the World Story "The Equinox of Breath": **VSO word order confirmed**, pronouns/tenses/particles defined, ~45 roots added, and the first full Quin'lae text lives at [`texts/tem-wen.md`](texts/tem-wen.md). **Ver'ama** (Vælloria) and **Mor'el** (Morvathun) are canon Quin'lae divine names.

**v2.1 (2026-07-18).** The four grammar gaps from the Tem'wen test are closed: base-12 numerals (a dozen is a *sil*, "a moon"), object pronouns (fused an- forms), comparatives (-ar / eth' / ol), and subordinate clauses plus the qu- question set. Tem'wen stanzas 7 and 20 updated to use the new object forms.

**v2.2 (2026-07-18).** Register ruling (Ed): Quin'lae has two registers — **Eth'vor** ("first-speech", the formal voice of Tem'wen) and **Din'vor** ("day-speech", everyday talk) — and the kindreds diverge in Din'vor: Quin'dhel speech stays near the formal register, Gla'mdroi speech clips particles and runs words together at the seams. Details at the end of §11. In ceremony the Sidhe'dhel remain one voice.

**v2.3 (2026-07-18).** Second text: [`texts/malgrath-threl.md`](texts/malgrath-threl.md) — **Malgrath'threl**, "The Scar Malgrath Carries" — stress-testing the v2.1 numerals and the loan conventions. **Ith'ver** (Roughnira, "the Deep Green") and **Seth'wen** (Serakhala, "the Still Wind") are canon Quin'lae divine names; foreign proper names stay unadapted in Quin'lae text, and *khel* "iron" enters as the language's one k-bearing word, a marked Dûrakhar loan.

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
| Nol'Hradadra | World Map | Settlement, southern desert edge — a Hul name imitating elven orthography, not Quin'lae (see §9) |
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
| sidhe | spirit, the otherworld | I | Sidherun, sidhedroia, Sidhe'dhel |
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

**Collective:** both kindreds together are the **Sidhe'dhel** ("spirit-kin"), the formal umbrella term. Humans say "elves" or use Quin'dhel loosely.

**Personal names:** given name = root + suffix. Suffixes (all gender-neutral): **-iel, -ael, -is, -eth, -ai, -wen, -orin**. Formal style adds origin: *Thaleth of Qu'Droia*. Elves of mixed descent keep a human surname (Bella D'Antonia).

## 7. Canonical glosses

Adopted as canon 2026-07-18:

| Name | Gloss | Note |
|---|---|---|
| Quin'dhel | Kin of the Grove | The high elves; also what humans loosely call all elves |
| Gla'mdroi | Folk of the Wild-Hold | The wild elves, named for Gla'mDroia |
| Quin'Tiel | Grove-Gate | Matches the Southern Shores text exactly |
| Qu'Droia | Grove-Hold | The Sylvan Wood as the Quin'dhel heartwood |
| Quin'meori | Grove-Memory | A remembering-place; hook: what is remembered there? |
| Gla'mDroia | Wild-Hold | Seat of the Gla'mdroi — explains its frontier position in the foothills |
| Al'l-AmaDroia | Hold of the High Mothers | Suggests a matriarchal elder-seat; its people would be the Al'l-Amadroi |
| Qaal'el | The Merciful Light | The Quin'lae name for Selinthræ (goddess of peace, mercy, reconciliation) |
| Sidherun | The Spirits' Road | The old elven name for the continent, from sidhe + run |
| Sidhe'dhel | Spirit-kin | Elvenkind as a whole — the formal collective for both kindreds (new coinage, v1.4) |
| Ver'ama | Life-Mother | The Quin'lae name for Vælloria (canonized 2026-07-18) |
| Mor'el | The Still Light | The Quin'lae name for Morvathun (canonized 2026-07-18) |
| Tem'wen | Breath-Balance | The Equinox of Breath |
| Ith'quin | Deep Grove | The Shadowgrove |
| El'sae | Lightwells | The Lumen Wells |
| Ver'laeor | Life-Singer | Pulse-Singer (Order of the Verdant Pulse rank) |
| El'halor | Light-Keeper | Lumen-Keeper (Order of the Verdant Pulse rank) |
| Ith'ver | The Deep Green | The Quin'lae name for Roughnira (canonized 2026-07-18) |
| Seth'wen | The Still Wind | The Quin'lae name for Serakhala, the Stillness (canonized 2026-07-18) |
| Run'thrin | The Thorn-Road | The Thorned Path, Roughnira's order |
| Malgrath'threl | Malgrath's Mark | "The Scar Malgrath Carries" — the second Quin'lae text |

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
| The Hul (provisional name) | newer human culture: Hul + stem (HulFadar, HulDramar); Nol'Hradadra is also theirs | true Quin'lae morphemes |

The Hul borrow the elven apostrophe to claim antiquity — a Hul name can wear elven orthography without following the elision rule (Nol'Hradadra). Genuine Quin'lae names still obey §3 phonotactics, which is how to tell them apart.

## 10. Open items

- **Provenance: resolved.** With Eledhel and Glamredhel retired, no load-bearing Feist coinage remains in elven canon. #270 also renamed Stardock → Starquay and Spine of the World → **Kaelorun Range** (formal name; "the Spine" survives as the colloquial). Rillanon survives only as a blank legacy PC page.
- **Rename touch-points: shipped in #270.** `races.json` ids are `quindhel` / `glamdroi`, a `normalizeLegacyRace` transform migrates stored and imported characters (with regression tests), and rules chapters 05/16/18/20 carry the new names, including **the Quin'dhel Deep**. The PHB docx is deprecated (all PHB copies outside these golden pages are dead as of 2026-07-18); any future print handout renders from `rules/` and picks up the renames automatically.
- Bella D'Antonia's roster line reads Human/Quin'dhel — as of v1.1 that means half *high* elf specifically.
- **Nol'Hradadra: resolved (2026-07-18).** Reassigned to the Hul — a newer human culture (provisional name, after their Hul- settlements) that borrows the elven apostrophe to claim antiquity. Not a Quin'lae name. Open follow-up: give the Hul a real name and their own doc in `languages/`.
- **Qaal'el: resolved (2026-07-18).** The Quin'lae name for Selinthræ; "trust Qaal'el's mercy" is an elven invocation of her. The qaal root keeps its "mercy, grace" gloss.
- **Quin''tiel typo: fixed (2026-07-18)** on the Southern Shores Notion page (the Climate field now reads Quin'Tiel).
- **Grammar gaps: closed (v2.1, 2026-07-18).** Numerals, object pronouns, comparatives, and subordinate clauses are now in §11.
- **Register question: resolved (v2.2, 2026-07-18).** Ed's ruling: two registers (Eth'vor / Din'vor) with the kindred split carried by Din'vor — Quin'dhel conservative, Gla'mdroi clipped with liaison. See the end of §11.

## 11. Sentence grammar (v2.0)

Added after translating "The Equinox of Breath" into Quin'lae (`texts/tem-wen.md`) — the test that forced the language past name-generation.

**Word order: Verb–Subject–Object (VSO).** The verb comes first in every sentence: *Elir Caelindra soril* ("Lit Caelindra the-candle"). Adjectives and participles follow their noun (*thalin veren* = living trees) — the reverse of lexical compounds, where the modifier comes first (*Ver'laeor*). The crib for improvising at the table: say the action first.

**Pronouns:** ni (I), thu (you), sa (he/she/it — no gender). Plurals take the noun plural suffix: nin (we), thun (you all), sain (they). Possession binds with the apostrophe, same as compounds: *sa'quin* = her grove, *ni'ama* = my elder.

**Object pronouns (v2.1):** fuse the particle an- onto the pronoun — anni (me), anthu (you), ansa (him/her/it); plurals annin, anthun, ansain. *Velir sa ansa* = she saw her (fixing the old double-pronoun "velir sa sa"). Nouns need no object marking — VSO position carries it.

**Verbs:** root + tense vowel. No articles; no gender.

| Form | Suffix | Example (el- "to light") |
|---|---|---|
| Present | -a | ela — lights |
| Past | -ir | elir — lit |
| Future | -uin | eluin — will light |
| Participle | -en | elen — lit/lighting |
| Imperative | bare root | el! — light! |

**Negation:** the particle **nu** before the verb (*nu tolir sa* — she did not come); **nu** alone is "no", **na** is "yes". The prefix **nu-** derives antonym verbs: *ela* light → *nuela* extinguish; *vera* bloom → *nuvera* fade.

**Particles:** o (of), an (to/for), os (from), im (in/at/on), ter (through), veth (with), ar (and), ya (that/which), sul (as/like), enu (before), ono (after), anu (again), aia (always/each), a (vocative).

**Derivation suffixes:** agent **-or** (laeor singer, sylor weaver, halor keeper); diminutive **-il** (soril candle "little flame", veril flower "little growth", tielil window "little gate"); plural **-in** after a consonant, **-n** after a vowel — applies to nouns and pronouns alike.

**Numbers (v2.1 — base-12):** the elves count in twelves; a dozen is a **sil**, "a moon", because a year (*sorun*) holds twelve moons. A month is likewise a *sil*.

| 1 min | 2 dath | 3 nel | 4 sar | 5 lem | 6 wes |
|---|---|---|---|---|---|
| **7 oth** | **8 dol** | **9 yan** | **10 maeth** | **11 mael** | **12 sil** |

Compounds: 13 = *sil ar min* (a moon and one), 24 = *dath silin* (two moons), 30 = *dath silin ar wes*, 144 = **silsil** ("a moon of moons"). Ordinals take -eth: *eth* first (irregular, from the root), *datheth* second, *neleth* third.

**Comparatives (v2.1):** comparative suffix **-ar** (*hael* far → *haelar* farther, *maen* many → *maenar* more); superlative with the prefix **eth'** ("first-": *eth'hael* = farthest); "than" is the particle **ol**: *haelar ol quin* = farther than the grove.

**Subordinate clauses (v2.1):** **quen** (if), **tas** (then), **osya** (because, "from-that"), **imya** (when, "in-that"), with **ya** continuing as the relative (who/which/that). *Quen tola sa, tas ela ni soril* = if she comes, then I light the candle. Questions: the particle **que** opens a yes/no question (*Que tolir sa?* = did she come?); the qu- interrogatives are **quath** (what), **quon** (who), **quor** (where), **quan** (when), **quosya** (why). A qu- word stands first in its sentence and the verb follows it directly: *Quor runir sa?* = where did she walk?

**Registers (v2.2):** Quin'lae has two registers. **Eth'vor** ("first-speech") is the formal voice — liturgy, oaths, diplomacy, and any telling of a story; all of Tem'wen is Eth'vor, and everything in §11 above describes it. **Din'vor** ("day-speech") is everyday talk, marked by four habits:

1. **Topic fronting.** The subject may precede the verb (*Sa tolir* beside *Tolir sa*). Commands, questions, and blessings keep the verb first even in Din'vor.
2. **Copula drop.** *ea/eir* vanishes when nothing is lost: *Thu hael os thu'quin* — "you're far from your grove" (Eth'vor: *Ea thu hael os thu'quin*).
3. **o-elision.** The particle *o* "of" collapses into the apostrophe, the same seam as compounds: *ven'quin* for *ven o quin*, "the grove's edge". This is live syntax, so it does not create new canonical names (§4 still governs those).
4. **Clipped particles.** *osya* → *sya* (because), *imya* → *mya* (when), and *que* drops entirely — a Din'vor yes/no question is bare rising speech: *Tolir sa?*

**Kindred speech (v2.2):** both kindreds share Eth'vor unchanged; in ceremony the Sidhe'dhel are one voice. Din'vor is where they part. Quin'dhel day-speech is conservative — it drops the copula and little else, and humans who learn "Elvish" from Quin'dhel teachers come away sounding formal. Gla'mdroi day-speech clips hardest and adds **liaison**: words run together at the seams, written with the apostrophe — *ve'thu* for *veth thu* ("with you"), *A'thaleth* for *a Thaleth* (the fused vocative). The archaic liaison spellings on the map (Gla'mDroia, Qu'Droia, Al'l-AmaDroia) are this habit fossilized in old names — which is why those names cluster around Gla'mdroi country. Transcribed Gla'mdroi dialogue may coin liaisons freely; canonical place names still may not (§4, rule 3).

## 12. Extended lexicon from the Tem'wen test

All coinages follow §3 phonotactics; most derive from existing roots.

**Nouns:** din day · dineth morning ("day-first") · sor sun, flame · sorun year ("the sun's road") · virun autumn ("the turning road") · seth silence, stillness · mor death, ending · ver life (gloss extended from "leaf/growth") · lath scent · duth shadow · ven mouth · sen seed · don place, ground · meth rest · methen last ("resting") · thren fear · vor word, saying · tar load, burden · len name · dael gratitude · tem balance · daven gift, offering · elan god, divine one (pl. elanin)

**Adjectives:** maen many · hael far · tan certain · laden open · veren young, living · moren dead · nuveren fading (the elven word for "ill")

**Verbs:** tol- come · run- walk, journey · vel- see, look · thir- feel · vor- say · quer- ask · meor- know, remember (one verb — for the Sidhe'dhel, knowledge is memory) · hal- hold, keep · tar- carry · don- set down, place · el- light, shine · vir- turn, change · sen- plant · seth- grow still (the elven verb for dying) · meth- rest · nar- need · ea (is/are), eir (was/were)

**Phrasebook coinages (v2.2, 2026-07-18):** dar- halt, stay · haeldhel stranger ("far-kin") · quaen how many, how much (que + maen) · dhel promoted to a freestanding noun: kinsman, kin-friend (in Din'vor, simply a friend) · tem extended: balance; also peace, truce. First used in [`texts/phrasebook.md`](texts/phrasebook.md).

**Malgrath'threl coinages (v2.3, 2026-07-18):** first used in [`texts/malgrath-threl.md`](texts/malgrath-threl.md).

- *New roots:* drion wolf · threl scar, mark (also the verb threl- to mark) · vath blood · nor bone · slaen vine · thrin thorn (a common noun, native thr- formation).
- *Derivations:* velil eye ("little seer") · taril hand ("little carrier") · wenil feather ("little wind") · orinil shard ("little stone") · velor witness ("seer") · haldon cage ("hold-place") · dav- give (daven "gift" re-parsed as its participle) · nuvel- forsake, look away from (the nu- antonym of vel-) · nim extended: white, snow; also cold · soren warm (participle of a flame) · wen glosses both wind and breath (as Tem'wen always implied).
- *Compounds:* ith'don vault ("deep-place") · el'hal crown ("light-hold") · sor'vor oath-fire ("word-flame") · Vel'orin the Lens ("seeing-stone") · Run'thrin the Thorned Path ("thorn-road").
- *Loan:* khel iron — borrowed from Dûrakhar with its alien k intact; the visible mark of borrowing, and the one licensed k in Quin'lae.

## 13. Texts

Full Quin'lae texts live in [`texts/`](texts/), with interlinear gloss and English.

- [`texts/tem-wen.md`](texts/tem-wen.md) — **Tem'wen**, "The Equinox of Breath" told in Quin'lae (21 stanzas covering the full story).
- [`texts/phrasebook.md`](texts/phrasebook.md) — the table phrasebook: 25 stock utterances for GM use, in both registers, with Gla'mdroi liaison variants.
- [`texts/malgrath-threl.md`](texts/malgrath-threl.md) — **Malgrath'threl**, "The Scar Malgrath Carries" told in Quin'lae (18 stanzas; numerals, loans, and the Ith'ver / Seth'wen divine names).
