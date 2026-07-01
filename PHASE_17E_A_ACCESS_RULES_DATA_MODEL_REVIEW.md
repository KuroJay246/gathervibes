# Phase 17E-A — Access Workflow Rules + Data Model Review

Status: review-only  
Branch: `codex/phase-17e-a-access-workflow-rules-data-model-review`  
Base main commit: `b2070f5656d28ec76919c3d12e5401ece7d419b2`

## Scope

Phase 17E-A is limited to rules and data-model review readiness. It does not implement a live approval workflow, revoke workflow, staff assignment editing workflow, lead-scanner permission, Firestore rules deployment, or Firestore indexes deployment.

## Current live baseline to preserve

- Phase 17D-C is closed and merged as a read-only/admin UI foundation only.
- Phase 17D-D is closed and merged as workflow/rules-readiness planning only.
- Organizer admin review PASS is preserved.
- Organizer scanner review PASS is preserved.
- `approvedEmails` remains admin-level access only.
- Staff/scanner access remains `staffProfiles/{uid}` plus `events/{eventId}/staffAssignments/{uid}`.
- Scanner remains assigned-event-only with no undo/check-out.
- Admin undo remains admin-only where already implemented.
- Firestore rules are not being deployed in this phase.
- Firestore indexes are not being deployed in this phase.
- CPB remains untouched.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- `xlsx` remains absent and `read-excel-file` remains active.

## Firestore baseline reviewed

- Firebase project: `gathervibeshub`
- Firestore database: `(default)` standard native database
- Current live client auth gate reads:
  - `settings/accessControl`
  - `staffProfiles/{uid}`
  - `events/{eventId}/staffAssignments/{uid}`
- Current scanner assignment lookup remains pinned to CODEX_TEST in client auth flow.

## Reviewed model surfaces

### 1. `staffProfiles/{uid}`

Current validated fields:

- `uid`
- `email`
- `displayName`
- `status`
- `defaultRole`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

Review result:

- Current model is sufficient for approved live scanner/staff admission checks.
- It is intentionally admin-managed and already supports `active`, `inactive`, and `revoked`.
- It should remain the durable identity/profile record and should not be overloaded with pending-request workflow state.

Recommendation for later workflow phase:

- Keep pending access-request state outside `staffProfiles/{uid}`.
- Preserve `staffProfiles/{uid}` as the approved-or-managed profile, not the inbound request queue.

### 2. `events/{eventId}/staffAssignments/{uid}`

Current validated fields:

- `uid`
- `email`
- `eventId`
- `role`
- `status`
- optional `permissions`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

Review result:

- Current assignment model is appropriate for assigned-event enforcement.
- Role validation is already constrained to:
  - `event-manager`
  - `scanner`
  - `viewer`
  - `operations-helper`
- Optional `permissions` exists in schema but is not yet a live workflow surface.

Recommendation for later workflow phase:

- Keep role assignment authoritative at the assignment document.
- Do not use `permissions` as an unreviewed escape hatch for broader access.
- If permission flags are introduced later, validate them narrowly and document each one explicitly before deployment.

### 3. Access-request workflow documents

Review result:

- Pending requests should be separate from `approvedEmails`, `staffProfiles`, and `staffAssignments`.
- A separate request collection is the cleanest boundary for approval/revoke workflows.

Recommended later shape:

- A dedicated access-request document per request or per user/event request.
- Request documents should capture requester identity, requested role, requested event scope, status, and audit metadata.
- Approval should create or update `staffProfiles/{uid}` and `staffAssignments/{uid}` through the approved workflow phase only.

This phase does not create the collection or deploy rules for it.

## Audit log review

Current live audit log behavior:

- `auditLogs/{logId}` is append-only.
- Scanner writes remain narrowly constrained to:
  - `checkin.complete`
  - `checkin.duplicate-attempt`
- Admin undo remains `checkin.undo`.

Review result:

- Access workflow changes must preserve append-only logging.
- Access workflow must not require audit-log mutation or deletion.

Recommended future action names:

- `access.request.create`
- `access.request.approve`
- `access.request.revoke`
- `staff.profile.create`
- `staff.profile.update`
- `staff.assignment.create`
- `staff.assignment.update`
- `staff.assignment.revoke`

These names are review recommendations only in 17E-A.

## Firestore rules review

Current rules already enforce:

- approved-admin boundary through `settings/accessControl.approvedEmails`
- active `staffProfiles/{uid}` gating
- active assigned-event `staffAssignments/{uid}` gating
- scanner assigned-event registration read/check-in only
- append-only audit log writes
- admin-only writes for profile and assignment documents

Review result:

- Existing live rules are consistent with the current scanner/admin baseline.
- A future workflow phase should add request-document rules separately instead of weakening current admin/staff boundaries.
- `approvedEmails` must remain admin-level only and must not become a workflow workaround.
- No rule path should allow scanner access to CPB without explicit assignment.

## Index review

No Firestore index deployment is part of 17E-A.

Preliminary review:

- Current auth reads are direct document reads and do not need new indexes.
- Future access-request list/review views may require indexes later depending on sort/filter choices.
- Any future index work should be reviewed as a separate approval step and deployed only when explicitly authorized.

## Safety blockers carried forward

- No live approval workflow
- No live revoke workflow
- No live staff assignment editing
- No lead-scanner implementation
- No Firestore rules deploy
- No Firestore indexes deploy
- No `approvedEmails` modifications for staff/scanner access
- No CPB QA
- No scanner CPB assignment
- No `auditLogs` delete/update
- No QR payload change
- No dependency additions

## Output of Phase 17E-A

Phase 17E-A closes only after rules/data-model review is accepted. Any live workflow, rules deployment, index deployment, or permission broadening belongs to a later explicitly approved phase.
