# Guided Event Setup Result - 2026-08

## Result

Phase 2 adds organizer-facing guidance to the existing Events workflow. Events now expose setup-stage and deadline status without changing route paths, Firestore collections, dependencies, or access rules.

## Routes preserved

- `/events` remains the Events workspace.
- `/dashboard`, `/registrations`, `/payments`, `/tickets`, `/check-in`, `/operations`, `/communications`, `/event-review`, `/imports`, `/settings`, and `/qa` remain unchanged.
- No `event-tasks` or `setup-wizard` route was added.

## Events Page

- Desktop and mobile event rows show the next setup stage or Setup Complete.
- Desktop and mobile event rows show task deadline state: overdue, due today, due soon, open, or no open tasks.
- CODEX_DEMO remains hidden from normal event lists by default unless Show Test Events is used.

## Event Planning Workspace

- Added a Guided setup section using five organizer stages.
- Added a Task deadline focus section with open, overdue, due-today, and due-soon counts.
- Existing task add, edit, complete, reopen, remove, filter, and sort behavior remains.

## Tests Added

- `tests/phase2-guided-event-setup-task-deadline.test.js`
- Coverage includes setup stages, deadline classification, route preservation, QR payload, docs, and no separate CPB protection language.

## Guardrails Preserved

- QR payload remains `GSV:TICKET:{ticketCode}`.
- Firestore rules unchanged unless separately verified.
- Firestore indexes unchanged.
- Dependencies unchanged.
- Scanner and organizer access boundaries unchanged.
- CPB remains a normal real event under standard safeguards.
- CODEX_DEMO remains the safe QA event.
