# Protected Owner Application Access Standard

## Immutable Owner Identity

Protected Owner access is pinned to Firebase UID `WcDU2jmbopdAgDlMMWvD3TkqqbC3` for `jaylanspencer99@gmail.com`.

Do not modify the Firebase Auth account, password, MFA, provider, custom claims, disabled state, sessions, `approvedEmails`, or Auth configuration to repair app access.

## Capability Contract

Protected Owner must resolve before lower roles and must not depend on:

- `approvedEmails`
- staff profiles
- event staff assignments
- event manager records
- viewer, scanner, or operations-helper roles
- access requests
- mutable role documents

The central app contract is `ORGANIZER_ROUTE_CAPABILITIES` and `ownerCapabilityMatrix` in `src/utils/accessRoles.js`.

## Authorization Versus Validation

Protected Owner bypasses role and assignment gates only. Protected Owner must still satisfy:

- valid schema
- valid field types
- immutable creation metadata
- selected-event scope
- valid status transitions
- duplicate, payment, ticket, attendance, and relationship validation
- append-only audit requirements

Do not implement a malformed-data bypass.

## Required Regression Procedure

Every release that adds or changes a route, write path, status, relationship, role gate, import path, report, or service payload must verify:

- Protected Owner can view the route.
- Protected Owner can perform the legitimate organizer action.
- Lower roles remain restricted.
- Firestore Rules and service payloads agree.
- Older legitimate records still view and save safely.
- System QA exposes any owner capability mismatch.

Use CODEX_DEMO for synthetic owner write checks. Do not use CPB for synthetic testing.
