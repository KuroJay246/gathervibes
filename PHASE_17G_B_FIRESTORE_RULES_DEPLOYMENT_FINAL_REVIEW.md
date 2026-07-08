# Phase 17G-B - Firestore Rules Deployment Approval + Dry-Run Final Review

Status: closed after organizer review PASS, merged-ready, accepted final review only, and dry-run-only  
Branch: `codex/phase-17g-b-firestore-rules-deployment-final-review`  
Branch commit: `c998700d7882c3c5feaa52f59e9f21fd57c72b10`  
Base main commit: `7f54a217adcac954d200a9ba7606fed521369e77`  
Last deployed-rules comparison baseline: `dc62cade23313eb0ab6a3b06d5318c379b8a4cbb`  
Comparison method: git-history baseline only; `firebase-tools` help in this workflow did not expose a Firestore rules fetch/get command for pulling the currently deployed rules text directly

## 1. Scope

Phase 17G-B is closed after organizer review PASS as final review only.

It does not:

- deploy Firestore rules
- deploy Firestore indexes
- make requester submit live
- make admin approve, decline, or revoke workflow live
- make staff profile or staff assignment editing live
- make lead-scanner workflow live

Organizer review PASS accepted:

- `PHASE_17G_B_FIRESTORE_RULES_DEPLOYMENT_FINAL_REVIEW.md`
- the git-history-based deployed-rules comparison
- last deployed rules baseline `dc62cade23313eb0ab6a3b06d5318c379b8a4cbb`
- current undeployed `accessRequests/{requestId}` rules prototype delta
- the line-by-line `firestore.rules` review
- the GO / HOLD / NO-GO matrix
- the dry-run command pack
- the rollback warning
- the Phase 17G-B2 recommended next gate

Phase 17G-B did not:

- deploy Firestore rules
- deploy Firestore indexes
- make requester submit live
- make admin approve, decline, or revoke workflow live
- make staff profile or staff assignment editing live
- make lead-scanner workflow live

## 2. Current baseline to preserve

- Phase 17G-A is closed, merged-ready, and organizer accepted as the approval package only.
- Firestore rules were not deployed in 17G-A.
- Firestore indexes were not deployed in 17G-A.
- The currently live scanner/staff rules baseline still comes from the reviewed staff-role rules later deployed in Phase 17C-B2.
- `approvedEmails` remains admin-only.
- Access Requests admin UI remains read-only.
- Requester preview remains disabled/not live.
- `src/services/accessRequestContract.js` remains disabled/not live.
- Scanner remains assigned-event-only with no undo and no check-out.
- Admin undo remains admin-only where already implemented.
- CPB remains untouched and off-limits for QA.
- CODEX_TEST remains the only safe QA/smoke event.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- `xlsx` remains absent and `read-excel-file` remains active.

## 3. How deployed-vs-repository comparison was established

- `git log -- firestore.rules` shows the last two relevant modern rules-file changes as:
  - `dc62cade23313eb0ab6a3b06d5318c379b8a4cbb` for the staff-role foundation rules
  - `dc108e18a5c5efd9cd3c283daeaeed1d440a45d9` for the undeployed `accessRequests/{requestId}` prototype
- Phase 17C-B2 deployed reviewed scanner/staff rules after the 17B/17C review cycle.
- Phase 17E-B changed repository `firestore.rules` but was explicitly dry-run only and did not deploy those later changes.
- `npx -y firebase-tools@latest --help` in this workflow exposed deploy, database, and index commands but no Firestore rules fetch/get command for retrieving the deployed rules text directly.

Result:

- The deployed-baseline comparison in 17G-B is git-history-based, not remote-rules-text-based.
- The best supported last deployed baseline is `dc62cade23313eb0ab6a3b06d5318c379b8a4cbb`.

## 4. What changed in repository rules after the last deployed baseline

Compared with `dc62cade23313eb0ab6a3b06d5318c379b8a4cbb`, the current repository `firestore.rules` adds only the access-request prototype surface:

- data-model comments for `accessRequests/{requestId}`
- `validRequestedRole`
- `validAccessRequestStatus`
- `validAccessRequest`
- `accessRequestImmutableFieldsUnchanged`
- `accessRequestReviewFieldsValid`
- `match /accessRequests/{requestId}`

No other collections, live scanner rules, approved-admin boundary, audit-log append-only behavior, or existing event/registration/operations rules changed after that deployed baseline.

## 5. Current firestore.rules line-by-line deployment review

