# Phase 23B - Registration Payments and Operations Financial Boundaries

## Product Problem

Registration payment fields and Operations Ledger entries were visible in multiple places, but the interface could still imply that they formed one accounting system. Phase 23B separates the organizer workflow:

- Registration payment records: guest charges, recorded payments, balances, methods, references, and follow-up.
- Operations Ledger: sponsor income, vendor or supplier payments, expenses, refunds, reimbursements, and adjustments.
- Reports: read-only comparison and event summary, not reconciliation.

## Navigation

Previous organizer navigation included Overview, Events, Guests & Registrations, Tickets, Check-In, Operations, Message Builder, Reports, Settings, and System QA.

New organizer-facing navigation adds:

- Payments: `/payments`

Preserved routes:

- `/dashboard`
- `/events`
- `/registrations`
- `/payments`
- `/tickets`
- `/check-in`
- `/operations`
- `/communications`
- `/event-review`
- `/settings`
- `/qa`
- `/scanner`

Mobile primary navigation remains focused on event-day work: Overview, Guests, Tickets, Check-In, and More. Payments is available from More and does not replace Tickets or Check-In.

## Payments Workspace

The new Payments page is a review workspace for existing registration records. It does not create a payment processor, bank import, invoice system, reconciliation engine, export system, or new Firestore collection.

Payments shows:

- Registration records
- Guests
- Expected registration income
- Recorded registration payments
- Outstanding registration balance
- Paid, partial, pending, door, complimentary, unknown, finance-review, and follow-up counts
- Needs Follow-Up list
- Filterable registration payment table

All corrections route back to the existing Guests & Registrations workflow.

## Payment Warning Logic

Phase 23B adds reusable finance classification for:

- Missing ticket price
- Missing amount due
- Invalid or negative money fields
- Invalid persons attending
- Paid status without recorded amount paid
- Paid status with outstanding balance
- Amount paid greater than amount due
- Balance due mismatch
- Unknown payment status
- Complimentary registration with positive balance or amount due
- Door Paid without confirmed amount paid
- To Pay at Door without balance due
- Duplicate payment references inside the selected event

The existing finance summary API remains available for existing pages.

## Operations Boundaries

Operations copy and metrics now describe event-level ledger entries only. The mixed “net event position” metric was removed because it combined registration collected totals with Operations totals and could encourage double counting.

Operations now warns when an income ledger entry looks like registration or ticket revenue based on existing entry text. This is a display/review warning only. It does not change ledger calculations.

## Reports Positioning

Reports remains read-only. The financial section now uses “Financial Boundaries” language and identifies the registration-to-Operations comparison as review-only. The comparison note explicitly says not to add the separate record sets together unless overlapping entries are manually confirmed.

## Settings and System QA

Settings now names `/payments` as the registration-payment review workspace and states that automatic reconciliation is not enabled.

System QA includes read-only checks for:

- Payments workspace boundary
- Payment follow-up count

## CPB Payment Audit Read-Only Inspection

Inspected workbook:

`Cake_Piknik_Payment_Audit.xlsx`

No import, edit, stage, or production write was performed.

Workbook findings:

- Sheets: Payment Audit, Tier Summary, Buyer Summary, Review Needed, Method
- Payment Audit rows: 70
- Columns: 16
- Unit Price total: BBD 6,740.00
- Amount Paid Confirmed total: BBD 5,785.00
- Expected Total: BBD 6,740.00
- Balance/Due total: BBD 100.00
- Payment status counts: 52 paid confirmed, 4 paid confirmed price inferred, 1 needs review no Gmail proof found, 2 partial balance due, 7 to pay at door, 4 paid confirmed/register mismatch
- Confidence counts: 65 high, 4 medium, 1 low
- Review Needed sheet rows: 13

## Deliberately Deferred

Phase 23B does not add:

- Payment gateway
- Bank reconciliation
- Processor import
- CPB import apply
- New Payments collection
- New Transactions collection
- New Reconciliations collection
- New Invoices collection
- Financial reports export
- Operations auto-linking to registrations
- Accounting ledger

Recommended Phase 23C:

Registration Payments and Operations Reconciliation Prep for CPB. It should use the CPB audit workbook as a read-only source first, design a review-first mapping from audit rows to existing registration fields, prevent duplicate Operations income, and require explicit approval before any CPB data write.

## Files Changed

- `src/App.jsx`
- `src/layout/AppShell.jsx`
- `src/pages/DashboardPage.jsx`
- `src/pages/EventReviewPage.jsx`
- `src/pages/OperationsPage.jsx`
- `src/pages/PaymentsPage.jsx`
- `src/pages/QaPage.jsx`
- `src/pages/RegistrationsPage.jsx`
- `src/pages/SettingsPage.jsx`
- `src/utils/eventReview.js`
- `src/utils/financeUtils.js`
- `src/utils/operationsReport.js`
- `tests/phase20-real-use.test.js`
- `tests/phase21-command-center.test.js`
- `tests/phase23a-product-structure-ui-reset.test.js`
- `tests/phase23b-payments-operations-boundaries.test.js`
- `tests/phase83-phase9-finance.test.js`

## Guardrails Preserved

- No Firestore rules change
- No Firestore indexes change
- No dependency change
- No new collection
- No QR payload change
- No approvedEmails change
- No scanner permission expansion
- No access workflow activation
- No CPB production data change
- No CPB spreadsheet import
- No deployment
- No merge
