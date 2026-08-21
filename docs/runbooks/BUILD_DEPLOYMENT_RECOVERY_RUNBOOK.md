# Build, Deployment, and Recovery Runbook

## Symptoms

Build fails locally, production blank page, stale dynamically imported module, wrong Firebase project, emulator port taken, or deployment regression.

## Likely Causes

- Dependency mismatch.
- Stale browser cache after Hosting deploy.
- Wrong Firebase project selected.
- Emulator ports 8080/9099 already in use.
- Firestore Rules deployed without matching tests.

## Severity

High when it blocks owner, organizer, staff, scanner, payment, ticket, or check-in work. Medium when isolated to local development.

## First Checks

1. Confirm branch and clean tree: `git status --short --branch`.
2. Confirm Firebase project target before any production command.
3. Read browser Console and Network errors before changing code.
4. Reproduce on CODEX_DEMO or local emulator data. Do not use CPB for synthetic writes.

## Files To Inspect

- package.json
- firebase.json
- .firebaserc
- vite.config.js
- playwright.config.js
- src/components/AppErrorBoundary.jsx
- src/utils/appErrorDiagnostics.js

## Commands To Run

- npm run lint
- npm test
- npm run build
- npm run product:qa
- npm run e2e:smoke

## Diagnostic Steps

1. Capture the exact route, account, Working Event, and visible error.
2. Compare frontend route/access behavior with Firestore rule behavior.
3. Check tests that cover the affected feature.
4. If the issue involves production, collect read-only evidence first.

## Repair Options

- For stale chunks, hard reload and use Reload Latest Version in app error page.
- Stop port conflicts before emulator QA.
- Roll back Hosting or Rules separately depending on changed target.

## Verification

Run the narrow test first, then `npm run lint`, `npm test`, `npm run build`, and `npm run product:qa` where safe.

## Rollback

Use Git to revert only the bad commit or restore the previous Firebase Hosting/Rules version. Do not use `git reset --hard` over owner work.

## Search Keywords

Vite build dynamic import stale chunk Firebase Hosting rollback emulator port taken 8080 9099
