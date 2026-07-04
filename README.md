# Sidherun Character Builder

A browser-based character creation tool for the **Sidherun** tabletop RPG. Build, track, and play your characters — local-first and account-free, with an optional cloud-sync layer for shared, live play.

**Live:** https://character-builder.sidherun.com/

---

## Features

- **Two modes — build vs. manage.** *Creating* a character uses the guided **9-step wizard** (Welcome → Identity → Attributes → Combat → Powers → Magic → Skills → Resources → Review; Powers/Magic appear only for archetypes that use them). *An existing* character opens as a **character sheet** (no step bar): a scrollable, mobile-first read view (single column in portrait, two columns in landscape) where each section has a **✎ Edit** that opens just that section's editor in a focused `‹ Done` screen, plus inline Inventory editing on the sheet. Identity (name/race/archetype) is set in the builder and read-only on the sheet. Finishing the wizard (**Complete**) lands you on the sheet. The mode is driven by `App.jsx` (`mode` + `editSection`); the sheet reuses the wizard's step components as section editors.
- **Auto-calculated stats** — HP, Mana, Defense, and Spell Target table update automatically from your attributes
- **Play Mode** — Live HP/Mana/Story Points tracking with quick-adjust buttons, armor that absorbs up to its soak value per hit, attributes/powers/magic at a glance, an **editable Inventory** section (add/edit/remove items — name, quantity, notes — during play), a **Spell Target** lookup tile for casters (pick a target level, see the roll-under %), and per-skill **Use tracking** (strike circles as skills are used)
- **GM Screen** — a coordination dashboard (opened from the Roster) showing every character's HP / Mana / Story Points with inline +/− adjusters and an **Open** link into full Play Mode. For cloud-synced characters it updates **live** — a player's HP/Mana change *and* structural edits (inventory, skills, renamed items) on their own device propagate to the GM in real time — and a **Live Rolls** feed streams every player's dice rolls as they happen. (Live counters broadcast their new value directly; structural edits broadcast a payload-less nudge and the viewer refetches the fresh row, so it can't clobber a concurrent change.) The GM's **Open** action also refetches the freshest cloud copy before opening, so a player's just-made structural edit is there without a page refresh even if the live nudge is missed.
- **Autosave** — once a character is in the roster, edits persist automatically (~1.5 s after you stop typing; a **Saving… / Saved ✓** indicator shows status, and any pending save is flushed if you navigate away). A **brand-new** character is only added to the roster when you finish the wizard and click **Complete** at the Review step — a banner reminds you it isn't saved yet on the steps before Review.
- **Character Roster** — Save multiple characters to localStorage, load or delete them. **Sort by** character name (default), archetype, or player name (all A→Z); characters with no player assigned sort below a divider in every mode. The Review step's **Complete** button and the **Save to Roster** button both save here; Complete then opens the Roster. Each card has a **Copy play link** button that generates a TinyURL-shortened `#play=` link for that character. Saves degrade gracefully when browser storage is full: version history is trimmed first, the character itself is preserved, and the **Save to Roster** button warns you (with a prompt to export a JSON backup) if a write can't complete.
- **Player play links** — Opening a `#play=` link loads the character directly into Play Mode and auto-saves it to the player's local roster under a stable id derived from the link, so their HP/Mana/notes persist across refreshes (a refresh resumes the tracked copy rather than re-importing the link, so no duplicate roster entries are created). Full wizard access is available if they exit play mode.
- **Export** — JSON backup, self-contained HTML (print/PDF) with a **scan-to-play QR**, shareable URL (LZString-compressed; ~3,000 chars for a typical character). The QR uses the origin the sheet was exported from; for a cloud-synced character it encodes the short, live `#c=` link (always scannable, opens the live character), otherwise the self-contained embedded `#play=` link.
- **Back up / Restore all** — the Roster page can export the **entire roster** as one JSON file and restore it on any device or origin. **Restore** accepts multiple files at once and handles the roster-backup wrapper, a bare array, or individual character files — so it also bulk-imports separate `*-import.json` files in one action. Because `localStorage` is per-origin/per-browser, this is the portable cross-device backup (a server-backed store is a planned follow-up).
- **Session Notes** — Slide-in notes panel with per-character CRUD
- **Import** — Load any exported JSON file to restore a character on any device (validated against the schema on import; invalid files are rejected with a descriptive error)
- **Inventory** — editable in Play Mode and on the character sheet (add/edit/remove; **+ Add item** drops the cursor straight into the new item's Name field); also shown in Step 9 Review and the print/HTML export. Supports free-text strings or structured objects (name, quantity, notes)
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
| Persistence | localStorage (local-first); optional Supabase cloud sync (Postgres + Realtime) |
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
  components/
    steps/          # Step1Welcome … Step9Review, PlayMode
    CharacterCard, StepIndicator, WizardNav, NotesPanel, Toast, ErrorBoundary, NumberInput
  pages/
    RosterPage, GMScreen
  hooks/
    useAutoSave, useCharacterManagement, usePlayMode, useNotesPanel, useToast, useTheme,
    useCloudSync, useRealtimeCharacter
  utils/
    characterSchema.js    # Zod schema + safeParseCharacter
    characterDerived.js   # HP, Mana, Defense, XP, power totals
    defaultCharacter.js   # createDefaultCharacter()
    rosterStorage.js      # localStorage CRUD + version history
    rosterBackup.js       # whole-roster export / restore
    rosterSort.js         # roster sort + no-player partition
    urlState.js           # LZString #share=/#play= + #c= cloud links
    spellTarget.js        # Spell Matrix lookup (caster vs target)
    dice.js               # d100 core: rollTotal (skills/attacks) + resolveUnder (spells)
    rollActions.js        # binds dice to the engine: rollSkill / rollAttack / rollSpell
    rollFormat.js         # pure roll-result banner formatting
    rollFeed.js           # shared live roll feed (broadcast + subscribe)
    gmAdjust.js           # GM Screen counter clamps
    uuid.js               # secure-context-safe id generation
    numberInput.js        # numeric input coercion
    generateCharacterHTML.js  # standalone HTML export (with scan-to-play QR)
    cloudSync.js          # Supabase push / hydrate / realtime + cloud links
    supabaseClient.js     # Supabase client + cloudEnabled flag
    validation.js         # per-step validation rules
  data/
    races.json, archetypes.json, armorTypes.json, xpTable.json, spellTarget.json
supabase/
    migrations/0001_init.sql   # sealed characters table + capability-token RPCs
    README.md                  # setup, keys, smoke test, security model
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
- **Dice rolls** (`dice.js` + `rollActions.js`) — two resolution shapes on a d100:
  - **Skills & attacks** roll `d100 + a single modifier` and **display the total**; the player reads it aloud and the GM adjudicates against difficulty/defense verbally (like D&D Beyond). The attack modifier is the weapon's **skill _or_ attribute value — non-stacking** (skill wins when present), computed by `weaponModifier()` and shown consistently in Play Mode, the Review sheet, and the Combat editor.
    - **Exploding:** a die over 95 (96–100) rolls again and adds — repeating for each new die over 95 — *before* the modifier. E.g. 97 → roll again → 40 → `137 + modifier`.
    - **Fumble:** a natural 1–5 shows the low roll and rolls one **unmodified fumble die**, announced to the GM who determines the fumble result. The check fails.
  - **Spells** roll **under** the computed Spell Target (`matrix + magic attribute`, cap 95) and the app resolves pass/fail.
  - Rolls take an injectable `rng` (defaults to `Math.random`) so they are deterministic in tests.
  - **In Play Mode** each skill and weapon has a one-tap **Roll / Attack** button and the spell tile has a **Roll** button; results appear in a sticky banner at the top (the total to read aloud for skills/attacks, or Success/Miss for spells). Rolls are ephemeral — not saved.
  - **3D dice animation + sound** — a tap tumbles physical percentile dice (a tens die 00–90 + a ones die 0–9) that land on the rolled number, in a **tray low on the screen** (the stage is bounded so dice don't scatter over the sheet) and clear a beat after they settle. Built on `@3d-dice/dice-box-threejs`, lazy-loaded on the first roll (its own bundle chunk, so app start is untouched); the exact landing value comes from `diceNotation.js`. **Sound** is our own layer, played through plain HTML5 `<audio>` (not Web Audio — on iOS a Web Audio context created outside a gesture stays suspended and is silenced by the ringer switch; an `<audio>` element played in the tap gesture unlocks reliably). The engine's own audio is iOS-fragile (hangs init), so it stays off. Real roll recordings in `public/sfx/` are **rotated per roll** so it doesn't sound identical every time — `roll.wav` (mixed offline from the engine's real dice-hit + felt samples) plus `roll-b.mp3` / `roll-c.mp3` (recorded RPG dice rolls, freesound community via Pixabay). Add more files to `ROLL_SRCS` in `diceSound.js` to widen the rotation; if none load, a synthesized rattle is the fallback. Header toggles for 🎲 animation and 🔊 sound (persisted); animation auto-off under `prefers-reduced-motion`. The result banner + shared feed are the source of truth, so a device that can't render still shows the number instantly.
  - **Shared roll feed** — when cloud is on, every roll also broadcasts to a table-scoped realtime channel (`session:default`) and shows on the **GM Screen** as a live "Live Rolls" list (actor · roll · detail). Broadcast-only, no DB persistence. Single home-table channel for now; per-campaign channels are a backlog item.

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
renders nothing in the localStorage-only build.

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
  roster — no accounts. The GM key + cloud map are included in the **Back up all**
  file, so cloud access survives a browser wipe. **Reset link** rotates a token to
  revoke a shared link.
- **Setup & cutover:** create a project, apply `supabase/migrations/0001_init.sql`,
  set the three `VITE_*` repo Variables; flip `VITE_CLOUD_SYNC=on` to go live.

## Multi-user accounts & roles (optional)

Epic #109 adds a second, **authenticated** access plane on top of the guest one
above. With it on, each player signs in (passwordless **magic link**) and the
cloud — not localStorage — is the **source of truth** for character data
(localStorage is demoted to an offline cache). The original guest links keep
working unchanged, so game-day QR / printout scans still need no login.

- **Roles.** `player` reads/edits the characters they own or are assigned and
  ticks counters during play; `gm` views and administers **every** character in
  the campaign (HP/Mana/Story, plus assigning players); `admin` can change any
  data and any user's role.
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
- **Off by default.** Enabled only when `VITE_AUTH=on` (which implies cloud) and
  the Supabase keys are present. With it off the app is the legacy single-user /
  guest build, byte-for-byte.
- **Setup:** apply `supabase/migrations/0002_auth_roles.sql` after `0001`, set
  `VITE_AUTH=on`, then sign in once and run the one-time seed/backfill SQL noted
  at the bottom of the migration (make yourself `admin`; adopt existing
  characters). See `supabase/README.md`.
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
- **Role helper:** the migration's caller-role lookup is `public.caller_role()`
  (not `current_role` — that's a reserved Postgres keyword and cannot be a
  function name). `is_gm_or_admin()` and the RLS policies build on it.
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
