# Data Model, Security, And Integration Map

Date: 2026-07-29
Branch: `codex/full-current-state-application-map`
Base commit inspected: `a89e60b88068c350ebbf63735754e24577a40b58`

## Firebase Project

Project: `gathervibeshub`

This audit did not deploy Hosting, Firestore rules, Firestore indexes, Functions, Storage, or Authentication configuration. It did not read or write production data.

## Firestore Collections

### `settings/accessControl`

Purpose: Protected allowlist for secondary organizer access.

Important fields:

- `approvedEmails`

Rules:

- Read: approved admin only.
- List/create/update/delete: denied.

Notes:

- The protected owner UID is hardcoded in rules.
- The app does not provide a normal Settings UI to edit `approvedEmails`.

### `events/{eventId}`

Purpose: Event record and event planning container.

Important fields from rules:

- `eventId`
- `eventName`
- `eventDate`
- `location`
- `venueName`
- `eventType`
- `status`
- `eventStartTime`
- `eventEndTime`
- `eventDescription`
- `capacity`
- `ticketPrice`
- `priceTiers`
- `registrationRequired`
- `complimentaryAllowed`
- `doorPaymentAllowed`
- `ticketTypeCount`
- `registrationOpenDate`
- `registrationCloseDate`
- `financialPlan`
- `operationsPlan`
- `readinessChecklist`
- `planningTasks`
- `partnerRecords`
- `notes`
- `createdAt`
- `updatedAt`

Rules:

- Read: approved admin or assigned active event staff roles.
- Create/update/delete: approved admin only.

Product notes:

- This is the anchor for Working Event scope.
- Planning tasks and partner records are embedded on event documents, not separate task/vendor collections.

### `registrations/{registrationId}`

Purpose: Registration record, guest/person count, registration finance, ticket state, and check-in state.

Important fields inferred from rules and services:

- `registrationId`
- `eventId`
- `source`
- `sourceRowId`
- `timestamp`
- `fullName`
- `buyerName`
- `attendeeNames`
- `email`
- `phone`
- `groupName`
- `personsAttending`
- `paymentStatus`
- `paymentMethod`
- `paymentReference`
- `priceTier`
- `ticketPrice`
- `amountDue`
- `amountPaid`
- `balanceDue`
- `notes`
- `ticketStatus`
- `ticketCode`
- `ticketAssignedAt`
- `ticketAssignedBy`
- `checkedIn`
- `checkInTime`
- `checkedInBy`
- `createdAt`
- `updatedAt`

Rules:

- Read: approved admin, assigned event manager, assigned scanner, or assigned viewer for that event.
- Create: approved admin only, with valid registration and initial check-in state.
- Update: approved admin for registration, ticket, and check-in changes; assigned scanner can only complete check-in.
- Delete: approved admin only.

Product notes:

- Registration finance is registration-level data.
- Guest totals derive from `personsAttending`, not from row count alone.
- Ticket assignment and check-in updates are registration mutations with audit-log requirements.

### `auditLogs/{logId}`

Purpose: Append-only audit log for event, registration, ticket, check-in, and Operations mutations.

Rules:

- Read: approved admin only.
- Create: approved admin for allowed audited mutations, or assigned scanner for check-in completion/duplicate attempt.
- Update/delete: denied.

Product notes:

- Audit logs are append-only by rules.
- Historical CPB closeout logs remain protected evidence.

### `operationsLedger/{ledgerEntryId}`

Purpose: Event-level Operations ledger entries.

Important fields inferred from services/rules:

- `ledgerEntryId`
- `eventId`
- `type`
- `category`
- `label`
- `amount`
- `status`
- `method`
- `reference`
- `notes`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

Rules:

- Read: approved admin or assigned operations helper for the entry event.
- Create/update: approved admin only.
- Delete: denied.

Product notes:

- Operations ledger is not the same system as registration payments.
- Registration payment totals should not be automatically added to Operations cash-position totals.

### `staffProfiles/{uid}`

Purpose: Admin-managed staff identity profile.

Rules:

- Read: approved admin or the active staff member reading their own profile.
- List/create/update/delete: approved admin, with owner protection on some role/status changes.

Supported roles:

- `event-manager`
- `scanner`
- `viewer`
- `operations-helper`

### `events/{eventId}/staffAssignments/{uid}`

Purpose: Event-scoped staff assignment.

Rules:

- Read: approved admin or the active assigned user.
- Create/update/delete: approved admin only.

Product notes:

