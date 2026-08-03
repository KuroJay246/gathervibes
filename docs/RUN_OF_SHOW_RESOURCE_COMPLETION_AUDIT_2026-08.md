# Run of Show and Event Resources Completion Audit - 2026-08

## Purpose

This release closes the practical event-day gaps in the existing Run of Show and Resources foundation without adding a new planning system. The work keeps the current Firestore paths, route paths, QR payload, scanner boundaries, Operations boundaries, and registration finance behavior unchanged.

## E2E Baseline Finding

`npm run e2e:full` was isolated by running each Playwright spec and then the complete suite twice with a longer command timeout. The suite passes; the apparent failure was a caller timeout shorter than the normal full-suite runtime.

- Full suite runtime: about 6 minutes.
- First full run: 10 passed.
- Second full run: 10 passed.
- Longest spec: responsive route overflow review.
- Root cause: external command timeout, not a product or Playwright assertion failure.

## Implemented Product Changes

- Run of Show forms now use selectors for staff profiles, contacts, organizations, tasks, documents, resources, and dependency items instead of requiring manual ID entry.
- Resources forms now use selectors for contacts, organizations, documents, Run of Show items, tasks, Operations entries, and commitment references.
- Run of Show items now support `actualArrivalTime` and `criticalForEvent`.
- Event Resources now support `criticalForEvent`.
- Run of Show now shows compact Now, Next, Upcoming, Delayed, and Recently Completed sections.
- Supplier/staff arrivals can be marked arrived with an auditable quick action.
- Resource quick actions now include Requested and Ordered / Reserved before later lifecycle states.
- Event readiness now exposes transparent reasons and escalates to At Risk for critical delayed timeline items, unresolved dependencies, delayed critical arrivals, and critical resource shortages.

## Firestore Rules Impact

Rules changed only to validate the new persisted fields and audit action:

- `events/{eventId}/runOfShow/{itemId}.actualArrivalTime`
- `events/{eventId}/runOfShow/{itemId}.criticalForEvent`
- `events/{eventId}/resources/{resourceId}.criticalForEvent`
- audit action `run-of-show.arrival`

No role expansion was added. Scanner, viewer, manager, and protected-owner boundaries remain governed by the existing authorization model.

## Guardrails Preserved

- Existing route paths are preserved: `/run-of-show` and `/resources`.
- Existing Firestore collections are preserved.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- Registration payment formulas are unchanged.
- Operations Ledger calculations are unchanged.
- Linked IDs do not grant access to linked records.
- Append-only audit logs remain required for service writes.
- CODEX_TEST remains the only special QA/test event.
- Cake Piknik Barbados was not read, selected, edited, or modified.

## Tests Added Or Extended

- Extended Run of Show and Resources foundation coverage for selectors, actual arrival time, critical readiness, timeline sections, resource lifecycle actions, and transparent At Risk warnings.
- Extended Firestore rules fixtures for the new validated fields.

## Deliberately Deferred

- Event Playbooks.
- Event cloning.
- New task-management features beyond the existing task prefill links.
- File uploads or document storage integrations.
- New procurement, warehouse, vendor, billing, or payment systems.
- Production data migration.
