# Phase 17D-D Access Workflow Readiness

## 1. Scope

Phase 17D-D is planning and readiness only.

It does not implement:

- live approval workflow
- live revoke workflow
- live staff assignment editing
- live lead-scanner permission
- Firestore rules deployment
- Firestore index deployment

## 2. Approval workflow requirements

- Approval requests must be separate from `approvedEmails`.
- Request records should be explicit documents, not inferred from login failures.
- Required fields should include requester identity, requested role, requested event, status, createdAt, reviewedAt, reviewedBy, and notes.
- Approval UI must be admin-only and must be impossible to reach from scanner/check-in-only routes.
- Approval actions must not become live until Firestore rules, tests, organizer review, and rollback steps are separately approved.

## 3. Revoke and suspend requirements

- Revoke must preserve history.
- Suspend/inactive must remove access without deleting profile history.
- Revoked status must remain visible to admins for auditability.
- Delete-based access removal must not be the default workflow.

## 4. Staff assignment editing requirements

- Assignment editing must stay scoped to `events/{eventId}/staffAssignments/{uid}`.
- Event scoping must remain explicit in UI copy and data shape.
- CPB must remain protected production data and must not be used for QA or workflow rehearsal.
- Assignment editing must not go live until rules prove event-scoped writes are safe.

## 5. Audit log requirements

- All future access workflow writes must produce append-only `auditLogs`.
- Expected action families:
  - `access.request.create`
  - `access.request.approve`
  - `access.request.decline`
  - `staff.profile.create`
  - `staff.profile.update`
  - `staff.assignment.create`
  - `staff.assignment.update`
  - `staff.assignment.revoke`
- Audit entries should record actor, target UID, target eventId when relevant, before/after summaries, and timestamp.
- Clients must never update or delete audit logs.

## 6. Firestore rules review gates

- No live workflow may be implemented before a separate Firestore rules review.
- Rules review must confirm that approvedEmails remains admin-level access only.
- Rules review must confirm that staff/scanner access continues through `staffProfiles/{uid}` plus `events/{eventId}/staffAssignments/{uid}`.
- Rules deployment requires separate explicit approval.
- Firestore indexes remain undeployed unless separately approved.

## 7. Testing requirements

- Add source-level tests before any live workflow work begins.
- Add behavior tests for admin-only visibility and scanner denial.
- Add negative tests for approve/revoke/assignment writes when workflow is not live.
- Preserve tests for:
  - scanner assigned-event-only access
  - scanner no-undo/no-check-out
  - admin undo remains admin-only
  - CPB protection
  - CODEX_TEST-only QA scope
  - QR payload `GSV:TICKET:{ticketCode}`
  - `xlsx` absent
  - `read-excel-file` present

## 8. Rollback plan

- Keep workflow code isolated from the read-only foundation until separately approved.
- Do not mix workflow writes with cosmetic or status-copy changes.
- Preserve a rollback path that removes workflow UI without touching live scanner/admin boundaries.
- Never rely on `approvedEmails` edits as a workaround for workflow defects.

## 9. Manual organizer approval gates

The organizer must separately approve all of the following before any live workflow implementation:

1. Workflow scope
2. Firestore rules review
3. Firestore rules deployment
4. Assignment editing surface
5. Audit log shape
6. Manual smoke checklist
7. Rollback plan

## 10. Pre-live review checklist

Before any live workflow is implemented, review:

- current `AuthProvider` and `ProtectedRoute` access flow
- current `accessRoles` role labels and route limits
- Firestore rules and dry-run result
- scanner/admin route isolation
- QA copy and runtime health wording
- CPB protection
- CODEX_TEST-only smoke guidance
- no public portal/native/payment/function/storage scope creep

## 11. Explicit not-live statements

- No approval workflow is live yet.
- No revoke workflow is live yet.
- No staff assignment editing is live yet.
- No lead-scanner permission is live yet.
- Firestore rules deployment requires separate approval.
