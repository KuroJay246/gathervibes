# Phase 17G-A — Live Workflow Go/No-Go Review + Rules Deployment Approval Package

Status: closed, merged-ready, and organizer accepted approval package only  
Branch: `codex/phase-17g-a-live-workflow-go-no-go-rules-approval-package`  
Branch commit: `e098315c29e5b085bdbd11218ce6b5211d2c9832`  
Base main commit: `8801419fb580d7430bf9c29e31807bd6ef4d80e9`

## 1. Scope

Phase 17G-A is a review and approval package only.

It does not:

- deploy Firestore rules
- deploy Firestore indexes
- make the requester workflow live
- make admin approve, decline, or revoke workflow live
- make staff assignment editing live
- make lead-scanner workflow live

## 2. Current main baseline

Current main baseline is `8801419fb580d7430bf9c29e31807bd6ef4d80e9`.

Closed baseline facts to preserve:

- Phase 17E-C / 17E-D / 17E-E are closed, merged, validated, and Hosting-deployed.
- Phase 17F-A / 17F-B / 17F-C are closed, merged, validated, and Hosting-deployed.
- Firestore rules dry-run passed in the closeout batch.
- Firestore rules were not deployed in that closeout batch.
- Firestore indexes were not deployed in that closeout batch.
- `approvedEmails` remains admin-only.
- Access Requests admin UI remains read-only.
- Requester form remains disabled and non-live.
- `accessRequestContract` remains disabled and non-live.
- Scanner remains assigned-event-only with no undo and no check-out.
- CPB remains protected and untouched.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- `xlsx` remains absent and `read-excel-file` remains active.

## 3. What is already live

- Approved-admin login through `settings/accessControl.approvedEmails`
- Live scanner access through deployed `staffProfiles/{uid}` plus `events/{eventId}/staffAssignments/{uid}` for approved scanner users
- Scanner route isolation at `/scanner`
- Admin-only undo where already implemented
- Private admin Hosting deployment
- Existing CODEX_TEST-only scanner rehearsal boundary

## 4. What is not live

- Requester-created `accessRequests` workflow from the app
- Admin approve workflow for access requests
- Admin decline workflow for access requests
- Admin revoke workflow tied to access requests
- Staff profile create/edit workflow from the app
- Staff assignment create/edit workflow from the app
- Lead-scanner workflow
- Public requester route
- Any workflow that edits `approvedEmails`

## 5. What deploying current firestore.rules would change

Deploying the current repository `firestore.rules` would make the server-side `accessRequests/{requestId}` rules live.

That means the deployed rules would allow:

- authenticated users to create their own `pending` access request documents that match the required schema
- authenticated requesters to read their own request documents
- approved admins to get and list access requests
- approved admins to update request status and review metadata to `approved`, `declined`, or `revoked`

That deployment would not, by itself:

- create a public requester route
- enable the disabled requester form to submit
- wire `src/services/accessRequestContract.js` into the UI
- create or edit `staffProfiles/{uid}` automatically
- create or edit `events/{eventId}/staffAssignments/{uid}` automatically
- deploy Firestore indexes

Practical meaning:

- rules deployment would make an `accessRequests` backend write path live for any compliant authenticated client
- the current app UI would still remain non-live for requester submit and admin actions because the UI and contract stay disabled/read-only
- this is still a go/no-go gate because rules deployment would make part of the workflow live at the backend boundary

## 6. Rules deployment go/no-go checklist

- Confirm Firebase project is `gathervibeshub`.
- Confirm branch, commit, and organizer approval reference.
- Confirm `approvedEmails` remains admin-only and unchanged.
- Confirm current `firestore.rules` is reviewed line by line for `accessRequests/{requestId}` behavior.
- Confirm no requester self-approval, self-decline, or self-revoke path exists in rules.
- Confirm no requester path can create or update `staffProfiles` or `staffAssignments`.
- Confirm `auditLogs` remain append-only.
- Confirm CODEX_TEST-only rehearsal boundaries remain intact.
- Confirm CPB remains untouched and inaccessible from any requester/scanner workflow.
- Run `npx -y firebase-tools@latest deploy --only firestore:rules --dry-run --project gathervibeshub`.
- Stop if any contradiction exists between docs, rules, tests, or UI copy.

