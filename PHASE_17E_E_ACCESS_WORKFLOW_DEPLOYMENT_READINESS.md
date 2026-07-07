# Phase 17E-E — Access Workflow Deployment Readiness

Status: active readiness artifact only  
Branch: `codex/phase-17e-cde-access-requests-ui-readiness-ci`  
Base main commit: `c0b96340c993618dea20e430de9004c1a7031543`

## 1. Scope

Phase 17E-E is deployment-readiness and rollback planning only.

It does not implement:

- live approval workflow
- live decline workflow
- live revoke workflow
- live staff assignment editing
- live lead-scanner permission
- Firestore rules deployment
- Firestore index deployment

## 2. Current non-live baseline to preserve

- `approvedEmails` remains admin-level access only.
- Staff/scanner access remains `staffProfiles/{uid}` plus `events/{eventId}/staffAssignments/{uid}`.
- Scanner remains assigned-event-only with no undo/check-out.
- Admin undo remains admin-only where already implemented.
- `accessRequests/{requestId}` remains prototype-only and undeployed in production rules.
- Phase 17E-C is read-only/admin-visible only.
- Phase 17E-D is disabled requester-form preview only.
- CPB remains untouched and unavailable for QA.
- CODEX_TEST remains the only safe QA/smoke event.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- `xlsx` remains absent and `read-excel-file` remains active.

## 3. Deployment gates before any future live workflow

1. Organizer approves the workflow scope.
2. Organizer approves the rules diff separately.
3. Organizer approves any needed index diff separately.
4. Rules unit tests pass.
5. App lint, tests, and production build pass.
6. Firestore rules dry-run passes against project `gathervibeshub`.
7. Hosting-only review deploy passes if UI copy changed.
8. Admin route isolation is verified.
9. Scanner route isolation is verified.
10. Rollback steps are written and reviewed before any live rules deploy.

## 4. Rules deployment checklist for a future approved phase

- Confirm Firebase project is `gathervibeshub`.
- Confirm current branch and commit in the live approval request.
- Confirm `approvedEmails` remains admin-only and unchanged for staff/scanner users.
- Confirm proposed `accessRequests` rules do not allow requester self-approval or self-revocation.
- Confirm proposed workflow cannot create or edit `staffProfiles` or `staffAssignments` without approved-admin authority.
- Confirm `auditLogs` remain append-only.
- Run `npx -y firebase-tools@latest deploy --only firestore:rules --dry-run --project gathervibeshub`.
- Review dry-run output before any real deploy approval.
- Do not deploy Firestore indexes unless separately approved.

## 5. Rules rollback checklist for a future approved phase

- Keep the last known-good `firestore.rules` commit hash recorded before deploy.
- Confirm rollback command and operator before any live rules deploy.
- Revert only rules if the failure is rules-specific.
- Re-run rules dry-run after rollback selection.
- Re-check admin login, scanner login, and route isolation after rollback.
- Confirm CPB is still protected and scanner access is still CODEX_TEST-only where applicable.

## 6. Index review checklist

- Identify whether any future `accessRequests` list query truly needs a composite index.
- Prefer direct document reads and narrow admin list queries before adding indexes.
- If a future query requires an index, document the exact filter/sort pair.
- Review `firestore.indexes.json` separately from workflow/UI changes.
- Do not deploy indexes in 17E-E.

## 7. Data model checklist

Review before any future live workflow:

- `accessRequests/{requestId}` fields:
  - `requesterUid`
  - `requesterEmail`
  - `requestedRole`
  - `requestedEventId`
  - `status`
  - `createdAt`
  - `updatedAt`
  - `reviewedAt`
  - `reviewedBy`
  - `notes`
- `staffProfiles/{uid}` remains the managed approved profile, not the inbound request queue.
- `events/{eventId}/staffAssignments/{uid}` remains the assigned-event authority record.
- `auditLogs` action names remain append-only and explicit.

## 8. Manual smoke checklist for a future approved phase

Admin smoke:

- approved admin login works
- Dashboard opens
- Settings opens
- Access Requests admin surface opens
- no AppErrorBoundary fallback
- no CPB exposure

Requester smoke:

- disabled/non-live preview is clearly labeled before go-live
- no public route exists before separate approval
- no write occurs from preview surfaces

Scanner smoke:

- scanner login still works
- only assigned event is visible
- no admin nav
- no undo/check-out
- CPB not visible

## 9. Organizer approval gates

The organizer must separately approve:

1. workflow scope
2. rules diff
3. rules deploy timing
4. any index diff
5. manual smoke checklist
6. rollback plan
7. closeout wording

## 10. Go / no-go criteria

Go only if all of the following are true:

- rules/tests/build/lint/audit validations pass
- rules dry-run passes
- organizer explicitly approves real rules deployment
- organizer explicitly approves live smoke
- no permission broadening exists outside the approved scope
- CPB remains protected

No-go if any of the following occurs:

- admin login breaks
- scanner login breaks
- CPB becomes visible or assignable incorrectly
- requester can write or review requests without approved-admin authority
- `approvedEmails` is proposed as a workaround
- any workflow requires audit log mutation or deletion

## 11. Rollback paths

### If approval workflow fails

- remove or disable workflow UI first
- revert to the last known-good rules commit if rules caused the failure
- re-verify admin login, scanner login, and read-only access surfaces

### If scanner access breaks

- roll back to the last known-good rules commit immediately
- verify `staffProfiles/{uid}` and `staffAssignments/{uid}` reads again
- confirm scanner remains assigned-event-only with no undo/check-out

### If admin access breaks

- prioritize restoring approved-admin access through the last known-good rules commit
- verify `settings/accessControl.approvedEmails` reads correctly
- re-check `/dashboard`, `/settings`, `/qa`, `/registrations`, `/tickets`, and `/check-in`

### If CPB is exposed

- stop rollout immediately
- roll back rules/UI to the last known-good state
- confirm no scanner or requester path can read or target CPB

## 12. Audit log requirements

- Access workflow writes must create append-only `auditLogs`.
- Clients must never update or delete audit logs.
- Recommended future action families remain:
  - `access.request.create`
  - `access.request.approve`
  - `access.request.decline`
  - `access.request.revoke`
  - `staff.profile.create`
  - `staff.profile.update`
  - `staff.assignment.create`
  - `staff.assignment.update`
  - `staff.assignment.revoke`

## 13. Permanent safety reminders

- `approvedEmails` must remain admin-only.
- Do not use CPB for QA.
- Use CODEX_TEST only for workflow rehearsal and smoke.
- No live workflow exists until a separate approved phase says otherwise.
- Firestore rules are not deployed in 17E-E.
- Firestore indexes are not deployed in 17E-E.
