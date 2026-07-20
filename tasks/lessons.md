# Lessons

Patterns captured after corrections, so the same mistake isn't repeated.

## Use visible production labels in UI guidance (2026-07-20)

**Context:** Told Ed to edit Dante's “Combat” section, which is the internal
wizard/editor name, but the loaded character sheet exposes the action as the
pencil beside **Weapons**.

**Lesson:** Before giving production click paths, verify the labels rendered in
the user's current mode. Describe the visible heading and control (for example,
“Weapons → pencil icon”), not an internal component or wizard-step name.

## Don't iterate blind on output you can't observe (2026-07-03)

**Context:** Spent several passes tuning the dice-roll *sound* by feel ("rattlesnake",
then "way off") — but this environment has no audio out, so I couldn't hear the result.
Each blind tweak was a guess.

**Lesson:** When the output can't be observed in-session (audio, and note: WebGL/3D motion
also can't be rendered here — headless Chrome has no GPU), stop guessing after the first
miss. Either (a) use a *real recording / real asset* so quality is inherent, not tuned, or
(b) put the human in the loop early — they have the eyes/ears I don't. The fix that worked:
pre-render one roll from real samples + let Ed drop his own file (`public/sfx/`, auto-picked
up). One `roll.wav` swap beat a dozen synth-parameter guesses.

## Confirm what "not natural"/"broken" actually refers to before fixing (2026-07-03)

**Context:** Ed said the dice were "not natural." I assumed the *roll motion* and lined up
physics/library options — he meant the *sound* (visuals were fine; he only wanted the dice
confined to a tray).

**Lesson:** A vague quality complaint can point at any of several subsystems. One cheap
clarifying question (or a quick "which part — motion, sound, or placement?") saves a wrong
fix. Ask when the answer changes what you build.

## Shared working tree = branch hazard with parallel jobs (2026-07-03)

**Context:** Multiple background jobs edit this repo in one working tree. Another job left
HEAD on `fix/142`; a commit meant for `main` landed there. Recovered by cherry-picking to
`main` and restoring `fix/142` to its prior tip.

**Lesson:** In a shared working tree, verify `git branch --show-current` before committing —
don't assume you're still on `main`. Stage explicit paths (never `git add -A`) so a
concurrent job's uncommitted files aren't swept into your commit. Per-job worktrees would
remove the hazard entirely (flagged in issue #168).

## Static-render tests don't catch interaction/state bugs — drive the real app (2026-07-04)

**Context:** Two shipped bugs this session were invisible to the test suite: (1) `createTable`
returned the new table object, not the list, so `setTables(createTable(...))` crashed
`TablesManager` with `tables.map is not a function`; (2) #176's `deriveRegistry` showed the
raw table UUID as the name for legacy members. All component tests use
`renderToStaticMarkup` (no interaction), so both passed CI and only surfaced when I drove the
app with `/browse`.

**Lesson:** For any stateful/interactive change (menus, dialogs, editors, derived registries),
browser-verify the actual flow before shipping — tests + lint + build passing is necessary but
not sufficient. Also: seed the exact edge state (e.g. legacy data missing a new field) and the
"fresh device" case (wipe the relevant localStorage), not just the happy path.

## Simulated DOM events don't reliably trigger React handlers (2026-07-04)

**Context:** Setting an input's `.value` + `dispatchEvent(new Event('blur'))` did NOT fire a
React `onBlur` rename handler (the registry stayed empty), so a rename looked broken when it
wasn't.

**Lesson:** For controlled/uncontrolled inputs and on-blur handlers, use the browse tool's
`fill` (fires React's synthetic onChange) + `press Tab` to blur — not raw `dispatchEvent`.
Confirm the persisted state (localStorage / blob), not just the DOM value.

## Two cloud planes need different sync advice — check which one the user is on (2026-07-11)

**Context:** Told Ed to use "Push to cloud" + a localStorage console edit to resync Dante —
wrong for his situation: he was **signed in**, where the roster IS the Supabase `characters`
table (via `characterRepo`), every sheet edit saves directly, and the guest-plane push
button doesn't even render (`cloudEnabled && !useRepo`). The correct answer was "nothing —
it's automatic".

**Lesson:** Before giving cloud-sync/data-repair instructions, determine the plane. A
screenshot showing **Sign Out / Manage Roles / Player dropdowns** = authed plane (RLS table
writes, GM role can edit ANY character — including rows a guest token can't reach). Guest
plane = localStorage + token RPCs + Push to cloud. Fixes and their failure modes differ
completely between the two.

## Roster data surgery via backup tokens works — but check row ownership first (2026-07-11)

**Context:** Applied GM data rulings (#203/#249) directly to live cloud rows using the
capability tokens + GM key inside `sidherun-roster-2026-06-28.json`, with fetch→assert→
patch→re-fetch verification. Worked for 13/14 characters; Dante failed silently-ish — his
rosterId is `cloud-<id>` (imported from another owner's link), his token was rotated, and
`list_characters(gm_key)` proved the row belongs to someone else's key.

**Lesson:** The roster backup's `_gmKey`/`_cloudMap` is a legitimate data-repair path
(same RPCs the app uses). Before relying on it: `list_characters(p_gm_key)` to confirm
ownership; `cloud-<id>` roster ids mean someone else's row. Always fetch the CURRENT row and
patch it (never push the stale backup blob), assert expected values before writing, re-fetch
to verify, and mirror every fix into the backup JSON — otherwise a future Restore re-derives
the old state (e.g. the `usesSkill` legacy migration) and silently reverts the ruling.

## Long session: re-fetch before branching off origin/main (2026-07-11)

**Context:** Created two branches from a stale local `origin/main` ref (last fetched hours
earlier, before intervening PR merges). The README edits in the second PR were made against
a pre-#250 README; git's three-way merge happened to save it, and the third branch needed a
`fetch` + `reset --hard origin/main` before use.

**Lesson:** `git fetch origin main` immediately before every `git checkout -b X origin/main`
in a session where PRs merge along the way — a remote-tracking ref is a snapshot, not live.
