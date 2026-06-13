# Sidherun Character Builder

A browser-based character creation tool for the **Sidherun** tabletop RPG. Build, track, and play your characters — no account or backend required.

**Live:** https://sidherun.github.io/sidherun-character-builder/

---

## Features

- **9-step wizard** — Identity → Attributes → Combat → Powers → Magic → Skills → Resources → Review
- **Auto-calculated stats** — HP, Mana, Defense, and Spell Target table update automatically from your attributes
- **Play Mode** — Live HP/Mana/Story Points tracking with quick-adjust buttons
- **Character Roster** — Save multiple characters to localStorage, load or delete them
- **Export** — JSON backup, self-contained HTML (print/PDF), shareable compressed URL
- **Session Notes** — Slide-in notes panel with per-character CRUD
- **Import** — Paste any exported JSON to restore a character on any device

---

## Running Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5174/sidherun-character-builder/`

```bash
npm run build   # production build → dist/
npm test        # Vitest unit tests
```

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite 7 |
| Styling | CSS Modules (no Tailwind) |
| Validation | Zod 3 |
| Persistence | localStorage (no backend) |
| Tests | Vitest 2 |
| Deploy | GitHub Pages via GitHub Actions |

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
    useAutoSave, useCharacterManagement, usePlayMode, useNotesPanel, useToast
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
- **Magic Defense** = `(THA + EN) / 2` + bonuses
- **Psychic Defense** = INT + bonuses
- **Spell Target** = 20×20 table lookup (caster level vs target level) + magic attribute; capped at 95%; no attribute bonus if base < 25
- **Skills** — free-form, 30pt budget, max 15 per skill, specialty flag for exceptional skills
- **Story Points** — default 2 per character

---

## Importing a Character

On the Welcome screen, click **Import JSON** and paste a previously exported character JSON. The schema is validated on import — invalid files are rejected gracefully.

A sample character (Dulu Breac, Human Druid Level 2) is included in the repo root at `dulu-breac-import.json` for testing.

---

## Deploying

Push to `main` — GitHub Actions runs `npm run build` and deploys `dist/` to GitHub Pages automatically.

GitHub Pages must be set to source **GitHub Actions** in repo Settings → Pages.
