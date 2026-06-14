# Sidherun Character Builder — Claude Coordination

## Context

Ed has a 13-person Sidherun RPG game in 6 days. Players have played these characters before;
their sheets are coming in as phone photos. Goal: extract each character into a valid import
JSON, load all 13 into the app, and produce printouts for game day.

Ed is the GM and first-class citizen. The app must support GM workflows (manage all characters,
quick edits during play) not just individual player character creation.

## Session Ownership

| Area | Owner | Branch |
|---|---|---|
| Import pipeline (photo → JSON → load) | **Session A (this file's session)** | `feat/import-pipeline` |
| GM play mode, printout, UX | Session B | `feat/gm-play-mode` |

**Do not edit files owned by the other session without checking tasks/todo.md first.**

### Session A owns
- `src/pages/ImportPage.*` (new)
- `src/utils/characterSchema.js`
- `src/utils/defaultCharacter.js`
- JSON import/validation flow
- `dulu-breac-import.json` and any other character JSON files in `sidherun` repo

### Session B owns
- `src/pages/PlayMode.*` / GM view (new)
- `src/components/steps/Step9Review.*` / printout
- `src/index.css` / global UX and contrast
- Export / HTML generation

### Shared (coordinate via tasks/todo.md before touching)
- `src/App.jsx`
- `src/data/*.json`
- `README.md`

## Workflow

1. Read `tasks/todo.md` at session start
2. Claim work by adding your session label to the task
3. Work on your branch (`feat/import-pipeline` or `feat/gm-play-mode`)
4. PR to `main` when a chunk is done
5. Update `tasks/todo.md` with what shipped
