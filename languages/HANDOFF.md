# Languages — Handoff & Next Steps

State as of 2026-07-18 (Quin'lae v2.1, PRs #273–#280). This file is the entry point for any session continuing the language work. Read `README.md` (the nine-step process) and `quindel.md` before starting anything.

## Where everything is

| Thing | Location |
|---|---|
| Quin'lae canonical doc (v2.1) | `languages/quindel.md` — §1–10 names/canon, §11 sentence grammar (VSO), §12 lexicon, §13 texts |
| First text (Tem'wen, 21 stanzas + gloss) | `languages/texts/tem-wen.md` |
| Authoritative creation process | `languages/README.md` § "Creating a new language" |
| Notion mirror (derived, never canonical) | page `3a1e8e2e-a25a-8153-a833-d1c4c0f976cf` under the Sidherun hub |
| Divine-name callouts in Notion | Selinthræ (`95fe8e2e-a25a-82da-baa7-815480aeb2fe`), Vælloria (`1dae8e2e-a25a-8272-bf13-815e94e2c38a`), Morvathun (`7d0e8e2e-a25a-82f9-9c42-01e068b48b54`) |
| Retired pointer stubs | `~/Code/Sidherun/quindel-language.md`, `~/Code/Sidherun/tem-wen-translation-draft.md` |

Working conventions: every change lands via PR (worktree branch off `origin/main`); after merging, re-sync the Notion mirror (plain paragraphs match with targeted `update_content`; anything touching a table needs a full-content replace); prose obeys `~/Code/Sidherun/VOICE.md`; every coinage passes the IP-provenance check and §3 phonotactics.

## Next steps, in recommended order

1. **Table phrasebook (small, high value).** ~20 stock Quin'lae utterances a GM can drop into play — greetings, warnings, blessings, curses, "halt, who goes there". Exercises the v2.1 question words and conditionals, which no text uses yet. Ship as `texts/phrasebook.md`.
2. **Register ruling (decision for Ed).** The one open §10 question: is there a plainer everyday register beneath the Tem'wen liturgical voice, and do the Quin'dhel and Gla'mdroi speak recognizably differently? A cheap answer: everyday speech drops the VSO inversion less strictly and clips particles; Gla'mdroi favor the archaic liaison spellings. Needs Ed's call before writing dialogue-heavy texts.
3. **First named elves.** No named Quin'dhel or Gla'mdroi NPC exists anywhere in canon. Coin them with §6 personal names. The highest-leverage first use: Bella D'Antonia's elven parent (campaign-relevant — Deidre's PC is Human/Quin'dhel).
4. **Second text.** Translate a dialogue-heavy passage (a Grandanto's Folly scene or "The Scar Malgrath Carries") to stress the v2.1 machinery — questions, conditionals, numerals — the way Tem'wen stressed the v2.0 basics.
5. **A script.** Does Quin'lae have its own writing? The Duskmantle Hollow page already seeds it: shadow-patterns that look like "writing in a language that no longer exists". Design decision, then a small doc section; rendering glyphs is optional and can come much later.
6. **The Hul.** Give them a real name and a primitives doc (follow the README process; corpus: HulFadar, HulDramar, Nol'Hradadra plus whatever new canon exists by then). Their apostrophe-borrowing lore is set in `quindel.md` §9.
7. **Dûrakhar.** The second full language build — richest existing corpus (Karak Vohn, Bryndak, Khelvar, Halvra, Vosk, Ketta, the û convention, three Dûrakhar stories to mine and stress-test against).
8. **Small canon rulings when convenient:** what is remembered at Quin'meori; the Oreg ar/af Nata spelling and whose language that name is (if the Quin'lae particle *ar* "and" applies, it glosses oddly).

## Repo placement

Decision 2026-07-18: languages stay in this repo alongside `rules/` — they are the same class of thing (canonical Sidherun content under the dual-license split in `COPYRIGHT.md`), and the app may eventually consume `languages/` data directly (e.g. an elven name generator in the builder). Revisit only if (a) a content-only collaborator needs repo access without app code, or (b) canon content comes to dominate the repo — and if a split ever happens, move `rules/` and `languages/` together into a canon repo, never languages alone.
