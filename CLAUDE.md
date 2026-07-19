# Sidherun Character Builder — Claude Coordination

## Context

The kickoff event — **"Grandanto's Folly"**, a 14-player Sidherun RPG session — ran over
Father's Day weekend 2026, and the app carried it (all characters imported from phone-photo
sheets, run live from the GM Screen). That deadline has **passed**; this is now an **ongoing,
multi-session campaign** and the app is being improved for the **next session** going forward.

The next session will be run by **Ed and/or Max Chartier** (co-DMs), so the app must support
**GM workflows for either of them** — manage all characters, quick edits during play, live
tracking — not just individual player character creation. The same ~14 returning PCs (all
level 3 at kickoff) will **level up** and keep playing, so leveling, correctness of the core
dice/combat math, and the live-table infra (GM Screen, cloud sync, roll feed) are the durable,
reused core. Optimize for **quality and correctness across future sessions, not race-to-a-date**.

## Multi-agent coordination

Claude and Codex both work this repo. The canonical coordination rules live in
`AGENTS.md` § "Multi-agent coordination" — follow them. Where this file and
`AGENTS.md` overlap, keep them in sync; the rules themselves are edited only in
`AGENTS.md`.

## Workflow

1. At session start: read `tasks/todo.md` (shipped history) and `gh issue list` (live work)
2. Work in a dedicated worktree on a `claude/*` branch off freshly fetched `origin/main`; land via PR
3. Append a one-line row to `tasks/todo.md`'s shipped table inside the same PR (append-only — never rewrite the file)

## Design tokens (Codex)

All color comes from `src/tokens.css` as `var(--token)` — **never a raw hex** in a
component (JSX inline styles or `.module.css`), and **never a local palette
re-declaration** in a component. The one exception is `generateCharacterHTML.js`,
which is a self-contained printable export with its own inline palette.

- Ink is an **emphasis** ramp: `--ink-900` (strongest text) → `--ink-300`
  (faintest), monotonic in both themes.
- Status/accent colors: `--danger`, `--story` (success/green), `--bronze`
  (mid/accent), and the resource colors `--hp`, `--mana`, `--armor`.
- Both `[data-theme="dark"]` and `[data-theme="light"]` must define every token.

See `CODEX-MIGRATION.md` for the historical old→new map. The legacy `--inkNNN`
aliases and legacy palette (`--gold-*`, `--crimson`, `--parchment`, …) have been
fully removed — do not reintroduce them.
