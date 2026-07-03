# Codex token migration

Replacing `src/tokens.css` with the corrected version, plus the follow-up
cleanups. Safe to do incrementally — the new file ships **legacy aliases**, so
the app keeps working before you touch a single component.

---

## Getting this into the repo (read me first)

These files were produced in a separate design project — your coding agent
(Claude Code, etc.) has **no automatic awareness of them**. To make the change
real, land them in the repo where the agent will see them:

1. **Copy the package files into the repo** at the paths below, and commit this
   `CODEX-MIGRATION.md` alongside them. Once committed, the doc *is* the
   instruction set — point the agent at it: *"Follow CODEX-MIGRATION.md."*

   | Package file                | Repo destination                               |
   |-----------------------------|------------------------------------------------|
   | `tokens.css`                | `src/tokens.css` (replace)                     |
   | `NotesPanel.module.css`     | `src/components/NotesPanel.module.css` (replace) |
   | `Toast.module.css`          | `src/components/Toast.module.css` (replace)    |
   | `Step1Welcome.module.css`   | `src/components/steps/Step1Welcome.module.css` (replace) |
   | `CODEX-MIGRATION.md`        | repo root (reference)                          |

2. **Add a pointer to `CLAUDE.md`** so any future agent session picks up the
   convention automatically. Suggested snippet:

   > **Design tokens.** All color comes from `src/tokens.css` as `var(--token)` —
   > never hardcoded hex, and never re-declared locally in a component. The ink
   > scale is an *emphasis* ramp: `--ink-900` (strongest text) → `--ink-300`
   > (faintest), monotonic in both themes. See `CODEX-MIGRATION.md` for the
   > token map and the corrected-vs-legacy status. `Codex.dc.html` (in the design
   > project) is the visual reference.

3. Then run **Step 2** (the `--ink-*` sweep) and **Step 3** (hygiene fixes)
   below. A coding agent can execute these directly from this file.

> The design-project preview (`Codex.dc.html`) is the *visual* source of truth;
> this repo, after you commit these files, is the *code* source of truth. Keep
> them in sync by re-exporting from the design project when tokens change.

---

## Why

The shipped ink scale isn't monotonic and has a duplicate:

- `--ink500` (`#d8ccb4`) is **lighter** than `--ink600` (`#cabfa3`) in dark mode,
  so a higher number doesn't reliably mean stronger text.
- `--ink350` and `--ink300` are the identical `#7a6a4f`.
- `--line` and `--line-strong` are both `#3a3025` in dark mode — the "strong"
  variant does nothing.

The fix treats ink as an **emphasis** ramp: `--ink-900` = highest-contrast text,
down to `--ink-300` = faintest. That's monotonic in *both* themes (in dark,
emphasis = lighter; in light, emphasis = darker).

**Impact:** in **dark** mode this is a pure rename — every value is preserved.
In **light** mode the only changes are the two mid-tones that were mis-ordered
(`--ink500`/`--ink600` swap) and the faintest step (`--ink300` `#a99a7e` →
`#9a8a6a`, deduped). All three nudge contrast the correct direction; there is no
visible regression.

---

## Step 1 — drop in the new tokens (0 breakage)

Replace `src/tokens.css` with the new file. Because it keeps the old
`--ink900 … --ink300` names as aliases pointing at the new ramp, the whole app
renders exactly as before (dark) or slightly cleaner (light). Ship this alone
and nothing else has to change yet.

## Step 2 — migrate component references to `--ink-*`

Rewrite `var(--inkNNN)` → `var(--ink-NNN)` per this map. Values are chosen so
this is safe to run globally:

