# Phase 23 - Task Workflow and Registration Experience Refinement

## Resulting Product Structure

- `/tasks` is the event-scoped Tasks and Deadlines workflow.
- `/registrations` remains Guests and Registrations.
- Existing route paths are preserved.
- Scanner navigation remains isolated from organizer task work.

## Tasks and Deadlines

- Tasks are persisted at `events/{eventId}/tasks/{taskId}`.
- Required statuses are Not Started, In Progress, Waiting on Someone, Blocked, Completed, and Cancelled.
- Required priorities are Low, Normal, High, and Urgent.
- Tasks support title, notes, category, due date, follow-up date, responsibility fields, waiting-on details, blocker reason, timestamps, and audit identity fields.
- Completed and Cancelled tasks are not treated as overdue.
- Filters cover All, Overdue, Due Today, Due Soon, Waiting, Blocked, and Completed.
- Add, edit, status changes, reopen, cancel, and delete are audited through append-only audit records.

## Registration Refinement

- The page copy now distinguishes registration records from guest totals.
- Filters include source, ticket state, and attendance state.
- Desktop rows show source and last-updated metadata.
- Mobile cards show record source.
- The form is grouped into registration identity and payment fields.
- Payment, ticket, import, and check-in logic was not changed.

## Security and Data Guardrails

- Firestore rules define a validated task schema.
- Viewer can read scoped event tasks but cannot mutate them.
- Event manager and approved organizers can manage scoped tasks.
- Scanner cannot view or manage Tasks.
- CPB receives no special handling.
- CODEX_TEST remains the test event classification through existing event utilities.
- QR payload remains `GSV:TICKET:{ticketCode}`.
