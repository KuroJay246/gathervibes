# Scanner and QR Runbook

## Symptoms

Camera fails, QR does not scan, scan finds no guest, scanner user denied, duplicate check-in blocked, or event-day operator cannot complete check-in.

## Likely Causes

- Browser camera permission or HTTPS problem.
- QR payload is not GSV:TICKET:{ticketCode}.
- Scanner lacks active staff assignment.
- Registration belongs to another event.
- Firestore rules reject non-minimal check-in update.

## Severity

High when it blocks owner, organizer, staff, scanner, payment, ticket, or check-in work. Medium when isolated to local development.

## First Checks

1. Confirm branch and clean tree: `git status --short --branch`.
2. Confirm Firebase project target before any production command.
3. Read browser Console and Network errors before changing code.
4. Reproduce on CODEX_DEMO or local emulator data. Do not use CPB for synthetic writes.

## Files To Inspect

- src/components/checkin/QrScannerPanel.jsx
- src/pages/ScannerPage.jsx
- src/pages/CheckInPage.jsx
- src/utils/qrTicketUtils.js
- src/utils/checkInUtils.js
- firestore.rules

## Commands To Run

- npm test -- tests/phase14-camera-checkin.test.js
- npm test -- tests/phase7-qr-checkin.test.js
- npm run e2e:smoke

## Diagnostic Steps

1. Capture the exact route, account, Working Event, and visible error.
2. Compare frontend route/access behavior with Firestore rule behavior.
3. Check tests that cover the affected feature.
4. If the issue involves production, collect read-only evidence first.

## Repair Options

- Do not change QR format casually.
- Repair assignment/event scope first.
- Keep scanner write payload minimal and audit-coupled.

## Verification

Run the narrow test first, then `npm run lint`, `npm test`, `npm run build`, and `npm run product:qa` where safe.

## Rollback

Use Git to revert only the bad commit or restore the previous Firebase Hosting/Rules version. Do not use `git reset --hard` over owner work.

## Search Keywords

html5-qrcode camera permission GSV:TICKET ticketCode scanner staffAssignments check-in permission denied
