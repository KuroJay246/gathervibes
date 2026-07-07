# Phase 17F-A - Access Workflow Implementation Plan

Status: active planning artifact only  
Branch: `codex/phase-17e-cde-access-requests-ui-readiness-ci`  
Starting branch head: `ca93b260e4b8c9d3e80041f095029dde79bf6794`

## 1. Scope

Phase 17F-A is implementation planning only.

It does not implement:

- live approval workflow
- live decline workflow
- live revoke workflow
- live staffProfile creation or editing
- live staffAssignment creation or editing
- live lead-scanner permission
- Firestore rules deployment
- Firestore indexes deployment

## 2. Preserved live boundaries

- `approvedEmails` remains admin-level access only.
- Staff/scanner access remains `staffProfiles/{uid}` plus `events/{eventId}/staffAssignments/{uid}`.
- Scanner remains assigned-event-only with no undo/check-out.
- Admin undo remains admin-only where already implemented.
- `accessRequests/{requestId}` remains non-live from the app surface.
- Phase 17E-C remains read-only/admin-visible only.
- Phase 17E-D remains disabled requester-form preview only.
- Phase 17E-E remains deployment-readiness and rollback planning only.
- CPB remains untouched and unavailable for QA.
- CODEX_TEST remains the only safe smoke and rehearsal event.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- `xlsx` remains absent and `read-excel-file` remains active.

## 3. Future approval workflow sequence

1. Request exists in `accessRequests/{requestId}` with `status == pending`.
2. Approved admin reviews the request from an admin-only queue.
3. Approved admin verifies requested role, requested event, requester identity, and notes.
4. Approved admin records review decision metadata.
5. Future approved path creates or updates `staffProfiles/{uid}`.
6. Future approved path creates or updates `events/{eventId}/staffAssignments/{uid}` only for the approved event scope.
7. Future approved path updates the request status to `approved`.
8. Future approved path appends audit logs for request approval and any profile or assignment writes.

## 4. Future decline workflow sequence

1. Request exists in `accessRequests/{requestId}` with `status == pending`.
2. Approved admin reviews the request.
3. Approved admin records decline notes and reviewer identity.
4. Future decline path updates the request status to `declined`.
5. No `staffProfiles` or `staffAssignments` write occurs from a decline.
6. Future decline path appends an audit log for the decline action.

## 5. Future revoke workflow sequence

1. Approved admin selects an already-approved staff member or assignment.
2. Approved admin confirms the revoke target and event scope.
3. Future revoke path updates assignment status or profile status without deleting history.
4. Related access request status may move to `revoked` if the revoke is tied to a prior request record.
5. Future revoke path appends audit logs for the revoke action and any staff profile or assignment status change.
6. Audit history remains append-only; no request, profile, assignment, or audit-log deletion is allowed.

## 6. Future staffProfile create/update sequence

1. Resolve target UID from the approved Auth user.
2. Verify approved-admin authority.
3. Create or update `staffProfiles/{uid}` with `uid`, `email`, `displayName`, `status`, and `defaultRole`.
4. Preserve immutable identity fields after initial creation unless separately approved.
5. Append audit logs for `staff.profile.create` or `staff.profile.update`.

## 7. Future staffAssignment create/update sequence

1. Verify approved-admin authority.
2. Verify target event is intended and not CPB for smoke or rehearsal.
3. Create or update `events/{eventId}/staffAssignments/{uid}` with role, status, timestamps, and reviewer metadata where needed.
4. Keep scanner assignment scoped to the assigned event only.
5. Do not grant undo/check-out to scanner/check-in-only.
6. Append audit logs for `staff.assignment.create`, `staff.assignment.update`, or `staff.assignment.revoke`.

## 8. Audit log actions required

- `access.request.create`
- `access.request.approve`
- `access.request.decline`
- `access.request.revoke`
- `staff.profile.create`
- `staff.profile.update`
- `staff.assignment.create`
- `staff.assignment.update`
- `staff.assignment.revoke`

## 9. Security boundaries

- Only approved admins may review or action requests.
- Requesters must not self-approve, self-decline, self-revoke, or create profile or assignment records.
- `approvedEmails` must not be used as a workaround for staff/scanner access.
- `auditLogs` must remain append-only.
- CPB must stay protected and unavailable for scanner rehearsal or QA.
- Any future requester route must remain non-public until separately approved.
- Any live workflow must be backed by reviewed Firestore rules, not UI visibility alone.

## 10. No-live-workflow statement

No live approval, decline, revoke, profile-edit, assignment-edit, or lead-scanner workflow is implemented in Phase 17F-A.

## 11. No-rules-deploy statement

Firestore rules are not deployed in Phase 17F-A.

## 12. No-index-deploy statement

Firestore indexes are not deployed in Phase 17F-A.

## 13. CPB protection statement

CPB remains protected production data. Do not target CPB for access workflow rehearsal, assignment tests, or QA smoke.

## 14. CODEX_TEST-only smoke statement

Any future manual rehearsal tied to this workflow must stay on CODEX_TEST only until a separately approved live phase says otherwise.

## 15. approvedEmails admin-only statement

`approvedEmails` remains admin-level access only. Do not add staff, scanners, helpers, or requesters to `approvedEmails`.
