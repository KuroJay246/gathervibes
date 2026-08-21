# Runbook 3. Scanner, Ticket, and Check-In Failures

## Purpose

Repair event-day failures involving scanner access, camera use, QR parsing, ticket lookup, and duplicate attendance handling.

## Symptoms

- Scanner route opens but no assigned event loads.
- Browser camera cannot open.
- QR code scans but is not recognized.
- Ticket lookup fails.
- Duplicate check-in warning appears.

## Severity

High during live operations.

## Possible causes

- Missing active scanner assignment.
- Browser camera permission denied or insecure origin.
- QR payload not using `GSV:TICKET:{ticketCode}`.
- Ticket code missing, invalid, or duplicated.
- Registration already checked in.

## Safety warnings

- Do not change QR format during live diagnosis.
- Do not use CPB or real production attendees for synthetic scanner rehearsal.

## Evidence to collect

- Event id and scanner user.
- Camera permission state.
- Scanned payload text if safely visible.
- Registration `ticketCode`, `ticketStatus`, `checkedIn`, and `checkInTime`.

## First checks

1. Confirm the scanner user has an active assignment for the target event.
2. Confirm the page is running on HTTPS or a trusted localhost context.
3. Confirm the scanned value starts with `GSV:TICKET:`.
4. Confirm the registration exists in the selected or assigned event.

## Files to inspect

- `src/pages/ScannerPage.jsx`
- `src/pages/CheckInPage.jsx`
- `src/components/checkin/QrScannerPanel.jsx`
- `src/utils/qrTicketUtils.js`
- `src/utils/checkInUtils.js`
- `src/services/ticketService.js`

## Commands to run

- `npm test -- tests/phase14-camera-checkin.test.js`
- `npm test -- tests/phase7-qr-checkin.test.js`
- `npm run e2e:smoke`

## Step-by-step diagnosis

1. For missing assigned event, inspect resolved assignments in app state and confirm event id equality.
2. For camera failure, inspect browser permission state and HTTPS context before touching app code.
3. For unrecognized QR, parse the value with `qrTicketUtils` and compare it to the registration list for the active event only.
4. For lookup failure, confirm the registration has a current `ticketCode` and that duplicate ticket codes were not imported.
5. For duplicate attendance, inspect `checkedIn`, `checkInTime`, and audit history before offering undo.

## Repair options

- Correct assignment/profile state.
- Correct QR payload generation or lookup code while preserving the prefix standard.
- Regenerate or remove a bad ticket assignment through the ticket workflow.
- Use the narrow undo check-in path when attendance was recorded in error.

## Verification

- Scanner opens the assigned event correctly.
- Camera path can scan a valid QR.
- Check-in writes only the approved narrow attendance fields plus audit log.

## Rollback

- Restore the previous ticket code state or revert the event-day UI change.

## Escalation conditions

- QR payload format appears to have drifted.
- Duplicate ticket codes exist across active event registrations.
- Check-in writes require broader Rules changes.

## Search keywords

- scanner cannot open assigned event
- camera permission denied
- QR not recognized
- ticket lookup fails
- duplicate check-in

## Related tests

- `tests/phase14-camera-checkin.test.js`
- `tests/phase7-qr-checkin.test.js`
- `tests/firestore-checkin-rules.test.js`

## Related manual sections

- Events, Guests, Tickets, and Check-In
- Imports, Exports, and QR Systems
