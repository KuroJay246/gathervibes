# Runbook 2. Permission and Access Failures

## Purpose

Repair access failures involving Protected Owner, approved organizers, staff profiles, staff assignments, and rule/frontend mismatches.

## Symptoms

- Protected Owner denied in Settings or core organizer routes.
- Approved organizer denied despite visible record in Settings.
- Staff profile not recognized.
- Staff event assignment missing or ignored.
- Frontend allows a route but Firestore denies access.
- Firestore allows access that the frontend hides.
- Query denied because Firestore Rules are not filters.

## Severity

High.

## Possible causes

- `settings/accessControl` record mismatch.
- Organizer status not active.
- UID-based Protected Owner bypass missing from app state or misunderstood in diagnosis.
- Inactive `staffProfiles/{uid}`.
- Missing or inactive `events/{eventId}/staffAssignments/{uid}`.
- Query shape too broad for rule visibility.
- Route gate logic drift from Rules.

## Safety warnings

- Never weaken Rules to make a query succeed.
- Never remove or mutate the Protected Owner account as a debugging shortcut.

## Evidence to collect

- Signed-in email and UID.
- Access level resolved in the app.
- Target route and target collection/query.
- Exact Firestore permission error text.
- Relevant Settings screen status.

## First checks

1. Confirm whether the user is Protected Owner, approved organizer, or staff.
2. Confirm organizer status is active in `settings/accessControl`.
3. Confirm staff profile status is active.
4. Confirm event assignment exists and matches the target event.

## Files to inspect

- `src/auth/AuthProvider.jsx`
- `src/utils/accessRoles.js`
- `src/auth/ProtectedRoute.jsx`
- `src/services/accessManagementService.js`
- `src/services/staffManagementService.js`
- `firestore.rules`

## Commands to run

- `npm test`
- `npm run product:qa`
- `npm run admin:verify-production-fixtures` only for safe production reads

## Step-by-step diagnosis

1. For Protected Owner denial, confirm the signed-in UID matches the immutable owner UID and that the app state still marks owner capability true.
2. For approved organizer denial, inspect `approvedEmails`, `rolesByEmail`, and `approvedOrganizerRecords` together; only active records should authorize.
3. For staff denial, confirm both the global profile and event assignment are active and use the same UID/event id pair.
4. If the frontend shows the route but Firestore denies, compare the query or write shape against the relevant rule block and reduce scope rather than broadening Rules.
5. If Firestore would allow but the UI hides, compare `canViewRoute` capability mapping with the Rules-backed intent and update the app contract, not live data.

## Repair options

- Correct stale organizer/staff metadata in approved owner-only settings tooling.
- Correct query scope so Firestore Rules can evaluate it safely.
- Update route/capability logic to match existing Rules when the backend contract is already correct.
- Document unsupported legacy records as `UNKNOWN — REQUIRES FUTURE VERIFICATION` if proof is missing.

## Verification

- Target user reaches only the routes their role should support.
- Matching Firestore reads/writes succeed or fail exactly as intended.
- Settings still prevents disabling or removing Protected Owner.

## Rollback

- Revert the route/access logic change or restore prior approved organizer metadata.

## Escalation conditions

- Protected Owner cannot recover access.
- A fix would require broadening Rules without narrow proof.
- The same query must read mixed-visibility documents.

## Search keywords

- missing or insufficient permissions
- protected owner denied
- approved organizer denied
- staff assignment missing
- rules are not filters

## Related tests

- `tests/protected-owner-authorization-matrix.test.js`
- `tests/settings-access-management.test.js`
- Rules tests covering registrations, tasks, documents, contacts, run-of-show, and resources

## Related manual sections

- Firebase Authentication
- Permissions and Security Rules
- Settings and staff access guidance
