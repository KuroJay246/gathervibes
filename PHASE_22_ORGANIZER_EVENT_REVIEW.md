# Phase 22 — Organizer Event Review

## Purpose

Phase 22 adds one private, read-only organizer/admin page that combines:

1. Event-readiness follow-up
2. Payment review
3. Current-event or post-event summary

This page is intended to help the organizer understand what still needs attention without creating a new collection, storing a generated report, or writing anything to Firebase.

## Exact scope

- New private admin route: `/event-review`
- Uses the selected Working Event only
- Uses existing registration records and existing Operations Ledger records
- Adds a small Dashboard entry point
- Adds a small Operations entry point
- Keeps calculation logic in reusable utilities
- Adds focused Phase 22 tests

## Route and page

- Page: `src/pages/EventReviewPage.jsx`
- Utility: `src/utils/eventReview.js`
- Route registration: `src/App.jsx`

The page remains inside the existing protected admin shell.

## Data sources

### Registrations

- `registrations` collection for the selected Working Event
- Existing fields already used by the app:
  - `personsAttending`
  - `paymentStatus`
  - `ticketCode`
  - `ticketPrice`
  - `amountDue`
  - `amountPaid`
  - `balanceDue`
  - `paymentMethod`
  - `paymentReference`
  - `checkedIn`

### Operations Ledger

- `operationsLedger` collection for the selected Working Event
- Existing fields already used by the app:
  - `entryType`
  - `status`
  - `amount`
  - `label`
  - `category`
  - `date`

### Reused helpers

- `src/utils/eventReadiness.js`
- `src/utils/financeUtils.js`
- `src/utils/operationsReport.js`
- `src/utils/registrationMetrics.js`
- existing event-date helpers

## Calculation definitions

### Registration count vs guest count

- Registration count = number of registration documents
- Guest count = sum of `personsAttending`

These are not interchangeable.

### Attendance model

- Checked-in registrations = registration records where `checkedIn === true`
- Checked-in guests = sum of `personsAttending` for checked-in registrations
- Attendance rate = checked-in guests / total guests when total guests is greater than zero

Important limitation:

The app checks in the registration record, not each guest individually. If one checked-in registration represents a group, the summary uses that full `personsAttending` value.

### Payment review distinction

Registration payment records and the Operations Ledger remain separate:

- registration payment records track what guests owe and have paid
- Operations Ledger tracks manually recorded event income, expenses, refunds, and adjustments

Any side-by-side comparison is labelled as a review-only comparison, not an accounting reconciliation.

### Capacity usage

- Capacity usage uses guest count, not registration count
- Invalid or missing capacity falls back safely and does not crash the page

## Follow-Up section

The page can show read-only follow-up buckets for:

- missing contact information
- payment follow-up needed
- paid registrations missing tickets
- other registrations missing tickets
- incomplete finance details
- repeated contact details to review
- capacity nearing full or exceeded
- open operations items
- check-in not started
- check-in in progress
- check-in apparently completed
- past/completed events with unresolved items

Each bucket includes:

- count
- short explanation
- safe link to an existing page
- optional short preview list

## Payment Review section

The page keeps these sources visibly separate:

### Registration payment records

- registration-record count
- total guest count
- expected registration income
- amount collected
- amount outstanding
- complimentary registration count
- complimentary guest count
- pending count
- paid count
- door paid count
- To Pay at Door count
- unknown payment-state count
- pricing review count
- finance warning count

### Operations Ledger

- income received
- income pending
- expenses paid
- expenses pending
- refunds paid
- refunds pending
- adjustments
- cancelled items
- open ledger-item count
- current operations net position

## Event Summary section

The page adapts its wording:

- future/active event: current event summary / readiness snapshot
- past/completed event: post-event summary

The summary includes:

- event name
- event date
- event status
- capacity
- registration-record count
- total guest count
- paid / pending / complimentary counts
- To Pay at Door / unknown counts
- ticket coverage
- checked-in registration count
- checked-in guest total
- attendance rate
- capacity usage
- operations income
- operations expenses
- operations refunds
- operations adjustments
- operations net position
- open operations-item count
- incomplete-data warnings

## Empty-data and old-data behavior

The implementation supports all of the following without crashing:

- no selected event
- no registrations
- no operations entries
- missing ticket fields
- missing check-in fields
- missing finance fields
- missing or invalid capacity
- missing currency
- missing price tiers
- stale local storage
- completed events with unresolved items

Safe fallbacks preserved:

- currency: `BBD`
- ticket prefix: `GSV`
- price tiers: `[]`
- persons attending: existing app-safe fallback behavior

## Permissions

`/event-review` is intended for approved administrators inside the existing admin shell.

This phase does not:

- broaden scanner permissions
- broaden staff permissions
- change assigned-event rules
- activate access workflows

## Files changed

- `src/App.jsx`
- `src/layout/AppShell.jsx`
- `src/pages/DashboardPage.jsx`
- `src/pages/OperationsPage.jsx`
- `src/pages/EventReviewPage.jsx`
- `src/utils/eventReview.js`
- `tests/phase22-event-review.test.js`
- `PHASE_22_ORGANIZER_EVENT_REVIEW.md`

## Tests added

- `tests/phase22-event-review.test.js`

Coverage includes:

- follow-up buckets
- finance review behavior
- operations summary behavior
- event summary behavior
- wording boundaries
- guardrails and route presence

## Guardrails preserved

- local implementation only
- not deployed
- no Firestore rules change
- no Firestore indexes change
- no new collection
- no write action added
- no production-data write
- CPB untouched
- QR payload unchanged
- access workflows remain disabled
- scanner permissions remain unchanged
- no new dependency

## Validation results

Validation is recorded in the implementation handoff after local lint, test, build, audit, dependency checks, and diff checks complete.

## Deployment status

- Local implementation only
- Not deployed to Hosting
- No Firestore deploy
- No index deploy
