# Sidherun Character Builder

A browser-based companion for the **Sidherun** tabletop RPG — build characters in a guided wizard, run them live in Play Mode, and coordinate the table from the GM Screen. Supports per-player and per-table account permissions to enable players and GMs to enjoy Sidherun.

**Live:** https://character-builder.sidherun.com/

---

## Features

- **Two modes — build vs. manage.** *Creating* a character uses the guided **9-step wizard** (Welcome → Identity → Attributes → Combat → Powers → Magic → Skills → Resources → Review; Powers/Magic appear only for archetypes that use them). A **name is required** to advance past Identity or Complete — no more silent "Unnamed Character" saves (#218). *An existing* character opens as a **character sheet** (no step bar): a scrollable, mobile-first read view (single column in portrait, two columns in landscape) where each section has a **✎ Edit** that opens just that section's editor in a focused `‹ Done` screen (the sheet reuses the wizard's step components as editors), plus inline Inventory editing on the sheet. **Every section is add/editable after creation, including from an empty state** (#178) — Skills, Weapons, Powers, Crafts each show a **+ Add** control when empty instead of being hidden, so a photo-import that missed a section is never a dead-end. **Identity** (race, archetype, level, powers/magic flags) is now editable from the sheet too (needed for in-game changes and leveling). Finishing the wizard (**Complete**) lands you on the sheet. The mode is driven by `App.jsx` (`mode` + `editSection`); the sheet reuses the wizard's step components as section editors.
- **First-character guide** — an onboarding layer for brand-new players: a per-step guide card in the creation wizard explains what each step means in Sidherun (archetypes as "healthy guardrails", the 10-core/2-social attribute split with the PHB's average-15 guideline, skill pool/cap numbers imported live from `skillPoints.js`, story-point spends, the match-or-beat vs roll-under conventions). **Every claim is grounded in the golden pages** and each card carries its PHB chapter citation. Auto-enabled for first-time visitors (empty roster), dismissible per card, and re-enterable anytime via the **💡 Guide** toggle in the wizard header (persisted in localStorage; `src/utils/onboarding.js`, `src/data/onboardingTips.jsx`, `src/components/OnboardingTip.jsx`).
- **Auto-calculated stats** — HP, Mana, Defense, and Spell Target table update automatically from your attributes
- **Play Mode** — Live HP/Mana/Story Points tracking with quick-adjust buttons, armor that absorbs up to its soak value per hit, and attributes/powers/magic at a glance. **Every attribute tile is a roll button** for a bare `d100 + derived attribute` check (#238), and **Roll initiative** broadcasts an explicit `d10 + AGI` result that can populate an active GM encounter automatically (#292). After a non-fumble weapon attack, a one-tap **Damage** action rolls the weapon's structured dice + flat bonus; exploded melee attacks add full Strength once per additional crit roll, and the result broadcasts to the GM feed (#241). Active GM-set conditions appear as high-visibility chips in the player header, including an optional signed modifier; they are informational and do not alter roll math (#240). It also includes an **editable Inventory** section (add/edit/remove items — name, quantity, notes — during play), **in-play section editing** — each of Weapons / Skills / Powers / Crafts has a **✎** that opens the real section editor in an overlay so you can add a looted weapon or tweak a skill **without leaving Play Mode** (the HP/roll state stays put); empty sections stay reachable (#180), a **Spell Target** lookup tile for casters (pick a target level, see the roll-under %), a **Cast button on every Magic Craft** (#237) — rolls the zone-aware roll-under check using that craft's own casting value (e.g. Arcane casts with INT, Awakened Arcane with THA) vs the tile's target level, resolves Success/Miss in the roll banner and broadcasts to the roll feed; an **interim per-cast Mana cost field** deducts the entered cost on every cast (success or fail) until the mana-pricing ruling lands (#258 tracks the replacement) — the banner records the deduction and the Mana stepper refunds — and per-skill **Use tracking** (strike circles as skills are used). A character at **0 HP is flagged "Down"** (danger border + badge, announced to screen readers) so a downed PC isn't missed, and the sheet reflows to a single column on phones with larger quick-adjust chips (#217/#218)
- **GM Screen** — a coordination dashboard (opened from the Roster) showing every character's HP / Mana / Story Points with inline controls and an **Open** link into full Play Mode. HP supports −5/−3/−1/+1/+3/+5 quick adjustments plus a numeric **Damage / Heal** entry (Enter applies damage), so a 13-point hit is one submission; rapid changes derive from the latest in-memory value, preventing batched clicks from collapsing into one (#236). A GM can add a free-text **condition chip** with an optional numeric modifier from each character card, remove it in one tap, or clear every visible character's conditions after a rest; the chips sync immediately to player Play Mode and remain informational in v1 (#240). The GM can set or clear the current roll difficulty from the **50 / 75 / 100 / 125 / 150** ladder; each incoming non-spell roll captures that target and the feed marks it Pass/Fail, while a cleared target returns new rolls to GM adjudication (#238). **Encounter Mode** seeds the currently visible table into a session-local combat tracker with manual or d10+AGI initiative, automatic descending order, a current-turn marker, wraparound Next Turn, and temporary NPCs carrying HP, defense, armor-per-blow, and a depleting armor pool; while active, a matched player **Roll initiative** payload replaces that PC's initiative and re-sorts immediately, while ordinary rolls and roster IDs outside the encounter are ignored (#292). It survives refreshes in the same browser session and never writes NPCs into the roster (#239). A **table filter** (**Show:** a dropdown of the GM's named tables, each with its member count) collapses the grid to a chosen table's characters; the selection persists in localStorage across reloads, "All characters" resets, the **Live Rolls** feed scopes to that table, and a stale selection (table deleted) falls back to all. For cloud-synced characters it updates **live** — a player's HP/Mana change *and* structural edits (inventory, skills, renamed items) on their own device propagate to the GM in real time — and a **Live Rolls** feed streams every player's dice rolls as they happen — including spell casts (#237), labeled with the craft and target level and resolved Success/Miss. (Live counters and conditions broadcast their new value directly; structural edits broadcast a payload-less nudge and the viewer refetches the fresh row, so it can't clobber a concurrent change.) The GM's **Open** action also refetches the freshest cloud copy before opening, so a player's just-made structural edit is there without a page refresh even if the live nudge is missed. Live-while-watching propagation of structural edits is verified working on two tabs. The grid distinguishes **loading / load-error (with Retry) / genuinely-empty**, so a still-loading or failed fetch never masquerades as an empty campaign (#218).
- **Autosave** — once a character is in the roster, edits persist automatically (~1.5 s after you stop typing; a **Saving… / Saved ✓** indicator shows status, and any pending save is flushed if you navigate away). A **brand-new** character is only added to the roster when you finish the wizard and click **Complete** at the Review step — a banner reminds you it isn't saved yet on the steps before Review.
- **Character Roster** — Save multiple characters to localStorage, load or delete them. **Sort by** character name (default), archetype, or player name (all A→Z); characters with no player assigned sort below a divider in every mode. The Review step's **Complete** button and the **Save to Roster** button both save here; Complete then opens the Roster. Each card keeps **Load** as its primary button and collapses the secondary actions (**Copy play link**, plus cloud **Copy live link** / **Reset link** when synced, and **Delete**) into a **⋯ "more options" menu** in the card's top-right corner — closable with Escape or an outside click. **Delete** is a two-step guard: it opens a confirmation naming the character (*"Delete {name}? This can't be undone."*) and only removes it on explicit confirm, so a single stray tap can't wipe a hand-imported sheet. Copy play link generates a TinyURL-shortened `#play=` link for that character. Saves degrade gracefully when browser storage is full: version history is trimmed first, the character itself is preserved, and the **Save to Roster** button warns you (with a prompt to export a JSON backup) if a write can't complete.
- **Spell-check suggestions** — free-text **skill** and **inventory/item** names get a lightweight, non-blocking *"Did you mean **X**?"* hint (`utils/spellcheck.js`): a curated dictionary seeded from the real roster's terms (the motivating typo "Seamonship" → **Seamanship**) plus common RPG terms, matched by Levenshtein edit distance (length-scaled, so short entries and homebrew/in-world names like "Bartuka Rolls" aren't flagged). One-tap **accept** rewrites the field; **Keep** records the term in a per-character dictionary (`_dictionary`) so it stops being suggested. Nothing is ever auto-corrected. Wired into the Skills editor and the inline Inventory editors (sheet + Play Mode).
- **Leveling** — a **⬆ Level Up** action on the character sheet (always available at the GM's discretion; a green dot cues when XP has crossed the level's threshold from `xpTable.json`). It opens a summary — *Level N → N+1, +X skill points (pool grows P→P')* — and on confirm bumps the level, refreshes the XP threshold, and **snapshots a per-level skill-point baseline** before dropping you into the Skills editor to spend the new points (it shows **X available**). Leveling in Sidherun is deliberately light: only the **skill-point pool** grows by formula (`utils/leveling.js` + `skillPoints.js`); **HP is static** ("only raised by raising Attributes"), Mana is attribute-driven, and attributes/powers are edited by hand — so the flow leaves them (and the use-circles, which are a justification aid) alone. The baseline lets the guardrail enforce the **per-level add cap** (e.g. +10/skill at L3) on top of the cumulative cap, and an over-cap allocation flags **over budget** on the sheet, roster card, and GM screen (warn, not block).
- **Tables** — the GM can group characters into named, reusable **tables** (e.g. "Thursday Table", "Campaign A") and filter the GM Screen to one. A **Tables** button on the roster opens a panel to create / rename / delete tables (with member counts); each roster card's **⋯ menu** has a checkbox per table for many-to-many membership, and member tables show as chips on the card. Both membership (`tableIds`) **and the table names** (`_tableNames`) ride each character's synced blob, so a signed-in GM's tables follow them **across devices** — on a fresh device the registry is reconstructed by `deriveRegistry()` from the loaded characters (renames propagate onto every member's blob), and the GM-side localStorage registry (also carried in the **Back up / Restore** file) is merged on top for names + empty tables (#176). A table whose members were all assigned before `_tableNames` existed shows as **"Untitled table"** (never a raw id) until renamed — renaming stamps the name onto every member so it's recovered everywhere. Deleting a table keeps the characters, just removing them (and the name) from it.
- **Live-sync safeguards** — signed-in characters with neither a cloud owner nor a player assignment are visibly flagged on the roster card and in Play Mode instead of silently dropping live changes. The Supabase Realtime client permits 20 outbound events/second (up from 5), enough for the 14-character table with headroom; database writes remain authoritative and focus reconciliation still repairs any missed broadcast (#200).
- **Player play links** — Opening a `#play=` link loads the character directly into Play Mode and auto-saves it to the player's local roster under a stable id derived from the link, so their HP/Mana/notes persist across refreshes (a refresh resumes the tracked copy rather than re-importing the link, so no duplicate roster entries are created). Full wizard access is available if they exit play mode.
- **Export** — JSON backup, self-contained HTML (print/PDF) with a **scan-to-play QR**, shareable URL (LZString-compressed; ~3,000 chars for a typical character). The QR uses the origin the sheet was exported from; for a cloud-synced character it encodes the short, live `#c=` link (always scannable, opens the live character), otherwise the self-contained embedded `#play=` link.
- **Scoped roster printing** — **Print…** can produce one sheet per page for the full roster or any named table, with the exact character count confirmed before a printable tab opens. Each character card's ⋯ menu also offers **Print sheet**. A blocked popup surfaces a visible allow-popups-and-retry message instead of failing silently (#242).
- **Back up / Restore all** — the Roster page can export the **entire roster** as one JSON file and restore it on any device or origin. **Restore** accepts multiple files at once and handles the roster-backup wrapper, a bare array, or individual character files — so it also bulk-imports separate `*-import.json` files in one action. Because `localStorage` is per-origin/per-browser, this is the portable cross-device backup for guest-mode data (signed-in characters live in the cloud store shipped by epic #109).
- **Session Notes** — Slide-in notes panel with per-character CRUD (a note requires a title to save; the panel is exposed to screen readers as a modal dialog)
- **Import** — Load any exported JSON file to restore a character on any device (validated against the schema on import; invalid files are rejected with a descriptive error)
- **Inventory** — editable in Play Mode and on the character sheet (add/edit/remove; **+ Add item** drops the cursor straight into the new item's Name field, and pressing **Enter in the notes field** commits the item, opens a fresh row, and focuses its Name field — so several items can be entered keyboard-only, Item → Tab → Notes → Enter → next Item (#185)); also shown in Step 9 Review and the print/HTML export. Supports free-text strings or structured objects (name, quantity, notes)
- **Keyboard-only repeatable-row entry** — the "**+ Add** focuses the new row's first field, **Enter in the row's last field** commits and opens the next focused row" flow is shared across **Inventory**, **Weapons** (Enter in Damage/notes), and **Skills** (Enter in the temp-mod field), via one hook (`hooks/useFocusOnAdd.js`) so the three sections behave identically (#185, #189)
- **Custom archetype** — when "Custom (GM Defined)" is selected in Identity, an inline panel lets you name the archetype and toggle Powers/Magic on or off (with magic attribute selection). The custom name shows everywhere: Roster, Play Mode header, Review sheet.

---

## Running Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173/` (Vite picks the next free port if 5173 is taken).

```bash
npm run build       # production build → dist/
npm run preview     # serve the production build locally
npm test            # Vitest unit tests
npm run test:watch  # Vitest in watch mode
npm run lint        # ESLint (flat config, zero-warning gate)
```

`dev` and `build` first copy the 3D dice engine's assets into `public/` (`predev`/`prebuild` → `scripts/copy-dice-assets.mjs`) — automatic, no setup needed.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite 6 |
| Styling | CSS Modules (no Tailwind) |
| Validation | Zod 3 |
| Persistence | Supabase (Postgres + Realtime + magic-link auth) — cloud-first source of truth when signed in; localStorage as offline cache and standalone guest store |
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

**Theme tokens** live in `src/tokens.css` as CSS variables on `[data-theme="dark"]` / `[data-theme="light"]`. Components use `var(--token)` only — never a hardcoded hex, never a local palette re-declaration (the one exception is `generateCharacterHTML.js`, a self-contained printable export). The ink scale is an *emphasis* ramp: `--ink-900` (strongest text) → `--ink-300` (faintest), monotonic in both themes. Status/resource colors: `--danger`, `--story`, `--bronze`, `--hp`, `--mana`, `--armor`. The legacy `--inkNNN` aliases and `--gold-*/--crimson/--parchment` palette have been fully removed. Default theme is dark; persisted to `localStorage`. See `CODEX-MIGRATION.md` for the historical map.

**Status:** Full app ported — wizard (Steps 1–9), Play Mode, Roster/CharacterCard, and light/dark theme toggle all use Codex tokens. Theme toggle persists to localStorage; default is dark.

---

## Project Structure

```
src/
  Router.jsx          # hash routes + auth/role gating (login, roster, gm, admin, play, share)
  App.jsx             # wizard / sheet / Play Mode orchestration (mode + editSection)
  auth/
    AuthProvider.jsx, useAuth.js, authErrors.js   # magic-link session + roles (epic #109)
  components/
    steps/          # Step1Welcome … Step9Review, PlayMode
    CharacterCard, StepIndicator, WizardNav, NotesPanel, Toast, ErrorBoundary, NumberInput,
    CloudStatus, SyncBanner, DiceOverlay, LevelUpDialog, OnboardingTip, SpellSuggest, TablesManager
  pages/
    RosterPage, GMScreen, LoginPage, AdminRoles
  hooks/
    useAutoSave, useCharacterManagement, usePlayMode, useNotesPanel, useToast, useTheme,
    useCloudSync, useRealtimeCharacter, useCloudStatus, useFocusOnAdd
  utils/
    characterSchema.js    # Zod schema + safeParseCharacter (incl. legacy migrations)
    characterDerived.js   # HP, Mana, Defense, XP, power totals
    defaultCharacter.js   # createDefaultCharacter()
    characterRepo.js      # authed cloud-first repository (Supabase = source of truth)
    rosterStorage.js      # localStorage CRUD + version history
    rosterBackup.js       # whole-roster export / restore
    rosterSort.js         # roster sort + no-player partition
    urlState.js           # LZString #share=/#play= + #c= cloud links
    spellTarget.js        # Spell Matrix lookup (caster vs target)
    dice.js               # d100 core: rollTotal (skills/attacks) + resolveUnder (spells)
    diceNotation.js, diceStage.js, diceSettings.js, diceSound.js  # 3D dice: landing values, tray bounds, prefs, sfx
    rollActions.js        # binds dice to the engine: rollAttribute / rollSkill / rollAttack / rollSpell
    weaponDamage.js       # structured weapon damage, legacy parsing, display labels
    rollFormat.js         # pure roll-result banner formatting
    rollFeed.js           # shared live roll feed (broadcast + subscribe)
    leveling.js           # level-up flow math + per-level skill-point baseline
    skillPoints.js        # skill pool / cap tables (PHB pp.14-15)
    spellcheck.js         # "Did you mean…?" skill & item name suggestions
    tables.js             # GM tables registry (deriveRegistry, membership)
    onboarding.js         # first-character guide state
    cloudStatus.js        # sync-health state machine behind the badge/banner
    gmAdjust.js           # GM Screen counter clamps
    uuid.js               # secure-context-safe id generation
    numberInput.js        # numeric input coercion
    generateCharacterHTML.js  # standalone HTML export (with scan-to-play QR)
    cloudSync.js          # guest-plane Supabase push / hydrate / realtime + cloud links
    supabaseClient.js     # Supabase client + cloudEnabled/authEnabled flags
    validation.js         # per-step validation rules
  data/
    races.json, archetypes.json, armorTypes.json, xpTable.json, onboardingTips.jsx
    (spell matrix: the engine imports rules/data/spell-matrix.json directly — #245)
rules/                # golden pages: PHB 2.8 chapters 00–20 + rules/data/*.json + FIDELITY-NOTES.md
languages/            # constructed-language references (quindel.md — Quin'dhel naming primitives)
players/              # player-safe lore derived from canon (frontmatter data contract — #297)
scripts/
  copy-dice-assets.mjs  # predev/prebuild: copies the 3D dice engine's assets into public/
supabase/
  migrations/0001_init.sql   # sealed characters table + capability-token RPCs
  migrations/0002_auth_roles.sql        # authenticated plane: roles + RLS
  migrations/0003_updated_at_trigger.sql # updated_at bump on every write (#253)
  README.md                  # setup, keys, smoke test, security model
public/               # favicons + webmanifest, CNAME (custom domain), sfx/ (dice sounds)
```

---

## Game System Notes (Sidherun PHB 2.8.2026)

> **Canonical rules now live in [`rules/`](rules/README.md)** ("golden pages") — the full PHB 2.8 as Markdown chapters plus machine-readable tables in `rules/data/*.json` (spell matrix, XP, movement, armor, difficulty ladder, combat-defense modifiers, constitution modification, skill pool allocation, skill usage bonus, specialty pool). Constructed-language references live in [`languages/`](languages/README.md) — `quindel.md` is the Quin'dhel naming primitives (#273/#274). Player-safe lore derived from canon lives in [`players/`](players/README.md), which also defines the frontmatter data contract for the app's lore surface (#297). The Word doc is retired — all PHB copies outside this repo are deprecated; rule changes go through PRs against `rules/`. Known source contradictions are logged in `rules/FIDELITY-NOTES.md` — five have been **resolved by ruling**: crit = natural 96-00 only; rating-8 armor max durability 160; XP L15 = 150001; red-zone matrix cells add no attribute (all 2026-07-09); and **attack bonus is non-stacking** — weapon skill OR governing attribute, never both, misc bonuses still add (§1.13, 2026-07-11, found by the onboarding rules audit). See FIDELITY-NOTES §7.

- **Races** — the playable race list lives in `src/data/races.json`. 2026-07-18: **Eledhel → Quin'dhel** (`quindhel`) and **Glamredhel → Gla'mdroi** (`glamdroi`), part of the setting-wide removal of names borrowed from published fantasy IP; the Southern Shores rules chapter now uses **Starquay** (was Stardock) and the world's mountain range is formally **the Kaelorun Range** (was Spine of the World, which survives in narrative text as local parlance). The Zod schema migrates stored/imported characters on load — exact legacy ids plus free-text hybrids like `"Human / Eledhel"` — so existing rosters, play links, and cloud saves resolve unchanged.
- **HP** = `BASE(raceType × size × age) + round((STR + END) / 2) + CON`
- **Mana** = primary magic attribute total (Thaumaturgy, Enlightenment, or Wisdom depending on archetype)
- **Defense** = base (50 typical / 0 others) + attribute + shield + skill bonus + misc
- **Magic Defense** = casting attribute (Thaumaturgy, Enlightenment, or Wisdom depending on archetype) + bonuses; non-magic characters fall back to `(THA + EN) / 2`
- **Psychic Defense** = INT + bonuses
- **Spell Target** = 20×20 Spell Matrix lookup (caster level vs target level) + the caster's relevant magic attribute, capped at 95% — **except red-zone cells** (target 2+ levels above caster at low levels; see `rules/data/spell-matrix.json` color zones), where the attribute is **not** added and the raw base value is the target (ruled 2026-07-09, `rules/FIDELITY-NOTES.md` §1.2). The GM applies any difficulty modifier and the target's Spell/Psychic Defense at the table. The engine implements this ruling (#245): `utils/spellTarget.js` imports `rules/data/spell-matrix.json` (base grid + color zones) directly, so the app and the book can't drift; the sheet calculator and Play-Mode lookup tile color by zone and label red-zone results "attribute not added", and a full-grid test walks all 400 cells.
- **Skills** — free-form, with a **level-aware point budget** (PHB pp.14-15, single source of truth in `utils/skillPoints.js`): cumulative pool 30/50/70/80/90/100/110/120/125/130 for levels 1–10 (+5/level after), per-skill cumulative cap 15/15/10…→ **40 by level 3**. The Skills editor shows "**X / Y points used**"; the budget is **warn-not-block** (a GM can override a cap), and an **over-budget flag surfaces to the GM** on the character sheet, the roster card, and the GM-screen row (`skillBudget()`), so an over-allocated character is visible without opening the sheet. The manage sheet's Skills-header badge also cues **under**-spend — `50/70 pts · +20 unspent` — as a quiet informational nudge (same muted style, no warning); Play Mode stays clean of budget chrome. Combat is pooled with skills in the rulebook but excluded from this v1 pool (weapons stored separately). Level-up grows the pool (see **Leveling**); the PHB usage-bonus isn't auto-computed — the use-circles are a **justification aid** for allocating points, not a mechanical bonus. Specialty flag for exceptional skills, and **Use tracking** — 5 circles per skill (`usePips`); strike one each time the skill is used in a session. Editable in the Skills step and Play Mode, and printed on the HTML/PDF sheet for hand-tracking.
- **Story Points** — default 2 per character
- **Dice rolls** (`dice.js` + `rollActions.js`) — d100 checks plus structured weapon damage:
  - **Attributes, skills & attacks** roll `d100 + a single modifier` and **display the total**; the player reads it aloud and the GM adjudicates against difficulty/defense verbally unless the GM Screen has captured an optional difficulty target for the incoming roll. The attack modifier is the weapon's **skill _or_ attribute value — non-stacking**, governed by an explicit **`usesSkill`** flag on the weapon (a per-weapon **"Uses skill"** checkbox in the Combat editor; entering a skill bonus auto-hints it on). `weaponModifier()` returns the skill value when `usesSkill` is set — so a legitimate skill of **0** can still win over the attribute — otherwise the attribute; it never sums the two. Legacy weapons saved before the flag fall back to the old "nonzero skill wins" inference (the Zod schema migrates stored/imported characters, and the editor checkbox mirrors that effective value). The same non-stacking modifier is shown in Play Mode, the Review sheet, the Combat editor, the printable HTML/PDF sheet, and carried through compact play-URLs (#142).
    - **Exploding:** a die over 95 (96–100) rolls again and adds — repeating for each new die over 95 — *before* the modifier. E.g. 97 → roll again → 40 → `137 + modifier`.
    - **Fumble:** a natural 1–5 shows the low roll and rolls one **unmodified fumble die**, announced to the GM who determines the fumble result. The check fails.
  - **Spells** roll **under** the computed Spell Target (`matrix + magic attribute`, cap 95) and the app resolves pass/fail.
  - **Weapon damage** is stored separately from flavor notes as dice (`NdS`), flat bonus, type, and an explicit melee/ranged flag. The known legacy descriptor forms (`1d8 slashing`, `Dmg = 8`, `base dmg 8`, `metal tip (6)`) migrate at schema, local-roster, authenticated-cloud, and compact-link boundaries; partially structured records fill only their missing fields, preserving explicit owner corrections. Range is never guessed from the attack attribute: only legacy text that explicitly says `ranged` or `thrown` migrates automatically, while ambiguous weapons receive a visible melee/ranged review prompt in the editor, Review sheet, and Play Mode. Missing/invalid damage amounts and missing types are also surfaced without guessing (#324). After an attack, the player taps **Damage** when the GM confirms the hit; melee crits add Strength for every additional natural-crit roll. Damage appears in the local banner and shared feed, and structured values print/export with the sheet (#241).
  - Rolls take an injectable `rng` (defaults to `Math.random`) so they are deterministic in tests.
  - **In Play Mode** each attribute tile, skill, and weapon has a one-tap roll affordance and the spell tile has a **Roll** button; results appear in a sticky banner at the top (the total to read aloud for attributes/skills/attacks, or Success/Miss for spells). Rolls are ephemeral — not saved. A roll in progress **disables the roll buttons until the dice settle**, so a repeat tap during the tumble can't fire or broadcast a duplicate to the shared feed (#222).
  - **3D dice animation + sound** — a tap tumbles physical percentile dice (a tens die 00–90 + a ones die 0–9) that land on the rolled number, in a **tray low on the screen** (the stage is bounded so dice don't scatter over the sheet) and clear a beat after they settle. Built on `@3d-dice/dice-box-threejs`, lazy-loaded on the first roll (its own bundle chunk, so app start is untouched); the exact landing value comes from `diceNotation.js`. **Sound** is our own layer, played through plain HTML5 `<audio>` (not Web Audio — on iOS a Web Audio context created outside a gesture stays suspended and is silenced by the ringer switch; an `<audio>` element played in the tap gesture unlocks reliably). The engine's own audio is iOS-fragile (hangs init), so it stays off. Real roll recordings in `public/sfx/` are **rotated per roll** so it doesn't sound identical every time — `roll.wav` (mixed offline from the engine's real dice-hit + felt samples) plus `roll-b.mp3` / `roll-c.mp3` (recorded RPG dice rolls, freesound community via Pixabay). Add more files to `ROLL_SRCS` in `diceSound.js` to widen the rotation; if none load, a synthesized rattle is the fallback. Header toggles for 🎲 animation and 🔊 sound (persisted); animation auto-off under `prefers-reduced-motion` — and a **global `prefers-reduced-motion` guard** (`index.css`) near-instant-ifies every CSS transition/animation app-wide too (#216). The result banner + shared feed are the source of truth, so a device that can't render still shows the number instantly. Each screen also sets its own **document title** (Roster / GM Screen / Play Mode / …) for tabs, history, and screen readers (#216), and the app has a proper **browser identity** (#198): a Cinzel "S" monogram favicon — bronze on the dark card plate — as a true-vector `favicon.svg` (the actual glyph outline, no local-font dependency), a multi-res `favicon.ico` (16/32/48, PNG-payload), `icon-32.png`, `apple-touch-icon.png` (180, full-bleed for iOS masking), and 192/512 PNGs wired through `site.webmanifest` + `theme-color`. Regeneration recipe: the icon is drawn by headless canvas from the tokens' `--bronze`/`--card` values; see the #198 close-out for the render script.
  - **Shared roll feed** — when cloud is on, every roll also broadcasts to a table-scoped realtime channel (`session:default`) and shows on the **GM Screen** as a live "Live Rolls" list (actor · roll · detail). Payloads carry the character's stable roster ID, so a filtered table matches the correct character even when names collide or are blank; legacy payloads without an ID retain name fallback (#173). The GM may select a 50/75/100/125/150 difficulty; each incoming total roll records the active target and displays Pass/Fail using Sidherun's match-or-beat rule. Clearing the target returns subsequent rolls to "GM adjudicates." Broadcast-only, no DB persistence. Single home-table channel for now; per-campaign channels are a backlog item.

---

## Importing a Character

On the Welcome screen, click **Import JSON** and choose a previously exported character `.json` file. The data is validated against the Zod schema on import (and on share-link load) — malformed or wrong-shape files are rejected with an error toast rather than silently loading defaults.

### GM workflow: Excel → JSON

Character sheets maintained in the companion `sidherun` repo as `.xlsx` files can be converted to import-ready JSON by Claude. Completed characters are saved as `[firstname-lastname]-import.json` in that repo. Example characters (the live roster is larger and now cloud-synced):

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

A small **sync status badge** (Play Mode + GM Screen headers) shows whether cloud
sync is healthy — **Live** / **Saving…** / **Sync error** / **Offline** — so a
failed push is never silent (`utils/cloudStatus.js` + `CloudStatus.jsx`). It
renders nothing in the localStorage-only build. On top of the badge, a
**prominent sync banner** (`SyncBanner.jsx`, bottom-fixed) appears on Play Mode
and the GM Screen whenever sync is **failing or offline**, and clears when it
recovers (#200) — so at the table a silent failure can't masquerade as "the
numbers are fine"; the GM knows to fix the connection or fall back to paper on
purpose. (`--danger`/`--bg` are light/dark inverses, so the bar stays legible in
both themes token-only.)

Guest-mode capability mappings are also validated on every explicit roster
push. If a character's token was rotated or its cloud row was deleted, a
background save reports a sync error and removes the dead mapping; the next
**Push roster to cloud** recreates the row and reports it as new instead of
silently claiming that an update succeeded (#252).

**Structural saves use optimistic concurrency** (authenticated plane): each
full-blob write guards on the row's `data_rev`, so if two devices edit the same
character at once the second doesn't silently clobber the first — the app
reloads the latest and tells the player, instead of losing an edit.

- **Off by default.** Enabled only when `VITE_CLOUD_SYNC=on` and the Supabase keys
  are present (see `.env.example` and `supabase/README.md`). With the flag off the
  cloud code is inert and the UI is hidden.
- **Security.** The `characters` table is sealed by RLS; all access is via
  token-gated RPCs. The anon/publishable key is public by design. A per-character
  **capability token** lives in the link; a per-GM **key** (localStorage) owns the
  roster — no accounts. The GM key is minted from `crypto.getRandomValues`
  (32 bytes / 256 bits of entropy), not a `Math.random`-backed UUID. The GM key +
  cloud map are included in the **Back up all** file, so cloud access survives a
  browser wipe. **Reset link** rotates a token to revoke a shared link.
- **Setup & cutover:** create a project, apply `supabase/migrations/0001_init.sql`,
  set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_CLOUD_SYNC=on` in the
  repo Variables to go live.

## Multi-user accounts & roles (optional)

Epic #109 adds a second, **authenticated** access plane on top of the guest one
above. With it on, each player signs in (passwordless **magic link**) and the
cloud — not localStorage — is the **source of truth** for character data
(localStorage is demoted to an offline cache). The original guest links keep
working unchanged, so game-day QR / printout scans still need no login.

- **Invite-only sign-in (#209).** The sign-in call passes `shouldCreateUser: false`
  (`AuthProvider.js`), so the app **never creates a new account** — an unknown
  email is refused with an invite-only message (`friendlyAuthError`) instead of
  silently registering a stranger; existing players sign in unchanged. **Enforce
  it at the source in Supabase:** Authentication → Sign In / Providers → **turn
  off "Allow new users to sign up"** (with it on, someone hitting the API directly
  could still self-register). **To add a new player** once sign-ups are off: an
  admin invites them via Supabase → Authentication → **Users → Add user / Invite**,
  they sign in once (creating their `profiles` row), then the admin sets their role
  in **Manage Roles** (#179).

- **Roles.** `player` reads/edits the characters they own or are assigned and
  ticks counters during play; `gm` views and administers **every** character in
  the campaign (HP/Mana/Story, plus assigning players); `admin` can change any
  data and any user's role.
- **Manage Roles (admin-only UI, #179).** An admin opens **Manage Roles** from the
  Roster (`#admin`, `pages/AdminRoles.jsx`) to see everyone who has signed in
  (`listPlayers()` → all `profiles`), search by display name/email, filter by
  role, edit a player's display name, and change a role via a dropdown — no SQL
  editor. Display names live in `profiles.display_name` (the app identity source
  of truth) and immediately feed existing assignment dropdowns. The writes are
  direct `profiles` updates (`setDisplayName()` / `setUserRole()`); the
  `profiles_admin_all` RLS policy + `guard_role_change` trigger permit it only for
  an admin, so a non-admin's call is rejected and surfaced inline. Guardrails:
  display names cannot be blank, failed name writes roll back, the route + entry
  link are admin-gated, demoting your own admin asks for confirmation, only
  signed-in users appear (profile created on first login), and a role change takes
  effect on the target user's next reload. No migration required — the policies
  from `0002_auth_roles.sql` already allow it (#313).
- **Two planes coexist.** Signed-in users get direct table access scoped by RLS
  policies on `auth.uid()` + role; anonymous guests still reach a character only
  through the sealed capability-token RPCs (`#c=`/`#play=`/`#share=`). Both
  `characters` and `profiles` grant DML to `authenticated` only and revoke
  `anon`'s default grant — `anon` is hard-sealed (a direct read returns
  `permission denied`, verified against the live project).
- **Who owns cloud writes.** For authenticated users `characterRepo` is the ONLY
  writer to the cloud; the legacy capability-token push (`useCloudSync` →
  `cloudSync.syncCharacter`) is gated off via `repoEnabled()`. This matters:
  otherwise the legacy push would send the stale localStorage character over the
  cloud row and overwrite authoritative data. localStorage is a non-authoritative
  cache only when signed in.
- **Continuous autosave (all fields).** Signed-in edits persist to the cloud on
  their own, split by plane so writes stay small: live counters via debounced
  `patchLive` (`live` column), and structural fields — inventory, notes, name,
  skills, attributes, etc. — via debounced `saveCharacterData` (`data` column),
  keyed on `cloudSync.dataSignature` so it fires only on real structural change.
  Two `useRef` signatures (`lastLiveSig`/`lastDataSig` in `App.jsx`) gate each
  plane and reset per opened character. A brand-new character is still first
  created on the explicit **Complete** (it has no cloud row to update yet).
  Each debounced push is also held in a ref (`liveFlushRef`/`dataFlushRef`) and
  **flushed when the tab is backgrounded, closed, or unmounts** (`visibilitychange`
  → hidden / `pagehide`), so the last HP/Mana/Story tick before you leave a screen
  isn't dropped with the pending timer (#196). Flushes are idempotent.
- **Save is dedup-safe against a stale `current` slot (#127).** When signed in,
  App still seeds the wizard from the localStorage `current` draft (cloud-first
  wizard load is deferred, #119). A draft that predates sign-in has a `_rosterId`
  but no `_ownerUserId`, so an explicit **Save** used to take the *create* branch
  and insert a duplicate cloud row. Two guards close this: (1) an authed-cutover
  effect in `App.jsx` stamps the matching cloud row's identity back onto the draft
  in place (preserving unsaved edits) so background sync re-engages, and (2)
  `characterRepo.upsertCharacter` — the single writer behind `persistToCloud` —
  keys create-vs-update on whether a cloud row *exists* for the `_rosterId`
  (RLS-scoped `getCharacter`), not on the `_ownerUserId` marker, and propagates a
  lookup error rather than falling through to create. A transient failure can
  never mint a duplicate. Both are no-ops when signed out.
- **Realtime (bidirectional).** Signed-in play syncs live counters through the
  cloud row (durable) plus a **Broadcast** nudge for instant delivery. Both the
  GM Screen and the player's Play Mode subscribe to the per-character channel
  `char:<id>` (`characterRepo.subscribeLive`), and both push their edits via
  `characterRepo.patchLive` (debounced) which writes the row *and* broadcasts the
  new counters. We use Broadcast rather than `postgres_changes` on purpose:
  postgres_changes must pass RLS on the realtime socket and silently fails to
  deliver to authenticated browsers, whereas Broadcast is plain pub/sub and just
  works — and it shares the channel name with the guest plane, so guest and
  authed viewers of the same character interoperate. App.jsx tracks a last-live
  signature so the push/receive effects don't echo into a loop.
  Because Broadcast is best-effort (a nudge can drop on weak wifi, the 5 ev/s
  cap, or a backgrounded peer), both Play Mode and the GM Screen also **reconcile
  on focus** (`visibilitychange`→visible / window `focus`): they re-read the
  authoritative cloud row(s) and self-heal a missed update (#196/#200). Play Mode
  guards this — it skips while a local edit is still pending (signature differs
  from last-synced) and only adopts a strictly newer row (`updated_at`), so it
  never clobbers an un-pushed local change; the GM Screen is a viewer and just
  re-fetches.
- **Off by default.** Enabled only when `VITE_AUTH=on` (which implies cloud) and
  the Supabase keys are present. With it off the app is the legacy single-user /
  guest build, byte-for-byte.
- **Setup:** apply `supabase/migrations/0002_auth_roles.sql` after `0001`, set
  `VITE_AUTH=on`, then sign in once and run the one-time seed/backfill SQL noted
  at the bottom of the migration (make yourself `admin`; adopt existing
  characters). See `supabase/README.md`. Then apply
  `0003_updated_at_trigger.sql` — a `moddatetime` trigger so **authed-plane
  writes bump `updated_at`** like the guest RPCs already do; without it, roster
  "Saved" dates go stale and newer-wins reconciliation can prefer an older
  cached copy over a fresh authed save (#253). Finally apply
  `0004_function_permissions.sql`: it removes Data API execution from internal
  and trigger-only functions, moves RLS helpers to an unexposed schema, makes
  authenticated live patching run under RLS, and locks down default function
  grants (#321). Run `supabase/verify_function_permissions.sql` afterward.
- **First-admin bootstrap:** a `guard_role_change()` trigger stops a signed-in
  non-admin from self-promoting. It is scoped to authenticated users
  (`auth.uid() is not null`), so the very first admin is seeded from a backend
  context — running `update public.profiles set role='admin' where email=…` in
  the **SQL Editor** (which has no `auth.uid()`) is allowed. After an admin
  exists, role changes go through an admin.
- **Surfaces:** `src/auth/*` (provider + `useAuth`), `src/pages/LoginPage.jsx`,
  `src/utils/characterRepo.js` (cloud-first repository), with role gating in
  `Router.jsx`, `RosterPage.jsx`, `GMScreen.jsx`, `CharacterCard.jsx`, and a
  `readOnly` mode in `PlayMode.jsx`.
- **Role helpers:** after migration 0004, `private.caller_role()` and
  `private.is_gm_or_admin()` support the RLS policies without being exposed as
  public REST RPCs. The seven guest capability-token functions intentionally
  remain callable by anonymous and authenticated browsers; Supabase Advisor
  warnings for those seven are expected while guest links remain supported.
- **Applying the migration:** paste `0002_auth_roles.sql` into the Supabase SQL
  Editor and **Run**. If the editor reports a syntax error on a line that looks
  correct, the paste may have dropped characters (some clipboard setups do this
  on large blocks) — clear the editor fully and re-paste, or apply the file via
  `psql` / the Management API to rule out paste corruption.

## Deploying

Push to `main` — GitHub Actions runs `npm run lint`, `npm test`, and `npm run build`, then deploys `dist/` to GitHub Pages automatically. A lint error or failing test blocks the deploy.

**Build-time env (repo → Settings → Secrets and variables → Actions → Variables).**
Vite embeds env vars at build time, so `deploy.yml` forwards each one the app
reads — anything not listed there ships unset. To run with auth + roles in
production, set the repo **Variables** (not Secrets; the publishable key is public
by design): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the `sb_publishable_…`
key), and `VITE_AUTH=on`. `VITE_AUTH=on` implies cloud, so `VITE_CLOUD_SYNC` is
optional. Unset `VITE_AUTH` (and redeploy) to fall back to the guest-only build.

GitHub Pages must be set to source **GitHub Actions** in repo Settings → Pages.

The site is served from the custom domain **character-builder.sidherun.com** (root path), so `vite.config.js` uses `base: '/'`. `public/CNAME` pins the domain so each Actions deploy preserves it. After the TLS cert provisions, enable **Enforce HTTPS** in Settings → Pages. ID generation degrades gracefully on a non-secure context (`src/utils/uuid.js` falls back from `crypto.randomUUID()` to `getRandomValues`), but the **Copy play link / Copy share URL** buttons use the Clipboard API, which still requires HTTPS — so HTTPS is the supported configuration.

## License & copyright

This repository contains two distinct works under two different terms:

- **Application source code** — MIT, see [`LICENSE`](LICENSE).
- **Sidherun game content** (the `rules/` Player's Handbook text, the `languages/`
  constructed-language references, the `players/` player-facing lore docs,
  game data and descriptions under `src/data/`,
  the Sidherun name, and the Southern Shores setting) — **all rights reserved**,
  with permission for personal at-table use; see [`COPYRIGHT.md`](COPYRIGHT.md).
