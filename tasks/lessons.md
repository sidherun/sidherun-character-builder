# Lessons

Patterns captured after corrections, so the same mistake isn't repeated.

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
