# Phase 17D Plan

## 1. Phase 17D-A scope

Phase 17D-A is a planning and readiness phase only. It defines the implementation blueprint for:

- Access & Roles Management Center
- Settings approval-flow planning
- Scanner day-of polish
- Sound and haptic feedback planning
- Scanner success and error UI planning
- Event-day helper ergonomics
- Future lead-scanner role planning only

## 2. Explicitly not implemented yet

- No live approval or revoke workflow
- No lead-scanner permission implementation
- No Firestore rules deployment or index deployment
- No changes to `approvedEmails`
- No new staff users, scanner users, or staff assignments
- No permission broadening
- No QR payload change
- No Cloud Functions, Storage, payment, native app, or public portal work

## 3. Current access model

- `approvedEmails` remains admin-level access only.
- Admin access continues through `settings/accessControl.approvedEmails`.
- Staff/scanner access continues through `staffProfiles/{uid}` plus `events/{eventId}/staffAssignments/{uid}`.
- Scanner/check-in-only remains assigned-event-only check-in access with no undo/check-out.
- Admin undo remains admin-only where already implemented.
- CODEX_TEST remains the only safe QA/smoke event.
- CPB remains protected production data and must never be used for QA.
- QR payload exactly as `GSV:TICKET:{ticketCode}` remains unchanged.

## 4. Role capability matrix

| Role | Dashboard | Settings | Access & Roles | Manage events | View registrations | Edit registrations | Delete registrations | Import data | Assign tickets | Check in | Undo check-in | Scanner route | Operations | QA | Communications | Read audit logs | Update/delete audit logs | Access CPB | Assigned event only | All events |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| owner/admin | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes | No | Yes |
| event manager | Planned assigned-event | No | No | Planned assigned-event | Planned assigned-event | Planned narrow | No | No | No | No | No | No | Planned assigned-event | No | No | Planned assigned-event | No | No by default | Yes | No |
| scanner/check-in-only | No | No | No | No | Yes, assigned-event only | No | No | No | No | Yes, assigned-event only | No | Yes | No | No | No | Append-only check-in audit only | No | No by default | Yes | No |
| viewer/read-only | No | No | No | No | Planned assigned-event read-only | No | No | No | No | No | No | No | Planned assigned-event read-only | No | No | Planned assigned-event read-only | No | No by default | Yes | No |
| operations helper | No | No | No | No | No | No | No | No | No | No | No | No | Planned assigned-event only | No | No | Planned assigned-event operations audit visibility | No | No by default | Yes | No |
| future lead scanner | Planning only | Planning only | Planning only | No | Planning only | No | No | No | No | Planning only | Planning only | Planning only | No | No | No | Planning only | No | No by default | Planning only | No |

## 5. Access & Roles Management Center plan

Future sections:

1. Pending Access Requests
2. Staff Profiles
3. Event Assignments
4. Roles & Capabilities
5. Revoke / Suspend Access
6. Audit Access Changes
7. Scanner Mode
8. Security Notes

Design rule:

- Settings must not rewrite Firestore rules dynamically.
- Firestore rules remain stable, reviewed, and deployed separately.
- The UI should write `staffProfiles` and `staffAssignments` only after rules already allow that safely.

## 6. Pending access request plan

- Request rows should be explicit documents separate from `approvedEmails`.
- Required fields should include requester identity, desired role, requested event, status, createdAt, reviewedAt, reviewedBy, and notes.
- The first implementation should be read-only/admin-visible planning or mock-state only.
- No automatic user creation, approval, or assignment in 17D-A.

## 7. Staff profile management plan

- Staff Profiles section should show UID, email, display name, status, default role, created/updated timestamps, and who changed it.
- Status model remains `active`, `inactive`, `revoked`.
- Default role remains one of `event-manager`, `scanner`, `viewer`, `operations-helper`.
- Profile edits should be admin-only and separately audited when implemented.

## 8. Event assignment management plan

