# Languages — Handoff & Next Steps

State as of 2026-07-18 night (Quin'lae v2.6, PRs #273–#286, #293, and the #294 enemy-canon PR). This file is the entry point for any session continuing the language work. Read `README.md` (the nine-step process) and `quindel.md` before starting anything.

## Where everything is

| Thing | Location |
|---|---|
| Quin'lae canonical doc (v2.5) | `languages/quindel.md` — §1–10 names/canon, §11 grammar + registers, §12 lexicon, §13 texts, §14 writing, §15 origin |
| Texts (gloss + English) | `languages/texts/` — `tem-wen.md` (21 stanzas), `phrasebook.md` (25 utterances), `malgrath-threl.md` (18 stanzas), `eth-lae.md` (13 stanzas, origin liturgy) |
| Authoritative creation process | `languages/README.md` § "Creating a new language" |
| Notion mirror (derived, never canonical) | page `3a1e8e2e-a25a-8153-a833-d1c4c0f976cf` under the Sidherun hub |
| Divine-name callouts in Notion | Selinthræ (`95fe8e2e-a25a-82da-baa7-815480aeb2fe`), Vælloria (`1dae8e2e-a25a-8272-bf13-815e94e2c38a`), Morvathun (`7d0e8e2e-a25a-82f9-9c42-01e068b48b54`), Roughnira (`1c7e8e2e-a25a-8237-99cd-01a6f91f4672`), Serakhala (`cf3e8e2e-a25a-8270-aed4-01260cafb368`) — all five placed; Duskmantle Hollow (`334e8e2e-a25a-8161-b729-e6b8887be26b`) carries a Thal'threl cross-ref |
| Retired pointer stubs | `~/Code/Sidherun/quindel-language.md`, `~/Code/Sidherun/tem-wen-translation-draft.md` |

Working conventions: every change lands via PR (worktree branch off `origin/main`); after merging, re-sync the Notion mirror (plain paragraphs match with targeted `update_content`; anything touching a table needs a full-content replace); prose obeys `~/Code/Sidherun/VOICE.md`; every coinage passes the IP-provenance check and §3 phonotactics.

## Rulings landed 2026-07-18 evening (Ed, in session)

- **Registers (v2.2, #283):** Eth'vor (formal) / Din'vor (everyday); Quin'dhel day-speech conservative, Gla'mdroi clipped with liaison. Both kindreds share Eth'vor.
- **Second text (v2.3, #285):** Malgrath'threl; Ith'ver = Roughnira, Seth'wen = Serakhala; foreign names stay unadapted; *khel* iron is a marked Dûrakhar loan.
- **Writing (v2.4, #286):** the script is where the kindreds diverge — Gla'mdroi keep the carved Thal'threl, Quin'dhel weave Syl'vor cords; the oldest marks (elder speech) are read by no one, and the Duskmantle Root Break deliberately stays unresolved.
- **Origin (v2.5, #291):** the Sidhe'dhel have no maker — the sidhe always walked the Spirits' Road; elvenkind are the spirits who stopped, and they do not remember stopping. The Eth'lae is the origin liturgy, never written in-world. Full canon in §15.
- **Enemies (v2.6, #294):** walking back along the road is the one violation — the **anu'runorin** (returned dead) are the elves' ancient enemies, and **Aia'runor** the Always-Walker (= Nakar, Character DB) un-stops them; he has always existed and always will, everything else deliberately open. Eth'lae stanzas 10–11 are the warning verses. **Spoiler note:** Nakar is unrevealed in-game; his Notion character page is deliberately untouched, and player-facing exposure of the Aia'runor connection is Ed's call.

## Next steps, in recommended order

1. **Origin World Story (waiting on Ed).** The prose telling of the Spirits Who Stayed for the Notion World Stories DB — beat-sheet delivered in the 2026-07-18 session; facts in §15. Ed writes the prose per VOICE.md.
2. **First named elves.** No named Quin'dhel or Gla'mdroi NPC exists anywhere in canon (Caelindra and Hesswyn in Tem'wen are the nearest thing — order titles, kindred unstated). Coin with §6 personal names. Highest-leverage first use: Bella D'Antonia's elven parent (campaign-relevant — Deidre's PC is Human/Quin'dhel). Ed is mulling the parent decision (mother/father, living/dead, Qu'Droia vs Quin'meori).
2. **The Hul.** Give them a real name and a primitives doc (follow the README process; corpus: HulFadar, HulDramar, Nol'Hradadra plus whatever new canon exists by then). Their apostrophe-borrowing lore is set in `quindel.md` §9.
3. **Dûrakhar.** The second full language build — richest existing corpus (Karak Vohn, Bryndak, Khelvar, Halvra, Vosk, Ketta, the û convention, three Dûrakhar stories to mine and stress-test against). The Quin'lae loan *khel* "iron" (v2.3) is the first cross-language datum to honor.
4. **Thal'threl glyphs (optional).** §14 defines the scripts without drawing them. If ever wanted: stroke inventory for Thal'threl, knot/color scheme for Syl'vor, and a rendered sample — cosmetic, no canon pressure.
5. **Small canon rulings when convenient:** what is remembered at Quin'meori; the Oreg ar/af Nata spelling and whose language that name is (if the Quin'lae particle *ar* "and" applies, it glosses oddly); whether the elder speech beneath Quin'lae ever gets even a sketch (default: no, until a text demands it).

## Repo placement

Decision 2026-07-18: languages stay in this repo alongside `rules/` — they are the same class of thing (canonical Sidherun content under the dual-license split in `COPYRIGHT.md`), and the app may eventually consume `languages/` data directly (e.g. an elven name generator in the builder). Revisit only if (a) a content-only collaborator needs repo access without app code, or (b) canon content comes to dominate the repo — and if a split ever happens, move `rules/` and `languages/` together into a canon repo, never languages alone.
