# Sidherun Character Builder

A browser-based character creation tool for the **Sidherun** tabletop RPG. Build, track, and play your characters — no account or backend required.

**Live:** https://character-builder.sidherun.com/

---

## Features

- **9-step wizard** — Welcome → Identity → Attributes → Combat → Powers → Magic → Skills → Resources → Review (Powers and Magic appear only for archetypes that use them). Identity captures both the **character name** and the **player name** (the real person), shown on the GM Screen, Play Mode header, roster card, and printout.
- **Auto-calculated stats** — HP, Mana, Defense, and Spell Target table update automatically from your attributes
- **Play Mode** — Live HP/Mana/Story Points tracking with quick-adjust buttons, armor that absorbs up to its soak value per hit, attributes/powers/magic at a glance, an **editable Inventory** section (add/edit/remove items — name, quantity, notes — during play), a **Spell Target** lookup tile for casters (pick a target level, see the roll-under %), and per-skill **Use tracking** (strike circles as skills are used)
- **GM Screen** — a coordination dashboard (opened from the Roster) showing every character's HP / Mana / Story Points with inline +/− adjusters and an **Open** link into full Play Mode. For cloud-synced characters it updates **live** — a player's HP/notes change on their own device appears on the GM's screen in real time.
- **Character Roster** — Save multiple characters to localStorage, load or delete them. The Review step's **Complete** button and the **Save to Roster** button both save here; Complete then opens the Roster. Each card has a **Copy play link** button that generates a TinyURL-shortened `#play=` link for that character. Saves degrade gracefully when browser storage is full: version history is trimmed first, the character itself is preserved, and the **Save to Roster** button warns you (with a prompt to export a JSON backup) if a write can't complete.
- **Player play links** — Opening a `#play=` link loads the character directly into Play Mode and auto-saves it to the player's local roster under a stable id derived from the link, so their HP/Mana/notes persist across refreshes (a refresh resumes the tracked copy rather than re-importing the link, so no duplicate roster entries are created). Full wizard access is available if they exit play mode.
- **Export** — JSON backup, self-contained HTML (print/PDF) with a **scan-to-play QR**, shareable URL (LZString-compressed; ~3,000 chars for a typical character). The QR uses the origin the sheet was exported from; for a cloud-synced character it encodes the short, live `#c=` link (always scannable, opens the live character), otherwise the self-contained embedded `#play=` link.
- **Back up / Restore all** — the Roster page can export the **entire roster** as one JSON file and restore it on any device or origin. **Restore** accepts multiple files at once and handles the roster-backup wrapper, a bare array, or individual character files — so it also bulk-imports separate `*-import.json` files in one action. Because `localStorage` is per-origin/per-browser, this is the portable cross-device backup (a server-backed store is a planned follow-up).
- **Session Notes** — Slide-in notes panel with per-character CRUD
- **Import** — Load any exported JSON file to restore a character on any device (validated against the schema on import; invalid files are rejected with a descriptive error)
- **Inventory** — visible in Play Mode, Step 9 Review, and the print/HTML export; supports free-text strings or structured objects (name, quantity, notes)
- **Custom archetype** — when "Custom (GM Defined)" is selected in Identity, an inline panel lets you name the archetype and toggle Powers/Magic on or off (with magic attribute selection). The custom name shows everywhere: Roster, Play Mode header, Review sheet.

---

## Running Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173/` (Vite picks the next free port if 5173 is taken).

```bash
npm run build   # production build → dist/
npm test        # Vitest unit tests
npm run lint    # ESLint (flat config, zero-warning gate)
```

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite 7 |
| Styling | CSS Modules (no Tailwind) |
| Validation | Zod 3 |
| Persistence | localStorage (no backend) |
| Tests | Vitest 2 (jsdom env) |
| Linting | ESLint 9 (flat config) |
| Deploy | GitHub Pages via GitHub Actions |

---

## Design System — Codex

The app uses the **Codex** design language: editorial-fantasy aesthetic with warm bronze accent, serif display typography, and a dark nightfall theme as default.

**Fonts** (Google Fonts):
- `Newsreader` — display headings, character names, large numerals
- `Spectral` — body text, labels, descriptions
- `JetBrains Mono` — overlines, ALL-CAPS section labels, buttons, stat abbreviations

**Theme tokens** live in `src/tokens.css` as CSS variables on `[data-theme="dark"]` / `[data-theme="light"]`. Components use `var(--token)` — never hardcoded hex values. Default theme is dark; persisted to `localStorage`.

**Status:** Full app ported — wizard (Steps 1–9), Play Mode, Roster/CharacterCard, and light/dark theme toggle all use Codex tokens. Theme toggle persists to localStorage; default is dark.

---

## Project Structure