- Scanner access is assigned-event-only.
- There is no collection-group staff assignment query in auth flow; assignments are checked per event path.

### `staffProfiles/{uid}/preferences/onboarding`

Purpose: Per-user onboarding state.

Allowed fields:

- `version`
- `startedAt`
- `completed`
- `completedAt`
- `skippedAt`
- `lastStep`
- `replayRequestedAt`
- `updatedAt`

Rules:

- Read/write: signed-in owner of the UID only.
- Validation allows `lastStep` from 1 to 13.

### `accessRequests/{requestId}`

Purpose: Future access-request workflow schema.

Rules:

- Create: signed-in requester can create a pending valid request.
- Read: approved admin or the requester.
- List/update: approved admin.
- Delete: denied.

Current product status:

- Access workflow controls remain disabled/not productized in normal organizer UI.

### Reserved Collections

Rules deny all reads and writes for:

- `tickets`
- `checkIn`
- `communications`
- `aiDrafts`
- other `settings/{documentId}`
- catch-all unmatched paths

Product meaning:

- Tickets, check-in, and communications are currently implemented on top of event, registration, and local UI state rather than separate live Firestore collections.

## Access Model

Access starts in `AuthProvider`:

- Read `settings/accessControl`.
- Read own `staffProfiles/{uid}`.
- Check `events/{eventId}/staffAssignments/{uid}` for event assignment.
- Resolve default route from access role.

Organizer/admin can use the organizer shell. Scanner access is isolated to `/scanner` and does not expose organizer navigation. Assigned event managers, viewers, and operations helpers have narrower access paths based on role utilities.

## Guardrails

Preserved by current rules/tests/source:

- Default deny catch-all.
- Protected owner UID remains immutable by normal Settings.
- `approvedEmails` remains console-managed.
- Scanner remains assigned-event-only.
- Normal scanner Undo Check-In is not enabled.
- Normal scanner Check Out is not enabled.
- Lead-scanner path is not activated.
- Access request workflow is not activated as a normal admin tool.
- Audit logs are append-only.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- CPB production data remains approval-gated.

## Integrations

### Firebase Authentication

Active:

- Google sign-in.
- Email/password sign-in.
- Auth state restoration.
- Return-path sanitization.

Not changed in this audit.

### Firebase Firestore

Active:

- Events.
- Registrations.
- Operations ledger.
- Staff profiles and assignments.
- Access-control read.
- Audit logs.
- Onboarding preferences.

No production reads or writes were performed for this documentation task.

### Firebase Hosting

Active in project, but not deployed by this task.

### Spreadsheet Import

Active:

- CSV/text import.
- Pasted table rows.
- XLSX workbook parsing through `read-excel-file`.
- Field mapping and preview.

Dependency state expected:

- `xlsx`: absent.
- `read-excel-file@9.2.0`: present.

### Gmail

Current state:

- Gmail evidence appears in historical CPB audit tooling and docs as manually reviewed/imported evidence.
- There is no live Gmail API or OAuth integration in the organizer app.
- Gmail links or private email evidence must not be pasted into normal production records unless an explicit evidence workflow allows safe derived fields.

Future-safe direction:

- Treat Gmail as a private evidence source, not a product surface.
- Any future Gmail integration needs explicit OAuth, privacy scoping, evidence redaction, and organizer approval gates.

### Google Forms

Current state:

- Google Forms-style column headers are supported by import mapping tests.
- There is no live Google Forms API integration or continuous sync.

Future-safe direction:

- Keep imports preview-first.
- Require field mapping, duplicate detection, and explicit organizer confirmation before writes.
- Do not auto-create production registrations from live forms without a separate approved workflow.

### Message Delivery And AI

Current state:

- Message Builder is copy-only.
- The app does not send email, SMS, WhatsApp, or social posts.
- The prompt builder does not call a real AI API.
- Reserved `communications` and `aiDrafts` collections are denied by rules.

## CI And QA

GitHub Actions Daily QA is manual-only:

- `workflow_dispatch`
- `contents: read`
- `npm ci`
- `npm run lint`
- `npm test`
- `npm run build`
- Built auth UI smoke.
- Live HTTP read-only smoke for `/` and `/login`.

Local scripts include:

- `npm run daily:qa`
- `npm run product:routes`
- `npm run product:qa`
- `npm run doctor:json`
- `npm run e2e:smoke`
- `npm run e2e:full`

Daily QA should be run locally from this repository unless GitHub workflow push/permission alignment is resolved.
