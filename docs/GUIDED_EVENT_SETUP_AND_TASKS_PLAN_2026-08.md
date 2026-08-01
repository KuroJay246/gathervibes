# Guided Event Setup and Tasks Plan - 2026-08

## Product Problem

The Events page already creates and edits events, and each event already stores setup details, readiness, budget planning, and planning tasks. The missing layer is organizer guidance: a user should immediately understand where an event is in setup and which deadline needs attention next.

## Scope

- Keep the existing `/events` route.
- Keep planning tasks on the existing event document as `planningTasks`.
- Keep readiness, budget planning, and operations planning on the existing event document.
- Add organizer-facing setup-stage and deadline summaries.
- Use CODEX_TEST for QA and synthetic verification only.

## Non-Scope

- No new task database collection.
- No new Payments, Team, vendor, sponsor, or public portal module.
- No Firestore rules, indexes, Functions, Storage, or Auth configuration deployment unless independently required.
- No separate CPB protection system. CPB remains a normal real completed event protected by the standard safeguards.

## Implementation Approach

1. Add shared event setup-stage helpers.
2. Add shared task deadline-summary helpers.
3. Surface stage and deadline information on the Events page.
4. Surface a guided setup and deadline focus section inside the existing event planning workspace.
5. Add regression tests for routes, QR payload, standards, and guardrails.
6. Validate with lint, unit tests, build, product QA, E2E, audit, dependency checks, and React Doctor.

## Guardrails

- Routes preserved.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- Registration finance and Operations ledger formulas unchanged.
- Scanner access boundaries unchanged.
- CODEX_TEST remains the only special QA/test event.
- CPB is not used for write testing.
