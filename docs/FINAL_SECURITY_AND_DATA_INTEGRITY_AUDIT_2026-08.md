# Final Security and Data Integrity Audit - 2026-08

## Classification

Security classification: `Stable for continued real use`.

Data-integrity classification: `Stable with normal organizer safeguards`.

## Protected Owner

`jaylanspencer99@gmail.com` is protected by Firebase UID `WcDU2jmbopdAgDlMMWvD3TkqqbC3`.

Evidence:

- `src/config/protectedOwner.js` defines the protected owner UID and email.
- `firestore.rules` grants `isProtectedOwner()` before mutable `approvedEmails`.
- `src/auth/AuthProvider.jsx` grants protected-owner admin access even if the mutable access-control document is unavailable.
- `tests/phase23o-protected-owner-access.test.js` verifies protected owner access by UID, verifies email alone is insufficient, verifies immutable Settings presentation, and verifies Firestore Rules grant owner UID first.

Conclusion: Jaylan retains Firestore/admin permission through an immutable UID-based owner grant even when internal approval lists are edited.

## Role Capability Matrix

| Role | Read Capabilities | Write Capabilities | Event Scope | Restricted Routes |
| --- | --- | --- | --- | --- |
| Protected Owner | All organizer data allowed by rules. | Full organizer writes plus protected-owner access management constraints. | All events. | None within organizer app. |
| Approved Organizer | Organizer routes and event data. | Events, registrations, payments, tickets, check-in corrections, Operations, tasks, imports, response review, settings where implemented. | All non-rules-restricted organizer scope. | Scanner standalone only if navigated directly; no special staff-only restrictions needed. |
| Event Manager | Assigned-event dashboard/task/check-in surfaces where allowed. | Limited task/check-in workflows. | Assigned events only. | Settings, imports, payments, tickets, reports, full admin shell. |
| Viewer | Assigned read-only surfaces where implemented. | None intended. | Assigned events only. | Most organizer write routes. |
| Scanner | Assigned-event scanner/check-in lookup and completion. | Check-in completion only where rules allow. | Assigned event only. | Payments, settings, tasks, reports, tickets management, imports, admin shell, undo, check-out. |
| Operations Helper | Assigned-event Operations visibility. | No Operations writes; organizer-only. | Assigned events only. | Settings, registrations, payments, tickets, reports, imports, scanner. |
| Unapproved User | No organizer data. | None. | None. | Protected routes. |

## Write-Path Matrix

| Route | Action | Collection/Path | Permission Check | Validation | Audit Pairing | Batch/Transaction | Failure/Retry | Event Scope |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/events` | Create/update/delete event | `events/{eventId}` | Approved admin/protected owner | Event fields/status/test-event contract | Yes | `writeBatch` | Operation fails atomically | Event document |
| `/settings` | Staff profile changes | `staffProfiles/{uid}` | Approved admin/protected owner with immutable owner restrictions | Role/status schema | Rules-backed | Direct/rules enforced | Client rejection | User/profile |
| `/events` or access tools | Staff assignment changes | `events/{eventId}/staffAssignments/{uid}` | Approved admin/protected owner | Assignment role/status/event match | Rules-backed | Direct/rules enforced | Client rejection | Assigned event |
| `/tasks` | Task CRUD/status | `events/{eventId}/tasks/{taskId}` | Admin or assigned event manager where allowed | Task field schema and status | Yes | `writeBatch` | Atomic | Selected event |
| `/registrations` | Registration CRUD | `events/{eventId}/registrations/{registrationId}` | Approved organizer | Registration/payment/ticket field validation | Yes | `writeBatch` | Atomic | Selected event |
| `/payments` | Single payment change | Registration document | Approved organizer | Amount/status/method/reference rules | Yes | `writeBatch` | Atomic | Selected event |
| `/payments` | Bulk payment update | Registration documents | Approved organizer | Per-row validation | Yes per changed record | Chunked `writeBatch` | Retry remaining in-session | Selected event |
| `/tickets` | Assign/regenerate ticket | Registration document | Approved organizer | Unique ticket code, QR privacy | Yes | `writeBatch` | Atomic | Selected event |
| `/check-in` and `/scanner` | Check-in completion | Registration document | Organizer or assigned scanner | Ticket/registration/duplicate checks | Yes | `writeBatch` | Duplicate blocked | Selected/assigned event |
| `/check-in` | Undo/manual/historical correction | Registration document | Organizer only | Attendance evidence type separation | Yes | `writeBatch` | Atomic | Selected event |
| `/operations` | Ledger entry create/update/cancel | `events/{eventId}/operationsLedger/{entryId}` | Approved organizer | Money/category/status validation | Yes | `writeBatch` | Atomic | Selected event |
| `/imports` | Import commit | Registration/task/operations targets | Approved organizer | Preview-first mapping and validation | Yes per imported row | Chunked `writeBatch` | Partial success and Retry Remaining | Selected event |
| `/imports` | Response Inbox review status | Response inbox records | Approved organizer | Review-only states | Review trail where implemented | Direct/update | No automatic destination write | Selected event/source |
| Tutorial | Onboarding preference | User onboarding document | Signed-in user for own UID | Lightweight state | No business audit needed | `setDoc` merge | Non-critical local/user state | User |
| Business services | Audit log append | `auditLogs/{logId}` | Same actor as paired business write | Protected field/rules validation | Append-only target | Batched with business write | Update/delete rejected | Event/action |

## Data-Integrity Boundaries

- Registration payments are not Operations income.
- Operations ledger difference is not final profit.
- Missing reconciliation evidence is not the same as unpaid.
- Historical attendance evidence is not scanner-confirmed check-in.
- In-kind support is not cash.
- Outstanding commitment is not paid expense.
- Completed event status does not make a real event read-only.
- CODEX_TEST is the only special test event classification.

## Guardrails Confirmed

- Audit logs remain append-only.
- Protected audit fields cannot be client-forged according to rules/tests.
- Test-event controls do not weaken real-event security.
- Scanner has no payments/settings/tasks/reports access.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- Firestore rules and indexes were inspected but not modified.
