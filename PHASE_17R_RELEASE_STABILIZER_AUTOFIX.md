# Phase 17R — Release Stabilizer / Auto-Fixer / QA Corrector

Status: active branch-only stabilizer lane  
Branch: `codex/phase-17r-release-stabilizer-autofix`  
Base commit: `83a3b9ff2fe19dce070761a66d93e4851f76e6cf`

## Scope

Phase 17R is the regression-catching lane for the parallel release train.

It is allowed to:

- strengthen route-readiness tests
- strengthen clean-account and no-selected-event tests
- strengthen selected Working Event guardrail tests
- strengthen dashboard, registrations, imports, tickets, and operations guardrail tests
- preserve CPB no-touch boundaries
- preserve `approvedEmails` admin-only boundaries
- preserve QR payload exactly as `GSV:TICKET:{ticketCode}`
- preserve non-live access-request workflow boundaries

It is not allowed to:

- redesign the dashboard
- redesign approved screens
- activate requester submit
- activate approve, decline, or revoke workflow
- deploy Firestore rules or indexes in this lane
- use CPB for QA
- broaden permissions

## Current stabilizer checklist

1. Core private routes must keep explicit no-selected-event states where a Working Event is required.
2. Dashboard must keep explicit selected-event wording and clean-account fallbacks.
3. Imports must stay preview-first and write nothing before confirm.
4. Tickets must keep ticket-code-only QR payloads.
5. Operations must stay selected-event-scoped and separate from ticket sales.
6. Check-in must keep duplicate blocking and admin-only undo.
7. `approvedEmails` must remain admin-only.
8. Access Requests requester/admin workflow must remain non-live.
9. CPB must remain untouched and off-limits for QA.
10. `xlsx` must remain absent and `read-excel-file` must remain active.

## This branch adds

- route-readiness guardrail coverage for core no-selected-event states
- explicit checks that auth routing still preserves login redirect and route gating
- focused branch-only documentation for the stabilizer lane
- stale selected-event snapshot correction coverage for dashboard and operations pass-through work
- timing-headroom hardening for the existing countdown regression test
- audit-boundary coverage for event create/update/delete, registration create/update/delete, and ticket assign/unassign flows
- explicit coverage that event tier removal still clears stale `priceTiers` data instead of leaving hidden legacy values behind

## B2 dependency

Phase 17G-B2 remains blocked until real scanner smoke PASS exists.

Phase 17R must not claim B2 is closed, must not merge B2, and must not fake scanner smoke.
