# Sidherun Character Builder — Agent Coordination

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

Claude and Codex both work this repo. These rules are canonical here; `CLAUDE.md` references
them. They bind every **session** of either agent — the incident they exist to prevent was two
sessions of the *same* agent colliding.

1. **One session, one worktree, one branch.** Branch off a freshly fetched `origin/main`,
   prefixed by agent: `claude/*` or `codex/*`.
2. **The primary checkout is read-only reference.** No implementation there, no uncommitted
   edits left behind.
3. **Claim before you code.** Each task has a GitHub issue naming owner, branch, and file
   scope. Check `gh pr list` and open issues for overlap first; if scopes overlap, coordinate
   in the issue before editing.
4. **`main` moves only by PR.** Fetch immediately before branching and again before merging;
   rebase after any overlapping merge lands.
5. **Merge only your own PRs**, after checks pass. Never force-push `main`.
6. **Stage explicit paths.** Never bare `git add -A`.
7. **Never alter, stash, revert, or commit another session's files unilaterally.** Surface
   the conflict to Ed and let him decide.
8. **`tasks/todo.md` is append-only.** Each PR adds its own one-line row to the shipped table,
   in that same PR. Never rewrite or reorganize the file; session working notes belong in the
   PR or issue, not in the tree.
9. **Shared docs are collision points** (`README.md`, `CLAUDE.md`, `AGENTS.md`,
   `tasks/todo.md`). Edit them last in a branch — or in a small follow-up PR — after fetching
   current `main`.
10. **Keep the claim current.** Update the issue when scope, status, or blockers change;
    review README impact before finishing.

Standing scopes as of 2026-07-18 (claims are per-issue, not permanent): Claude owns
`languages/**` and canon content (`rules/`); Codex owns claimed app feature work (e.g. GM
Screen). GitHub issues and PRs are the authoritative coordination record — there is no
`active-work.md` file, by design.

## Workflow

1. At session start: read `tasks/todo.md` (shipped history) and `gh issue list` (live work).
2. Work in a dedicated worktree on an agent-prefixed branch; land via PR per the rules above.
3. Append your row to `tasks/todo.md`'s shipped table inside the same PR.

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
