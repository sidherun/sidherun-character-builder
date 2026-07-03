# Sidherun Character Builder — Claude Coordination

## Context

Ed has a 13-person Sidherun RPG game in 6 days. Players have played these characters before;
their sheets are coming in as phone photos. Goal: extract each character into a valid import
JSON, load all 13 into the app, and produce printouts for game day.

Ed is the GM and first-class citizen. The app must support GM workflows (manage all characters,
quick edits during play) not just individual player character creation.

## Workflow

1. Read `tasks/todo.md` at session start
2. Work directly on `main` or short-lived feature branches as needed
3. Update `tasks/todo.md` with what shipped

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
