# Authentication and Login Runbook

## Symptoms

Login loops, popup failure, redirect failure, stale return path, account signs in but remains unauthorized, or Firebase Auth persistence fails.

## Likely Causes

- Unauthorized Firebase Auth domain.
- Popup blocked or cancelled.
- Redirect state stale.
- Auth persistence failure.
- User authenticated but not approved in Gathetr access model.

## Severity

High when it blocks owner, organizer, staff, scanner, payment, ticket, or check-in work. Medium when isolated to local development.

## First Checks

1. Confirm branch and clean tree: `git status --short --branch`.
2. Confirm Firebase project target before any production command.
3. Read browser Console and Network errors before changing code.
4. Reproduce on CODEX_DEMO or local emulator data. Do not use CPB for synthetic writes.

## Files To Inspect

- src/auth/AuthProvider.jsx
- src/auth/authFlow.js
- src/lib/firebase.js
- firebase.json
- .firebaserc

## Commands To Run

- npm test -- tests/auth-reliability.test.js
- npm run product:qa

## Diagnostic Steps

1. Capture the exact route, account, Working Event, and visible error.
2. Compare frontend route/access behavior with Firestore rule behavior.
3. Check tests that cover the affected feature.
4. If the issue involves production, collect read-only evidence first.

## Repair Options

- Keep popup/redirect fallback behavior intact.
- Verify Firebase authorized domains.
- Repair access data through Settings/Protected Owner path, not hardcoded frontend lists.

## Verification

Run the narrow test first, then `npm run lint`, `npm test`, `npm run build`, and `npm run product:qa` where safe.

## Rollback

Use Git to revert only the bad commit or restore the previous Firebase Hosting/Rules version. Do not use `git reset --hard` over owner work.

## Search Keywords

Firebase Auth popup redirect auth/persistence-failed authorized domain onAuthStateChanged