| Line range | Current repository behavior | Would change if deployed now? | Review notes |
| --- | --- | --- | --- |
| 5-47 | Documents the Gather & Savor collections, including the prototype `accessRequests/{requestId}` shape. | No direct runtime effect | Comment-only section; the added `accessRequests` note is documentation, not an allow rule. |
| 48-95 | Signed-in, approved-admin, active-staff-profile, and assigned-role helpers. | No | These helpers already support the live scanner/admin boundary. |
| 97-191 | Shared validators for IDs, strings, staff profiles, and staff assignments. | No | Existing live scanner/staff model remains unchanged. |
| 193-259 | Access-request-specific validators and immutable/review checks. | Yes | These helpers are only exercised if the current repository rules are deployed. |
| 261-338 | Event schema validation. | No | No deploy delta versus the deployed baseline. |
| 340-733 | Registration, audit-log, ticket, check-in, and operations validation helpers. | No | Existing live check-in and audit protections remain unchanged. |
| 736-739 | `settings/accessControl` admin-only read boundary. | No | `approvedEmails` remains read-only from clients and admin-only in meaning. |
| 741-757 | `events/{eventId}` read/write rules. | No | Existing live event access surface remains unchanged. |
| 759-788 | `events/{eventId}/staffAssignments/{uid}` read/admin-write rules. | No | Existing live scanner assignment enforcement remains unchanged. |
| 790-824 | `registrations/{registrationId}` read/update rules, including scanner check-in and admin undo separation. | No | Scanner stays assigned-event-only; normal scanner still has no undo/check-out. |
| 826-856 | `auditLogs/{logId}` append-only create rules with scanner duplicate/check-in coverage. | No | Append-only behavior remains intact; no delete/update path exists. |
| 858-870 | `operationsLedger/{ledgerEntryId}` admin and operations-helper rules. | No | No deploy delta versus the deployed baseline. |
| 872-894 | `accessRequests/{requestId}` requester/admin rules. | Yes | This is the only backend surface that would newly become live if current repository rules were deployed. |
| 896-915 | `staffProfiles/{uid}` admin-write and self-read rules. | No | Existing live staff-profile rules remain unchanged. |
| 917-940 | Reserved collections and default deny. | No | Fallback deny remains intact. |

## 6. What would become live if current repository rules were deployed

Deploying the current repository `firestore.rules` would make the backend `accessRequests/{requestId}` rules live for compliant authenticated clients.

That would allow:

- an authenticated requester to create their own `pending` access request document that matches the required schema
- that requester to read their own request document
- approved admins to get and list access requests
- approved admins to update request status and review metadata to `approved`, `declined`, or `revoked`

That deployment would not, by itself:

- enable requester submit in the current app UI
- make a public requester route exist
- wire `src/services/accessRequestContract.js` into the live UI
- create `staffProfiles/{uid}`
- create `events/{eventId}/staffAssignments/{uid}`
- broaden `approvedEmails`
- deploy Firestore indexes

## 7. What remains intentionally non-live even after this review

- requester-created workflow from the app UI
- admin approve, decline, and revoke actions from the app UI
- staff profile create/edit workflow from the app UI
- staff assignment create/edit workflow from the app UI
- lead-scanner workflow
- any `approvedEmails` editing workflow
- any CPB QA path

## 8. GO / HOLD / NO-GO matrix

| Decision area | Current 17G-B result | Reason |
| --- | --- | --- |
| Review package completeness | GO | The current repository rules, last deployed baseline, dry-run command pack, no-go criteria, and rollback warning were documented and organizer-accepted in Phase 17G-B. |
| Real Firestore rules deploy in 17G-B | HOLD | This phase is dry-run final review only. Real deploy requires explicit next-step authorization. |
| Real Firestore index deploy in 17G-B | HOLD | No index deploy is approved in this phase. |
| Immediate no-go conditions | NO-GO if triggered | Stop if project mismatch, rules/index deploy attempt without explicit approval, CPB exposure, permission broadening, `approvedEmails` workaround, QR payload change, or audit-log mutation appears. |

## 9. Dry-run command pack

- `git status`
- `git log --oneline --decorate -8`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm audit --omit=dev`
- `npm ls xlsx`
- `npm ls read-excel-file`
- `npx -y firebase-tools@latest deploy --only firestore:rules --dry-run --project gathervibeshub`

## 10. Permanent safety reminders

- `approvedEmails` must remain admin-only.
- Do not add staff, scanners, helpers, or requesters to `approvedEmails`.
- Do not touch CPB for QA or rehearsal.
- Do not change couplebook-specific paths, UIDs, or email identities as part of this review.
- Do not change QR payload format.
- Do not add dependencies.
- Do not delete or mutate `auditLogs`.
- Do not deploy Firestore indexes in this phase.

## 11. Recommended next gate

Phase 17G-B2 - Explicit Firestore Rules Deploy Authorization + Real Deploy + Immediate Smoke only.