Go only if organizer explicitly approves the real rules deployment after this review package.

## 7. Index deployment checklist

Default answer: no index deploy unless separately approved.

- Confirm no composite index is required for the current disabled UI state.
- If a future query needs an index, document the exact filter and sort pair first.
- Review `firestore.indexes.json` separately from rules approval.
- Require separate organizer approval before any index deploy.

## 8. Live workflow go/no-go checklist

- Requester form must remain disabled unless separately approved.
- Admin review controls must remain disabled unless separately approved.
- `accessRequestContract` must remain disabled unless separately approved.
- No staff profile write workflow may go live without explicit approval.
- No staff assignment write workflow may go live without explicit approval.
- No lead-scanner workflow may go live without explicit approval.
- No workflow may broaden permissions outside approved scope.
- No workflow may use `approvedEmails` as a shortcut for staff/scanner/requester access.

## 9. Admin smoke checklist

- Approved admin login works.
- `/dashboard` opens.
- `/settings?tab=access` opens.
- Access Requests admin UI remains read-only.
- No AppErrorBoundary fallback appears.
- No approve, decline, revoke, create-profile, or assign-event action is live.
- No CPB exposure appears.

## 10. Scanner smoke checklist

- Scanner login works through the existing live scanner flow.
- Scanner lands on `/scanner`.
- Scanner sees assigned-event-only access.
- Scanner sees CODEX_TEST only for rehearsal.
- Scanner sees no admin navigation.
- Scanner has no undo and no check-out.
- Admin undo remains admin-only where implemented.
- CPB is not visible or accessible.

## 11. Requester-preview smoke checklist

- Requester preview remains disabled.
- No public requester route exists.
- Submit remains disabled.
- No Firestore write occurs.
- No service call occurs.
- No admin review action is triggered from the requester preview.

## 12. CODEX_TEST-only rehearsal rules

- Use CODEX_TEST only for any future access-workflow rehearsal.
- Do not create a separate rehearsal event without explicit organizer approval.
- Do not assign requester or scanner rehearsal to CPB.
- Keep scanner rehearsal assigned-event-only.

## 13. CPB no-touch rules

- Do not use CPB for QA.
- Do not assign scanner access to CPB for rehearsal.
- Do not target CPB in any requester-preview or access workflow path.
- Stop immediately if CPB becomes visible from any related surface.

## 14. approvedEmails admin-only boundary

- `approvedEmails` remains owner/admin access only.
- Do not add staff, scanners, helpers, or requesters to `approvedEmails`.
- Do not use `approvedEmails` to bypass staff profile or assignment workflow.

## 15. Rollback plan

- Record the last known-good `firestore.rules` commit before any future real deploy.
- If access workflow rollout breaks admin or scanner access, roll back rules first when the failure is rules-related.
- Re-run rules dry-run against the rollback candidate before deployment.
- Re-test admin login, scanner login, CODEX_TEST-only assignment visibility, and CPB protection after rollback.
- If UI copy caused confusion, disable or revert UI copy separately from rules rollback.

## 16. No-go triggers

- Firestore rules would be deployed without explicit organizer approval.
- Firestore indexes would be deployed without explicit organizer approval.
- Any live requester submit path appears.
- Any live admin approve, decline, or revoke path appears.
- Any staff profile or assignment write path appears in the app.
- `approvedEmails` is modified for staff/scanner/requester access.
- CPB becomes visible or targetable.
- Scanner loses assigned-event-only isolation.
- Scanner gains undo or check-out.
- `auditLogs` would be updated or deleted.

## 17. Required organizer approvals

- Approval of the 17G-A review package itself
- Approval of the exact Firestore rules diff before any real deploy
- Approval of any index diff before any real deploy
- Approval of live workflow scope before any requester/admin write path goes live
- Approval of manual smoke checklist and rollback operator before any real deploy

## 18. Recommended next phase options

Option 1:

Phase 17G-B — Firestore Rules Deployment Approval + Dry-Run Final Review only.

Option 2:

Phase 17G-C — Live Requester Create Workflow Implementation, disabled behind explicit gate.

Option 3:

Phase 17G-D — Admin Review Workflow Implementation, disabled behind explicit gate.