- Event Assignments section should manage `events/{eventId}/staffAssignments/{uid}` only.
- Required fields remain UID, email, eventId, role, status, createdAt, updatedAt, createdBy, updatedBy.
- UI should enforce assigned-event scope clearly and never use CPB for QA.
- No assignment creation or editing in 17D-A.

## 9. Revoke / suspend plan

- Revoke should preserve history instead of deleting documents.
- Inactive should temporarily remove access without losing auditability.
- Revoked should block access and remain visible in admin review history.
- No delete-based access removal should be the default workflow.

## 10. Audit log plan for access changes

- Access changes should create append-only `auditLogs`.
- Planned actions:
  - `access.request.create`
  - `access.request.approve`
  - `access.request.decline`
  - `staff.profile.create`
  - `staff.profile.update`
  - `staff.assignment.create`
  - `staff.assignment.update`
  - `staff.assignment.revoke`
- Audit logs should record actor, target UID, target eventId when relevant, before/after summaries, and timestamp.
- Clients should never update or delete audit logs.

## 11. Scanner day-of polish plan

- Clearer success state after check-in
- Clearer duplicate warning state
- Clearer pending-payment warning language
- Clearer no-ticket warning language
- Faster reset and next-scan flow
- Larger mobile-first buttons and spacing
- Cleaner event-day helper instructions
- Explicit reminder that scanner cannot undo/check out
- Explicit reminder that admin-only undo remains a correction path
- No offline writes

## 12. Sound and haptic feedback plan

- Keep feedback optional and user-visible in UI copy before implementation.
- Success tone should be short and distinct.
- Duplicate and error tones should differ from success.
- Haptic/vibration should be optional and supported only when the device/browser allows it.
- No sound should imply the write failed or succeeded without UI confirmation.

## 13. Scanner success and error UI plan

- Success card should highlight guest name, ticket code, and updated status clearly.
- Duplicate warning should explain that the guest is already checked in and no extra write occurred.
- Pending payment warning should be visible before the check-in action.
- No-ticket warning should be visible without implying ticket assignment is available to scanner users.
- Poor Wi-Fi or connectivity warning should state that offline writes are not supported.

## 14. Lead-scanner role planning only

- Lead scanner is planning-only in 17D-A.
- Possible future differences to evaluate:
  - broader scanner dashboard visibility
  - limited corrective actions
  - event-day helper tools
  - stronger training and audit requirements
- Do not implement lead-scanner permissions, routes, or rules in 17D-A.

## 15. Testing plan

- Keep tests focused on planning/status/documentation behavior.
- Verify `AI_AGENT_RULES.md` exists and is referenced.
- Verify `PHASE_17D_PLAN.md` exists.
- Verify Phase 17C-B stays closed.
- Verify Phase 17D-A is marked active planning only.
- Verify `approvedEmails` remains admin-only in docs and UI copy.
- Verify staff/scanner access remains `staffProfiles` plus `staffAssignments`.
- Verify scanner no-undo and admin undo boundaries remain documented.
- Verify CPB protection, CODEX_TEST QA-only scope, QR payload, `xlsx` absence, and `read-excel-file` presence remain unchanged.

## 16. Firestore rules review gates

- No Firestore rules changes should be made for 17D-A unless a no-op doc/test clarification is required.
- Any future access-center implementation must review rules, tests, UI copy, and docs together.
- Rules changes require dry-run validation before any later deployment request.
- Firestore indexes remain undeployed unless explicitly approved.

## 17. Rollback and safety plan

- Keep planning-only changes isolated to docs, status copy, and tests in 17D-A.
- Do not claim live approval or revoke capability before implementation.
- Preserve current admin and scanner behavior exactly.
- Stop immediately if any change broadens permissions, touches CPB, modifies `approvedEmails`, changes QR payload, or introduces new dependencies.

## 18. Recommended implementation sequence

1. Review and approve the 17D-A blueprint.
2. Choose one narrow implementation track:
   - 17D-B scanner day-of polish only
   - 17D-C Access & Roles read-only/admin UI foundation only
3. Add UI changes behind existing permissions only.
4. Update tests, docs, QA copy, and runtime status together.
5. Re-evaluate any future rules changes as a separate reviewed step.
