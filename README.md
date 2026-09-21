# Sidherun Character Builder

A browser companion for the Sidherun tabletop RPG. Players can create and run
characters, while GMs manage rosters, encounters, conditions, and shared rolls.

[Open the hosted app](https://character-builder.sidherun.com/) ·
[Read the rules](rules/README.md) ·
[Report an issue](https://github.com/sidherun/sidherun-character-builder/issues)

> The hosted app uses invitation-only accounts. Characters created while using
> a local-only build remain in that browser unless you export a roster backup.
> Back up your roster before clearing browser data or moving devices.

## Contents

- [What it does](#what-it-does)
- [Start here](#start-here)
- [Accounts, storage, and sharing](#accounts-storage-and-sharing)
- [Run locally](#run-locally)
- [Architecture](#architecture)
- [Rules and setting content](#rules-and-setting-content)
- [Deployment](#deployment)
- [License and copyright](#license-and-copyright)

## What it does

- **Guided character creation.** A nine-step wizard covers identity,
  attributes, combat, powers, magic, skills, resources, and review. Contextual
  guidance cites the Sidherun Player's Handbook, and archetype choices determine
  whether powers and magic steps appear.
- **Character sheets and Play Mode.** Existing characters open as mobile-first
  sheets. Play Mode adds live HP, Mana, Story Point, armor, condition, skill-use,
  inventory, spell-casting, initiative, attack, and damage controls. Session
  Notes pins an existing character backstory first and keeps edits synchronized
  with the character sheet.
- **Dice and rules calculations.** The app calculates derived statistics and
  supports attribute, skill, weapon, damage, initiative, and spell rolls,
  including Sidherun's critical and fumble behavior.
- **GM tools.** The GM Screen provides roster-wide live counters, table filters,
  conditions, roll difficulty, a shared roll feed, and a session-local encounter
  tracker with turn order and temporary NPCs.
- **Campaign organization.** Named tables group characters without acting as
  authorization boundaries. GMs and admins retain campaign-wide access; player
  access is governed by character ownership and assignment.
- **Import, export, and printing.** Characters can be imported and exported as
  validated JSON, printed individually or by roster/table, and exported as
  self-contained HTML with a scan-to-play QR code.
- **Optional accounts and live sharing.** Supabase provides role-based player,
  GM, and admin accounts, cloud persistence, realtime updates, and guest links
  with rotatable database credentials. The app also supports a localStorage-only
  build.

## Start here

### Players

1. Open the [hosted app](https://character-builder.sidherun.com/).
2. Sign in with the email address invited by your GM. An existing play or live
   link opens without an account.
3. Create a character with the wizard, or choose **Load** from the roster.
4. Use **Enter Play Mode** during a session. Every saved section remains
   editable from the character sheet or Play Mode.
5. Export JSON when you want a portable character backup.

Finishing the wizard with **Complete** saves the character and opens its
character sheet. A new character is not added to the roster before that step.

### GMs and admins

The roster is the campaign hub. From there you can:

- create, import, load, print, assign app accounts, group, or delete characters;
- create named tables, then use the compact **Table Filter** bar on the roster or GM Screen to show only that table’s characters;
- open the **GM Screen** for live counters, rolls, conditions, and encounters;
- use **Back up all** to preserve the roster and guest-link credentials; and
- as an admin, open **Manage Roles** to update display names and account roles.

New accounts are invitation-only. Add players through Supabase Authentication,
then assign their role and characters in the app. The complete account setup and
first-admin procedure live in the [Supabase runbook](supabase/README.md).

### Developers

Start with [Run locally](#run-locally), then read:

- [Supabase setup and security](supabase/README.md) for cloud deployments;
- [Golden Pages](rules/README.md) for the canonical rules contract;
- [Player docs](players/README.md) for player-facing setting content;
- [Languages](languages/README.md) for constructed-language sources; and
- [`src/tokens.css`](src/tokens.css) and the
  [token migration notes](CODEX-MIGRATION.md) for the design system.

Live work is tracked in
[GitHub Issues](https://github.com/sidherun/sidherun-character-builder/issues).
Before contributing, read [AGENTS.md](AGENTS.md) for the repository workflow and
coordination rules. Open an issue before starting a change so overlapping work
can be identified.

## Accounts, storage, and sharing

The application supports three access modes:

| Mode | Account | Authoritative storage | Intended use |
|---|---|---|---|
| Local build | None | This browser's localStorage | Private/offline play and development |
| Signed in | Invitation required | Supabase, with a local offline cache | Hosted campaign play and management |
| Existing live link | None | The linked Supabase character | Guest play from a GM-provided link |

The production build uses role-based access:

- **Player:** reads and edits characters they own or are assigned.
- **GM:** views and manages every campaign character, including assignments.
- **Admin:** has GM access and may manage user display names and roles.

Tables organize a campaign roster; they do not grant or restrict character
access. Supabase Row Level Security enforces ownership, assignment, and role
permissions at the database boundary. New cloud characters require a signed-in
user. Anonymous character creation is disabled.

### Play links and live links

The roster exposes two sharing options:

- **Copy play link** creates a self-contained `#play=` snapshot. It embeds the
  character data in the URL and attempts to shorten that URL through TinyURL.
  The recipient gets an independent local copy, so later edits do not stay in
  sync with the sender.
- **Copy live link** appears for a character with an existing capability mapping
  and creates a short `#c=` link. The recipient's permitted edits write back to
  that cloud character and update other connected views.

A live link is a bearer capability: anyone who has it receives its guest
permissions. Share it only with the intended player. **Reset link** rotates its
secret and revokes the old link's database/RPC access. Realtime Broadcast is not
yet an authorization boundary, so an old recipient who retained the character
UUID may still observe or inject channel messages; hardening is tracked in
[#332](https://github.com/sidherun/sidherun-character-builder/issues/332).

Roster backup JSON may include the GM key and guest-link credentials. Treat it
as sensitive: store it securely and share it only with someone who should retain
that access.

Snapshot play-link data is sent to TinyURL when shortening succeeds. If that
request fails, the app copies the longer self-contained URL instead. Live links
are already short and are copied directly.

### Saving and recovery

Saved characters autosave after edits. Cloud builds display sync state and warn
when writes fail or the browser is offline. Authenticated structural edits use
revision checks to prevent one device from silently overwriting a newer edit.

If a saved sign-in cannot be restored, the app stops waiting after ten seconds
and offers to clear only the local Supabase session before returning to sign-in.
Character drafts, roster backups, theme, and other local app data are preserved.

For local-only use, browser storage is the only saved copy until you export it.
Use JSON for individual characters and **Back up all** for the complete roster.
Imports and share-link data are validated before loading.

## Run locally

Prerequisites:

- Node.js 20
- npm

Install and start the development server:

```bash
git clone https://github.com/sidherun/sidherun-character-builder.git
cd sidherun-character-builder
npm ci
npm run dev
```

The local build uses browser storage unless cloud variables are configured.
Copy `.env.example` to `.env.local` and follow the
[Supabase runbook](supabase/README.md) to enable accounts and cloud sync.

Useful commands:

```bash
npm run dev       # Vite development server
npm run lint      # ESLint, with warnings treated as failures
npm test          # Vitest suite
npm run build     # production build in dist/
npm run preview   # serve the production build locally
```

Run lint, tests, and a production build before opening a pull request.

## Architecture

The client is a React 19 single-page application built with Vite. It has two
data planes:

1. The local plane stores characters in `localStorage` and supports embedded
   snapshot links.
2. The cloud plane uses Supabase Auth, Postgres, Row Level Security, protected
   RPCs, and Realtime Broadcast. Signed-in users access rows through their role
   and character relationships; guest live links use per-character capability
   tokens.

Cloud writes are serialized per character. Live-counter updates and full
character edits share a coordinator, while revision checks protect structural
data from stale overwrites. Realtime messages speed up delivery; durable database
state and focus-time reconciliation recover missed messages.

Realtime Broadcast payloads are currently untrusted transport signals, not an
authorization boundary. Database RLS and capability-token RPC checks remain the
source of truth while channel authorization work continues in
[#332](https://github.com/sidherun/sidherun-character-builder/issues/332).

### Project structure

```text
src/
  auth/          authentication provider and role helpers
  components/    wizard, sheet, Play Mode, and shared UI
  data/          archetypes, equipment, and app-facing rules data
  hooks/         autosave, theme, focus, and cloud-sync hooks
  pages/         roster, GM Screen, login, and role management
  utils/         schema, storage, calculations, exports, and repositories
  tokens.css     shared light/dark design tokens
rules/           canonical Golden Pages and machine-readable rules data
players/         player-facing setting documents
languages/       constructed-language references
supabase/
  migrations/    schema, RLS, permissions, and data constraints
  verify_*.sql   transactional security verification matrices
tasks/           shipped history and project notes
```

Character imports are validated by the Zod schema in
[`src/utils/characterSchema.js`](src/utils/characterSchema.js). Rules-backed
calculations should consume canonical data from `rules/data/` rather than
duplicating values in components.

## Rules and setting content

The [Golden Pages](rules/README.md) are the canonical rules source for this
repository. Their version is recorded in [`rules/VERSION`](rules/VERSION), and
the chapter index links to the individual rule documents. Proposed rules changes
should follow the process documented there.

The repository also contains [player-facing setting documents](players/README.md)
and [language references](languages/README.md). These materials follow separate
content contracts and are protected game content; see
[`COPYRIGHT.md`](COPYRIGHT.md).

## Deployment

Pushes to `main` trigger the GitHub Pages workflow. It installs with `npm ci`,
runs lint and tests, builds `dist/`, and deploys only after those checks pass.
The production site uses the custom domain
[`character-builder.sidherun.com`](https://character-builder.sidherun.com/).

Cloud deployments require these GitHub Actions repository variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AUTH=on`

`VITE_AUTH=on` enables cloud behavior, so `VITE_CLOUD_SYNC` is optional for the
supported authenticated deployment. Vite embeds these public values at build
time; database security depends on RLS and capability tokens. Apply migrations
in numeric order and run every `supabase/verify_*.sql` matrix before deploying a
schema change. See [Supabase setup](supabase/README.md) for the full procedure.

GitHub Pages must use **GitHub Actions** as its source. `public/CNAME` and
`vite.config.js` configure the custom domain at the site root. HTTPS is required
for supported clipboard behavior.

## License and copyright

This repository contains two works under different terms:

- **Application source code:** MIT licensed; see [`LICENSE`](LICENSE).
- **Sidherun game content:** the rules, setting, languages, player documents,
  game data, descriptions, and Sidherun name are all rights reserved, with
  permission for personal at-table use; see [`COPYRIGHT.md`](COPYRIGHT.md).
