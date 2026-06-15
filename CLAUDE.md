# Sidherun Character Builder — Claude Coordination

## Context

Ed has a 13-person Sidherun RPG game in 6 days. Players have played these characters before;
their sheets are coming in as phone photos. Goal: extract each character into a valid import
JSON, load all 13 into the app, and produce printouts for game day.

Ed is the GM and first-class citizen. The app must support GM workflows (manage all characters,
quick edits during play) not just individual player character creation.

## Workflow

1. Read `tasks/todo.md` at session start
2. Work directly on `main` or short-lived feature branches as needed
3. Update `tasks/todo.md` with what shipped
