# Sidherun Languages

> Everything in this directory is Sidherun game content: **Copyright © 2026 Ed
> Martin, all rights reserved**, with permission for personal at-table use —
> see [`../COPYRIGHT.md`](../COPYRIGHT.md). It is *not* covered by the repo's MIT
> code license.

Canonical references for the constructed languages and naming systems of Sidherun. Same handling as the golden pages in [`rules/`](../rules/README.md): the files here are the source of truth, changes go through PRs, and any Notion copies are derived mirrors.

Each language doc carries the primitives needed for go-forward naming: attested corpus, phonology, orthography, morpheme lexicon, name grammar, generation recipe, and a register-contrast table so the cultures stay phonetically distinct.

## Languages

| File | Language | People |
|---|---|---|
| [`quindel.md`](quindel.md) | Quin'lae ("grove-song") — names + full sentence grammar (VSO, v2.0) | The Sidhe'dhel (elvenkind) — Quin'dhel (high) and Gla'mdroi (wild) kindreds |

## Texts

| File | Text |
|---|---|
| [`texts/tem-wen.md`](texts/tem-wen.md) | **Tem'wen** — "The Equinox of Breath" told in Quin'lae, 21 stanzas with interlinear gloss |

## Candidates not yet documented

- **Dûrakhar** (dwarven) — corpus exists (Karak Vohn, Bryndak, Khelvar, Halvra, û-circumflex convention) but no primitives doc yet
- **The Hul** (provisional name) — newer human culture (HulFadar, HulDramar, Nol'Hradadra); borrows the elven apostrophe to claim antiquity; needs a real name and a primitives doc
- **Divine register** — deity-name conventions (Vælloria, Kaelorun, æ-ligature); documented in contrast tables only

## Creating a new language — the authoritative process

Proven by the Quin'lae build (v1 → v2.0, PRs #273–#278). Every future language doc follows these nine steps, in order:

1. **Corpus sweep.** Gather every attested name for the culture from all sources — Notion (world map, rosters, stories, deity pages), the golden pages in `rules/`, import files. Record spelling variants verbatim, and flag anything borrowed from published IP (the check that caught Eledhel/Glamredhel/Stardock).
2. **Decompose.** Find the recurring morphemes. Every proposed root carries an evidence status — **A**ttested, **I**nferred, or **N**ew — so canon and invention never blur.
3. **Phonology + orthography.** Derive the sound inventory and syllable rules *from the corpus*, then define what is deliberately absent (Quin'lae bans k/kh/z; Dûrakhar owns û). Write the orthography rules: apostrophes, capitalization, diacritics.
4. **Register contrast.** Check the new language against every existing naming family — a name must be attributable to its culture at a glance. Each language doc carries the contrast table.
5. **Name grammar + generation recipe.** Compound rules, demonyms, personal-name suffixes, and a short recipe with worked examples, so anyone can coin a legal name in under a minute.
6. **Canonical glosses.** Retro-fit meanings onto existing canon names. Names that break the phonotactics get flagged, and misfits become explicit decisions for Ed (how Nol'Hradadra became a Hul name) — never silent assumptions.
7. **Stress test against a real text.** Translate a World Story (or a substantial passage) into the language. This forces sentence grammar — word order, pronouns, tenses, particles — and exposes gaps, which are logged in the doc's Open items rather than papered over.
8. **Ship via the golden-page pipeline.** Canonical doc at `languages/<name>.md`, texts at `languages/texts/`, all changes via PR. Notion pages are derived mirrors; affected Notion pages (deities, locations) get cross-reference callouts; this README's index gets a row.
9. **Iterate by ruling.** Open questions live in the doc's Open items section; Ed's decisions come back as versioned PRs (v1.1 → v2.0 style), each recorded in the doc's header.

Standing constraints: the IP-provenance check at step 1 applies to every coinage, and `~/Code/Sidherun/VOICE.md` governs any narrative prose written along the way.
