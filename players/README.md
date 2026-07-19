# Sidherun Player Docs

> Everything in this directory is Sidherun game content: **Copyright © 2026 Ed
> Martin, all rights reserved**, with permission for personal at-table use —
> see [`../COPYRIGHT.md`](../COPYRIGHT.md). It is *not* covered by the repo's MIT
> code license.

Curated player-safe lore, derived from the canon in [`rules/`](../rules/README.md) and [`languages/`](../languages/README.md). Canon docs carry everything, including GM-only material; the docs here carry only what player characters know in-world. Issue #297 defines the layer; Ed's mirror-completeness ruling (2026-07-18) is the reason it exists — the Notion canon mirror is never redacted, so player-safe exposure has to be a separate derived artifact.

## The audience rule

Every doc in this directory is safe to hand to any player at the table, in full. Three conventions make that hold without tagging individual sentences:

1. **The knowledge frame.** Each doc opens by stating whose knowledge it represents ("what any elf character knows"). Everything below that line sits inside the frame.
2. **Omission is the spoiler mechanism.** Canon material that players shouldn't see is left out entirely. If a topic can't be covered without touching GM-only ground, the doc stops at what characters actually know in-world — an elf knows the First Song warns of the Always-Walker, and the doc says exactly that much.
3. **GM-only by default.** Anything in `rules/`, `languages/`, or the Notion canon mirror that does not appear in a player doc is GM-only until a PR here says otherwise.

## Derivation discipline

- Player docs contain **nothing that isn't in canon**. They curate, reorder, and rephrase; they never invent. Each doc's frontmatter lists its canon sources.
- When canon moves (a new ruling, a new version of a language doc), the affected player doc is re-derived in the same PR or a follow-up, and its `updated` date bumps.
- Prose obeys `~/Code/Sidherun/VOICE.md`.
- Changes land via PR like every other golden page. Notion copies are derived mirrors, never canonical.

## Data contract (the app seam)

This is the interface Codex builds against — the same shape as the `rules/` golden pages that the PHB reader (#299) renders, plus frontmatter.

Each doc is a GitHub-flavored Markdown file with a YAML frontmatter block:

```yaml
---
id: elves                 # stable slug; the app's key for this doc — never changes
title: "The Sidhe'dhel — Elvenkind"
summary: "One line for index cards and lists."
knowledge: "Whose knowledge this doc represents, one sentence."
sources:                  # canon files this doc derives from (re-check these when canon moves)
  - languages/quindel.md
texts:                    # optional: player-safe texts from languages/texts/ to surface alongside
  - languages/texts/eth-lae.md
updated: 2026-07-19       # last curation sync
---
```

Contract terms:

- The app discovers docs by globbing `players/*.md` and parsing frontmatter; there is no separate manifest to keep in sync.
- `id` is the stable key — filenames and titles may change, `id` may not.
- The body is plain GFM (headings, tables, links) rendered by the same pipeline as `rules/` chapters. No HTML, no app-specific syntax.
- `knowledge` renders as the doc's epistemic banner in the app.
- `texts` lists files under `languages/texts/` that are themselves player-safe in full and can be linked or rendered from the doc's page. Texts stay in `languages/texts/` — the frontmatter points at them so nothing is duplicated.
- Relative links between player docs (`[elves](elves.md)`) should resolve in the app reader.

## Delivery vehicles

1. **App** — a lore/reference surface in the character builder fed from this directory (Codex's scope). The elven name generator is a separate feature fed from `languages/` directly.
2. **PHB print** — any future print handout renders `players/` alongside `rules/`.
3. **Notion** — each player doc gets a derived mirror in a player-visible section of the hub (placement is Ed's call; see open questions).

## Docs

| File | Doc | Knowledge frame |
|---|---|---|
| [`elves.md`](elves.md) | The Sidhe'dhel — kindreds, speech, writing, origin, enemies | Any elf character; anyone raised among elves |

Planned next (from #297): races & kindreds beyond elves, a language primer + phrasebook selection, pantheon as commonly worshipped.

## Open shape questions (for Ed's review)

- **Aia'runor exposure.** `elves.md` includes the Always-Walker exactly as the Eth'lae presents him (stanzas 10–11: he exists, he un-stops the dead, the elves halt them) and nothing more. The Nakar equation stays GM-only. Ed ruled player-facing exposure of the connection is his call — this draft draws the line at "what the song says"; confirm or move it.
- **Notion placement.** Which part of the hub is the player-visible section for these mirrors?
- **Texts wholesale.** `eth-lae.md` and `phrasebook.md` read as player-safe in full. `tem-wen.md` and `malgrath-threl.md` haven't been audited for player exposure — audit when a player doc wants them, or on request.