```
src/
  components/
    steps/          # Step1Welcome … Step9Review, PlayMode
    CharacterCard, StepIndicator, WizardNav, NotesPanel, Toast, ErrorBoundary
  pages/
    RosterPage
  hooks/
    useAutoSave, useCharacterManagement, usePlayMode, useNotesPanel, useToast, useTheme
  utils/
    characterSchema.js    # Zod schema + safeParseCharacter
    characterDerived.js   # HP, Mana, Defense, XP auto-calculations
    defaultCharacter.js   # createDefaultCharacter()
    rosterStorage.js      # localStorage CRUD + version history
    urlState.js           # btoa/atob URL encoding
    spellTarget.js        # 20×20 spell target lookup
    generateCharacterHTML.js  # standalone HTML export
    validation.js         # per-step validation rules
  data/
    races.json, archetypes.json, armorTypes.json, xpTable.json, spellTarget.json
```

---

## Game System Notes (Sidherun PHB 2.8.2026)

- **HP** = `BASE(raceType × size × age) + round((STR + END) / 2) + CON`
- **Mana** = primary magic attribute total (Thaumaturgy, Enlightenment, or Wisdom depending on archetype)
- **Defense** = base (50 typical / 0 others) + attribute + shield + skill bonus + misc
- **Magic Defense** = casting attribute (Thaumaturgy, Enlightenment, or Wisdom depending on archetype) + bonuses; non-magic characters fall back to `(THA + EN) / 2`
- **Psychic Defense** = INT + bonuses
- **Spell Target** = 20×20 Spell Matrix lookup (caster level vs target level) + the caster's relevant magic attribute, capped at 95% (PHB 2.8.2026). The attribute is always added; the GM applies any difficulty modifier and the target's Spell/Psychic Defense at the table.
- **Skills** — free-form, 30pt budget, max 15 per skill, specialty flag for exceptional skills, and **Use tracking** — 10 circles per skill (PHB "Impact of Skills"); strike one each time the skill is used in a session. Editable in the Skills step and Play Mode, and printed on the HTML/PDF sheet for hand-tracking.
- **Story Points** — default 2 per character

---

## Importing a Character

On the Welcome screen, click **Import JSON** and choose a previously exported character `.json` file. The data is validated against the Zod schema on import (and on share-link load) — malformed or wrong-shape files are rejected with an error toast rather than silently loading defaults.

### GM workflow: Excel → JSON

Character sheets maintained in the companion `sidherun` repo as `.xlsx` files can be converted to import-ready JSON by Claude. Completed characters are saved as `[firstname-lastname]-import.json` in that repo. Current characters:

| File | Character | Archetype | Level |
|---|---|---|---|
| `dulu-breac-import.json` | Dulu Breac | Druid | 2 |
| `claude-marin-import.json` | Claude Marin | Worldly | 1 |
| `evie-cress-import.json` | Evie (Evelyn) Cress | Wizard | 3 |
| `uri-krupkin-import.json` | Uri Krupkin | Priest | 3 |

To add a new character: provide the `.xlsx` (or photo of the character sheet) and Claude will produce a valid import JSON following the schema in `src/utils/characterSchema.js`.

To add a new archetype: add an entry to `src/data/archetypes.json` with `id`, `name`, `hasPowers`, `hasMagic`, and `magicAttribute`. The wizard automatically shows/hides the Powers and Magic steps based on these flags.

---

## Cloud sync (optional)

By default the app is localStorage-only (per browser/device). An optional Supabase
backend (epic #71) makes a character a **shared, live source of truth**: the GM
pushes the roster to the cloud, shares a per-character **live link**
(`#c=<id>~<token>`), and a player's HP/notes edits sync back and appear on the
GM's screen in real time. It stays **local-first** — localStorage is the instant
store; the cloud syncs in the background and the app keeps working offline.

- **Off by default.** Enabled only when `VITE_CLOUD_SYNC=on` and the Supabase keys
  are present (see `.env.example` and `supabase/README.md`). With the flag off the
  cloud code is inert and the UI is hidden.
- **Security.** The `characters` table is sealed by RLS; all access is via
  token-gated RPCs. The anon/publishable key is public by design. A per-character
  **capability token** lives in the link; a per-GM **key** (localStorage) owns the
  roster — no accounts. The GM key + cloud map are included in the **Back up all**
  file, so cloud access survives a browser wipe. **Reset link** rotates a token to
  revoke a shared link.
- **Setup & cutover:** create a project, apply `supabase/migrations/0001_init.sql`,
  set the three `VITE_*` repo Variables; flip `VITE_CLOUD_SYNC=on` to go live.

## Deploying

Push to `main` — GitHub Actions runs `npm run lint`, `npm test`, and `npm run build`, then deploys `dist/` to GitHub Pages automatically. A lint error or failing test blocks the deploy.

GitHub Pages must be set to source **GitHub Actions** in repo Settings → Pages.

The site is served from the custom domain **character-builder.sidherun.com** (root path), so `vite.config.js` uses `base: '/'`. `public/CNAME` pins the domain so each Actions deploy preserves it. After the TLS cert provisions, enable **Enforce HTTPS** in Settings → Pages. ID generation degrades gracefully on a non-secure context (`src/utils/uuid.js` falls back from `crypto.randomUUID()` to `getRandomValues`), but the **Copy play link / Copy share URL** buttons use the Clipboard API, which still requires HTTPS — so HTTPS is the supported configuration.
