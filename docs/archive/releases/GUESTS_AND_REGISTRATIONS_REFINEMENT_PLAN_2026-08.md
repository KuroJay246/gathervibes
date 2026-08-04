# Guests and Registrations Refinement Plan - 2026-08

## Product Problem

Guests and Registrations already supports the core record workflow, but the page mixes registration identity, guest counts, payment review, ticket state, attendance state, source evidence, and bulk actions in one dense surface. The refinement keeps the current data model and calculations stable while making the organizer's daily review path easier to scan.

## Scope

- Keep `/registrations` as the canonical route.
- Preserve registration CRUD, import access, payment fields, ticket status, check-in state, duplicate-contact review, and bulk actions.
- Clarify that a registration is the record and guests are derived from `personsAttending`.
- Add supported filters for record source, ticket state, and attendance state.
- Surface source metadata on desktop rows and mobile cards.
- Group the registration form into identity and payment sections.

## Deliberately Unchanged

- Registration finance formulas.
- Operations Ledger calculations.
- Import Center parsing.
- Ticket assignment behavior.
- Check-In behavior.
- QR payload format.
- Scanner permissions.
- Firestore indexes and dependency set.
- CPB production records.

## Task Workflow Dependency

Persistent tasks are handled by `/tasks` under `events/{eventId}/tasks/{taskId}`. Registrations may link organizers toward task follow-up later, but this phase does not add task creation from registration rows.

## Acceptance Notes

- Source filters use existing `source` values only.
- Ticket filters use existing `ticketStatus` and `ticketCode` values only.
- Attendance filters use existing check-in and historical-attendance derivation only.
- The page remains responsive through the existing desktop table and mobile registration cards.
