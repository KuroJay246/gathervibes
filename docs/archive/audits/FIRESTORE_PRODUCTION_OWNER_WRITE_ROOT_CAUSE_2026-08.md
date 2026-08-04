# Firestore Production Owner Write Root Cause - 2026-08

## Scope

This hotfix investigates production `permission-denied` writes for the protected owner account:

- Email: `jaylanspencer99@gmail.com`
- Firebase UID: `WcDU2jmbopdAgDlMMWvD3TkqqbC3`
- Firebase project: `gathervibeshub`

QR scanning is out of scope. The confirmed remaining defect is a Firestore write authorization or validation failure after the app already recognizes the signed-in user as owner/admin.

## Root Cause

Two issues can produce the observed production symptom:

1. The app-side protected-owner detection was shipped by Hosting, but Firestore server authorization depends on the deployed Firestore ruleset, not React state. If production rules are older than the repository rules, legitimate owner writes are still rejected even when the UI says owner/admin.
2. `updateRegistration` used a split write: first `updateDoc(registrations/{id})`, then `setDoc(auditLogs/{id})`. That made the most common "edit a person" workflow inconsistent with the rest of the audited write services and could surface a save failure from the audit write separately from the registration mutation.

The smallest code fix is to make registration edits atomic with their append-only audit log by using one Firestore batch.

The smallest production fix is to deploy the current repository Firestore rules only, because the repository rules already contain the immutable protected-owner UID path:

```text
isApprovedAdmin() => isProtectedOwner() || approvedEmails lookup
```

## Write-Path Matrix

| Workflow | Service | Firestore mutation | Audit behavior | Protected-owner expectation |
| --- | --- | --- | --- | --- |
| Create event | `eventService.createEvent` | `events/{eventId}` create | Batch `auditLogs/{logId}` create | Allowed when event schema is valid |
| Update event | `eventService.updateEvent` | `events/{eventId}` update | Batch `auditLogs/{logId}` create | Allowed for completed and active real events when schema is valid |
| Delete event | `eventService.deleteEvent` | `events/{eventId}` delete | Batch `auditLogs/{logId}` create | Allowed only where UI confirmation exposes it |
| Create registration | `registrationService.createRegistration` | `registrations/{registrationId}` create | Batch `auditLogs/{logId}` create | Allowed when registration schema and event scope are valid |
| Update registration | `registrationService.updateRegistration` | `registrations/{registrationId}` update | Batch `auditLogs/{logId}` create | Allowed when registration schema and immutable fields are valid |
| Delete registration | `registrationService.deleteRegistration` | `registrations/{registrationId}` delete | Batch `auditLogs/{logId}` create | Allowed only where confirmation exposes it |
| Bulk registration payment status | `registrationService.bulkUpdatePaymentStatus` | `registrations/{registrationId}` update | Batched audit per record | Allowed when scoped to one event and payment status is valid |
| Bulk registration finance fields | `registrationService.bulkUpdateFinanceFields` | `registrations/{registrationId}` update | Batched audit per record | Allowed when scoped to one event and finance payload validates |
| Historical attendance | `registrationService.recordHistoricalAttendance` | `registrations/{registrationId}` update | Batch `auditLogs/{logId}` create | Allowed with evidence note; live check-in state is preserved |
| Ticket assignment | `ticketService.saveTicketAssignment` | `registrations/{registrationId}` update | Batch `auditLogs/{logId}` create | Allowed; QR payload remains `GSV:TICKET:{ticketCode}` |
| Ticket unassignment | `ticketService.clearTicketAssignment` | `registrations/{registrationId}` update | Batch `auditLogs/{logId}` create | Allowed when ticket transition is valid |
| Check-in completion | `ticketService.completeCheckIn` | `registrations/{registrationId}` update | Batch `auditLogs/{logId}` create | Allowed for owner/admin; scanner remains assigned-event-only |
| Undo check-in | `ticketService.undoCheckIn` | `registrations/{registrationId}` update | Batch `auditLogs/{logId}` create | Owner/admin only; normal scanner Undo Check-In remains blocked |
| Duplicate check-in attempt | `ticketService.recordDuplicateCheckInAttempt` | `auditLogs/{logId}` create only | Audit-only evidence | Allowed for assigned scanner or owner/admin |
| Operations ledger | `operationsLedgerService` | `operationsLedger/{ledgerEntryId}` create/update | Batch `auditLogs/{logId}` create | Allowed when event-level ledger schema is valid |
| Tasks | `taskService` | `events/{eventId}/tasks/{taskId}` create/update/delete | Batch `auditLogs/{logId}` create | Allowed; event managers remain narrower than owner/admin |
| Documents | `documentService` | `events/{eventId}/documents/{documentId}` create/update/delete | Batch `auditLogs/{logId}` create | Allowed when document schema validates |
| Contacts | `contactService` | `contacts/{contactId}` create/update | Batch `auditLogs/{logId}` create | Allowed when contact schema validates |
| Organizations | `contactService` | `organizations/{organizationId}` create/update | Batch `auditLogs/{logId}` create | Allowed when organization schema validates |
| Event contact links | `contactService` | `events/{eventId}/contactLinks/{linkId}` create/update/delete | Batch `auditLogs/{logId}` create | Allowed when relationship schema validates |
| Access requests | Access workflow | `accessRequests/{requestId}` create/update | Rules-gated workflow state | Requester self-approval remains blocked |
| Staff profiles | Access internals | `staffProfiles/{uid}` create/update/delete | Rules-gated role state | Scanner/admin boundaries remain unchanged |
| Settings access control | Auth and Settings | `settings/accessControl` read | No organizer write path | Protected owner does not depend on mutable `approvedEmails` |
| Reserved collections | Legacy blocked paths | `tickets/{id}`, `checkIn/{id}`, `communications/{id}`, `aiDrafts/{id}` | None | Writes remain denied until a future approved feature adds a matrix row |

## Rules Trace Summary

- `isProtectedOwner()` checks the immutable Firebase UID.
- `isApprovedAdmin()` evaluates `isProtectedOwner()` before the mutable `settings/accessControl.approvedEmails` lookup.
- Business writes still require valid schemas, event scoping, allowed field transitions, and append-only audit logs.
- `auditLogs` can be created but cannot be updated or deleted.
- Scanner writes remain limited to assigned-event check-in completion and duplicate-attempt evidence.

## Production Deployment Requirement

Because Hosting-only deployment cannot update Firestore authorization, the release must deploy:

```text
npx firebase-tools deploy --only firestore:rules --project gathervibeshub
```

Do not deploy Firestore indexes, Functions, Storage, Auth configuration, or broad Firebase targets for this hotfix.

## Manual Owner Write Verification

A full production pass requires an authenticated Jaylan session and a safe `CODEX_DEMO - Full System Walkthrough` write after rules deployment:

1. Open System QA and confirm signed-in UID matches `WcDU2jmbopdAgDlMMWvD3TkqqbC3`.
2. Select `CODEX_DEMO - Full System Walkthrough`.
3. Edit one safe CODEX_DEMO registration field or create a temporary CODEX_DEMO-only business record through the normal UI.
4. Confirm the save succeeds.
5. Confirm an append-only audit log was created.
6. Do not select or modify Cake Piknik Barbados during this verification.

If this browser write verification is not completed, the release result is `PASS WITH REQUIRED MANUAL OWNER WRITE VERIFICATION`.

## Guardrails Preserved

- CPB is not modified.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- `approvedEmails` is not changed.
- Scanner permissions are not expanded.
- Access-request workflows are not activated.
- Firestore indexes are not deployed.
- Dependencies are not changed.
