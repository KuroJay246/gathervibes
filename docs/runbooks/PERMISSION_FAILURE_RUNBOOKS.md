# Permission Failure Runbooks

## Symptoms

A signed-in user sees an access denied page, Firestore reports missing or insufficient permissions, owner controls disappear, staff cannot access an assigned event, or scanner check-in fails.

## Likely Causes

- Access record inactive, removed, or not normalized.
- Staff profile missing or inactive.
- Event assignment missing, inactive, wrong UID, or wrong eventId.
- Frontend route gate and Firestore rule differ.
- Query is too broad for rules.

## Severity

High when it blocks owner, organizer, staff, scanner, payment, ticket, or check-in work. Medium when isolated to local development.

## First Checks

1. Confirm branch and clean tree: `git status --short --branch`.
2. Confirm Firebase project target before any production command.
3. Read browser Console and Network errors before changing code.
4. Reproduce on CODEX_DEMO or local emulator data. Do not use CPB for synthetic writes.

## Files To Inspect

- src/auth/AuthProvider.jsx
- src/utils/accessRoles.js
- firestore.rules
- src/services/accessManagementService.js
- src/services/staffManagementService.js
- src/components/AssignedEventGate.jsx

## Commands To Run

- npm test -- tests/settings-access-management.test.js
- npm test -- tests/protected-owner-authorization-matrix.test.js
- npm run product:qa

## Diagnostic Steps

1. Capture the exact route, account, Working Event, and visible error.
2. Compare frontend route/access behavior with Firestore rule behavior.
3. Check tests that cover the affected feature.
4. If the issue involves production, collect read-only evidence first.

## Repair Options

- Normalize access metadata without weakening rules.
- Add or restore active staff assignment only for the correct event.
- Fix frontend display if it claims access that rules deny.
- Fix Firestore Rules only with emulator tests.

## Verification

Run the narrow test first, then `npm run lint`, `npm test`, `npm run build`, and `npm run product:qa` where safe.

## Rollback

Use Git to revert only the bad commit or restore the previous Firebase Hosting/Rules version. Do not use `git reset --hard` over owner work.

## Search Keywords

Firebase missing or insufficient permissions approvedEmails staffProfiles staffAssignments Protected Owner UID
