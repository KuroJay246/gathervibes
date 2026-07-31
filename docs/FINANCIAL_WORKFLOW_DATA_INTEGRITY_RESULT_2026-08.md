# Financial Workflow Data Integrity Result 2026-08

## Product Problem

Financial pages used the right broad concepts, but some labels and totals were still easy to misread. Registration payments, Operations cash movement, planned figures, commitments, and reconciliation evidence needed clearer boundaries.

## Implemented

- Payment status labels now align to organizer wording: Paid, Partially Paid, Unpaid, Complimentary, Overpaid, and Payment Review Needed.
- Operations Ledger now exposes an explicit entry-effect table for income, expenses, refunds, reimbursements, adjustments, commitments, in-kind support, and cancelled records.
- Reimbursements are a first-class Operations entry type.
- Adjustments use explicit direction instead of negative amount values.
- Operations service validation rejects invalid or negative amount input instead of coercing it to zero.
- Reports use settled Operations cash movement for the Operations ledger difference.
- Reports display reimbursements separately from income, expenses, refunds, and adjustments.
- Payment Reconciliation remains selected Working Event scoped and read-only.

## Deliberately Deferred

- No invoicing.
- No payroll.
- No tax reporting.
- No bank reconciliation.
- No payment gateway.
- No Gmail, WhatsApp, AI API, or Google Sheets OAuth connection.
- No automatic combined accounting ledger.
- No Firestore collection changes.

## Guardrails Preserved

- QR payload remains `GSV:TICKET:{ticketCode}`.
- Registration Payments and Operations remain separate sources.
- Planned figures remain planning only.
- CODEX_TEST remains the test/QA event.
- CPB was not modified.
- Firestore rules were updated only to allow the standard Operations ledger schema to store `reimbursement` entries and optional `adjustmentDirection`.
- Firestore indexes were not changed by this phase.
- Access workflows remain disabled.
