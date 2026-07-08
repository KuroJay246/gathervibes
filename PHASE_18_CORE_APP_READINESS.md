# Phase 18 — Core App Readiness

Status: active branch-only core readiness lane  
Branch: `codex/phase-18-core-app-readiness`  
Base commit: `83a3b9ff2fe19dce070761a66d93e4851f76e6cf`

## Scope

Phase 18 is limited to the current core app:

- Dashboard reliability
- Events reliability
- Registrations reliability
- Import Center reliability
- Tickets reliability

No redesign, no new dashboard concept, no access-workflow activation, no index deploy.

## Issues addressed in this branch

1. Import Center could carry stale mapping/review/import state across Working Event changes.
2. Registrations page could carry stale bulk-selection or modal state across Working Event changes.
3. Registrations page continued rendering its main surface after a load failure instead of cleanly short-circuiting to the error state.
4. Tickets page could carry stale search/filter/draft/print state across Working Event changes.
5. Tickets page continued rendering its main surface after a load failure instead of cleanly short-circuiting to the error state.

## Intent

This branch makes existing flows safer without changing the approved layout:

- reset transient page state when the selected Working Event changes
- prevent stale selected-event operations from leaking into the next event context
- keep route loading explicit on failures
- preserve existing CRUD, ticket, import, audit, CPB, and access boundaries
