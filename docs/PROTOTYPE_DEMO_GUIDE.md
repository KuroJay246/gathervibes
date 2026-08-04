# Organizer Rehearsal Guide

## Purpose

Use this guide to rehearse the organizer workflow safely with the permanent synthetic demo event. Real events, including CPB, are not used for synthetic training writes.

## Sign in

1. Open the app and sign in with an approved organizer account.
2. Confirm the app opens to the organizer workspace.
3. If the session is stale, sign out and sign in again before the rehearsal starts.

## Select the safe demo event

1. Open `Overview`, `Events`, or `System QA`.
2. Use the clearly labelled `Use CODEX_DEMO` action.
3. Confirm `CODEX_DEMO - Full System Walkthrough` is the selected Working Event before creating or editing anything.

## Rehearsal workflow order

1. Create or review an event in `Events`.
2. Add registrations in `Guests & Registrations`.
3. Review charges and payments in `Payments`.
4. Assign ticket codes in `Tickets`.
5. Check in a guest in `Check-In`.
6. Record an expense, commitment, or in-kind support in `Operations`.
7. Review follow-up and summary in `Reports`.
8. Create and copy a message in `Message Builder`.
9. Preview and confirm a small import in `Import Center`.
10. Review the readiness checklist in `System QA`.

## QA data prefix

- Prefix temporary QA business records with `QA_DEMO_`.
- Use the prefix for manual registrations, imports, payment references, and Operations notes created only for the walkthrough.
- Do not use the prefix in any real event.

## Cleanup

1. Leave the permanent `CODEX_DEMO` walkthrough records intact.
2. Delete only accidental temporary records created outside the approved demo dataset.
3. Keep audit logs intact. Cleanup removes accidental business records, not audit history.
4. Clear or change the Working Event after the rehearsal if needed.

## Do not edit in CPB

- Do not create, edit, or delete rehearsal records in CPB.
- Do not test destructive workflows against CPB.
- Do not use CPB for scanner, import, or payment demonstrations unless a separate production-safe approval exists.

## Known limitations

- Message Builder is copy-only and does not send messages.
- The prompt helper does not call a live AI service.
- The app does not calculate final event profit automatically.
- Payment gateway, public attendee portal, and Google Sheets OAuth are not active.

## Release checks

Before calling the organizer-ready build release-ready, complete:

- `npm run product:qa`
- `npm run product:audit`
- responsive browser review
- accessibility review
- merge, push, Hosting deploy, and authenticated production smoke
