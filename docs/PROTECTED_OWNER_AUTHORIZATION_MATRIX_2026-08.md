# Protected Owner Authorization Matrix - 2026-08

## Purpose

Jaylan's owner access must remain available while the app internals evolve. The protected owner identity is pinned by Firebase UID, not by mutable organizer settings:

- Email: `jaylanspencer99@gmail.com`
- Firebase UID: `WcDU2jmbopdAgDlMMWvD3TkqqbC3`

This grant bypasses role and access restrictions only. It must never bypass schema validation, event scoping, destructive-action confirmation, duplicate detection, payment validation, ticket validation, attendance validation, or append-only audit logging.

## Permanent Procedure

Every new organizer feature, route, service, Firestore write path, import path, batch operation, or production correction workflow must update this matrix before release.

Required update steps for each new write path:

1. Add the route, service, collection path, allowed actions, audit requirement, and protected-owner expectation to this document.
2. Add or extend tests proving the protected owner can perform the legitimate write without being listed in `approvedEmails`.
3. Add or extend tests proving invalid data is still rejected for the protected owner.
4. Add or extend tests proving non-owner, scanner, viewer, requester, or anonymous access is not widened.
5. Confirm the write creates or preserves the required append-only audit evidence.
6. Confirm System QA remains able to show the current UID, expected protected UID, UID match, and app owner detection state.
7. Run lint, tests, build, dependency audit, `git diff --check`, and relevant emulator/e2e checks before commit.

Do not add a second owner bypass in page code or service code. The app should resolve owner access through `isProtectedOwnerUser`, `getUserAccessLevel`, and Firestore rules `isProtectedOwner()` inside `isApprovedAdmin()`.

## Current Authorization Matrix

| Area | Route or Service | Firestore path | Legitimate owner actions | Guardrails that still apply |
| --- | --- | --- | --- | --- |
| Events | `/events`, `eventService` | `events/{eventId}` | Create, update, delete with confirmation where exposed | Valid event schema, valid status, no test-event leakage into real totals, audit log required for service writes |
| Event staff assignments | Settings and event access internals | `events/{eventId}/staffAssignments/{uid}` | Create, update, delete staff assignments where UI exposes it | Valid assignment role/status, event scoping, scanner boundaries |
| Tasks | Event planning task workflow | `events/{eventId}/tasks/{taskId}` | Create, update, delete tasks | Valid task schema, assigned manager rules remain narrower than owner/admin |
| Run of Show | `/run-of-show`, `runOfShowService` | `events/{eventId}/runOfShow/{itemId}` | Create, update, status-change, delay, arrival confirmation, delete event-day timeline items | Valid event-scoped timeline schema, valid time order, linked IDs do not grant access, critical markers do not bypass validation, append-only audit required, assigned staff and scanner access denied in this foundation |
| Event Resources | `/resources`, `eventResourceService` | `events/{eventId}/resources/{resourceId}` | Create, update, status-change, delete equipment and supplies records | Valid event-scoped resource schema, quantity validation, shortages derived from confirmed quantity, linked IDs do not grant access, critical markers do not bypass validation, append-only audit required, assigned staff and scanner access denied in this foundation |
| Registrations | `/registrations`, Import Center | `registrations/{registrationId}` | Create, update, delete, import approved rows, correct payment and attendance fields | Valid registration schema, payment formulas, duplicate detection, ticket validation, audit logs |
| Tickets | `/tickets`, check-in services | `tickets/{documentId}` | Issue and update tickets through audited services | QR payload remains `GSV:TICKET:{ticketCode}`, no private payload data |
| Check-In | `/check-in`, `/scanner` boundary | `checkIn/{documentId}` | Organizer/admin attendance corrections where implemented | Scanner remains assigned-event-only; normal scanner Undo Check-In and Check Out remain restricted |
| Audit logs | All write services | `auditLogs/{logId}` | Create append-only audit logs | Update and delete remain denied for everyone |
| Operations Ledger | `/operations`, operations service | `operationsLedger/{ledgerEntryId}` | Create and update event-level money and obligation entries | Registration payments remain separate, valid ledger schema, delete denied |
| Documents | Event documents workflow | `events/{eventId}/documents/{documentId}` | Create, update, delete document references where exposed | Valid URL/type/status/category, event scoping |
| Contacts | Contacts foundation | `contacts/{contactId}` | Create and update contacts | Valid contact schema, delete denied |
| Organizations | Contacts foundation | `organizations/{organizationId}` | Create and update organizations | Valid organization schema, delete denied |
| Event contact links | Contacts foundation | `events/{eventId}/contactLinks/{linkId}` | Create, update, delete event-contact relationships | Valid relationship type/status, event scoping |
| Access requests | Access workflow prototype | `accessRequests/{requestId}` | Admin review updates only if workflow is active | Requesters cannot self-approve; disabled UI controls stay disabled until separately approved |
| Staff profiles | Settings and access internals | `staffProfiles/{uid}` | Create, update, delete staff profiles where exposed | Valid role/status; scanner/admin boundaries remain intact |
| Onboarding preferences | Product tour | `staffProfiles/{uid}/preferences/onboarding` | Owner can update own onboarding preferences as the signed-in user | Own-UID only; valid onboarding schema |
| Settings access control | Auth provider, Settings | `settings/accessControl` | Read current access configuration | Organizer UI cannot create, update, list, or delete this document |
| Disconnected collections | Legacy/blocked paths | `communications/{id}`, `aiDrafts/{id}`, broad `settings/{id}` | None | Writes remain denied unless a future approved feature adds a specific matrix row and tests |

## Current Required Test Coverage

The protected-owner fixture must not depend on `approvedEmails`, a staff profile, or a staff assignment. Tests must confirm:

- Protected owner resolves to `owner-admin` by UID.
- Protected owner can read access control even when not in `approvedEmails`.
- Protected owner can perform representative organizer writes.
- Protected owner is still rejected for invalid schemas.
- Audit logs remain append-only.
- Scanner and viewer permissions are not expanded.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- CODEX_TEST remains the only special QA/test event.

## System QA Requirement

System QA must keep a protected-owner diagnostics section showing:

- signed-in UID;
- expected protected UID;
- UID match;
- app owner detection;
- manual CODEX_TEST owner write verification procedure.

This diagnostic section is for troubleshooting only. It must not expose secrets, tokens, cookies, private keys, or private attendee data.

## Production Verification Procedure

When a production permission-denied issue is being fixed, automated tests are not enough. After deployment, verify with the real Jaylan browser session:

1. Sign in as Jaylan.
2. Open System QA and confirm UID match and app owner detection.
3. Select `CODEX_TEST Live Verification Event`.
4. Perform one safe, reversible business-record write through the affected workflow.
5. Confirm the write succeeds.
6. Confirm the append-only audit log exists.
7. Remove only temporary business records if cleanup is part of the normal workflow.
8. Leave audit logs intact.

If authenticated browser write verification cannot be completed, the release result must be `PASS WITH REQUIRED MANUAL OWNER WRITE VERIFICATION`, not a full production pass.