| Old token   | New token   | Dark value | Note                    |
|-------------|-------------|------------|-------------------------|
| `--ink900`  | `--ink-900` | `#f4ecda`  | headings, numerals      |
| `--ink700`  | `--ink-800` | `#e2d8c2`  | strong body             |
| `--ink600`  | `--ink-600` | `#cabfa3`  | subtitles               |
| `--ink500`  | `--ink-700` | `#d8ccb4`  | secondary text (moves)  |
| `--ink450`  | `--ink-500` | `#b0a488`  | muted                   |
| `--ink400`  | `--ink-400` | `#8a7a5c`  | descriptions            |
| `--ink350`  | `--ink-300` | `#7a6a4f`  | placeholder / faint     |
| `--ink300`  | `--ink-300` | `#7a6a4f`  | dedup                   |

From the repo root (BSD/macOS sed — GNU sed: use `sed -i` without the `''`):

```bash
grep -rl -- '--ink' src | while read f; do
  sed -E -i '' \
    -e 's/--ink900\b/--ink-900/g' \
    -e 's/--ink700\b/--ink-800/g' \
    -e 's/--ink600\b/--ink-600/g' \
    -e 's/--ink500\b/--ink-700/g' \
    -e 's/--ink450\b/--ink-500/g' \
    -e 's/--ink400\b/--ink-400/g' \
    -e 's/--ink350\b/--ink-300/g' \
    -e 's/--ink300\b/--ink-300/g' \
    "$f"
done
```

The tokens are mutually exclusive fixed-length names, so order doesn't matter
and there are no partial-match collisions. The `\b` guards against a stray
`--ink3000` type match.

Run it, then **delete the alias block** (the two `REMOVE after migrating`
sections) from `tokens.css`. Diff and eyeball a dark + light screenshot.

> Heads-up: many component CSS files also hardcode a fallback,
> e.g. `var(--ink500, #d8ccb4)`. The sed above updates the token name but leaves
> the literal fallback — that's fine (fallbacks only apply if the var is unset).
> Optionally sweep the fallbacks to match the new value later; not required.

## Step 3 — the remaining hygiene fixes

Two of these ship as ready-to-drop files in this package; two are quick manual
edits.

1. **Port `NotesPanel` and `Toast` to Codex.** ✅ **Provided** —
   `NotesPanel.module.css` and `Toast.module.css` in this package are the ported
   replacements (Codex tokens + Newsreader / Spectral / JetBrains Mono; Toast
   success/error now use `--story` / `--danger` as tinted alerts). Class names
   are unchanged, so **the `.jsx` files need no edits** — just overwrite the two
   CSS modules in `src/components/`.

2. **Remove local token re-declarations.** ✅ **Provided** — drop in the
   `Step1Welcome.module.css` from this package. The block that re-declared the
   dark palette scoped to `.page` is gone, so the Welcome screen now inherits
   the theme and responds to the light/dark toggle.

3. **Kill raw-hex status colors.** ✏️ **One-line edit** in
   `src/components/steps/Step3Attributes.jsx`:

   ```diff
   - const avgColor = avg >= 15 ? '#2d5a27' : avg >= 12 ? '#8b6914' : '#8b1a1a'
   + const avgColor = avg >= 15 ? 'var(--story)' : avg >= 12 ? 'var(--bronze)' : 'var(--danger)'
   ```

   (It's already applied as `style={{ color: avgColor }}`, which accepts a
   `var()` string — no other change needed.)

4. **Retire the legacy palette.** ✏️ Once #1 lands, delete the
   `/* Legacy vars kept for un-ported components */` block from `src/index.css`
   (`--gold-bright`, `--gold-dim`, `--gold-pale`, `--crimson`, `--parchment`,
   `--parchment-dark`, `--ink`, `--ink-light`, `--border-gold`). Grep the repo
   for each name first to confirm nothing else references it.

---

## Verify

- Toggle dark ↔ light on the Welcome, a wizard step, Play Mode, and the Roster.
- Confirm `--line-strong` borders (buttons, card edges) read a touch stronger.
- Confirm no element lost its color (a missed `--inkNNN` would fall back to its
  literal and look fine, but grep `--ink[0-9]` after Step 2 to be sure none
  remain).
