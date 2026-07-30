# Registration Payments Calculation Audit

Audit pass: Pass 3
Date: 2026-07-30
Scope: `src/utils/financeUtils.js`, `src/utils/paymentStatus.js`, `src/pages/PaymentsPage.jsx`, registration services, Payment Reconciliation utilities, and finance tests.

## Result

Registration payment calculations are centralized in `calculateRegistrationFinance` and `classifyRegistrationFinance`. The current product correctly separates registration payments from Operations Ledger values and flags ambiguous paid, partial, overpaid, complimentary, door, and missing-evidence rows.

## Calculation Truth Table

| Case | Expected result |
| --- | --- |
| `ticketPrice=50`, `personsAttending=2`, no explicit `amountDue` | `amountDue=100`. |
| Explicit `amountDue=90` with `ticketPrice=50`, `personsAttending=2` | Uses explicit `90`, emits mismatch warning. |
| `amountDue=100`, `amountPaid=25` | `balanceDue=75`. |
| `paymentStatus=paid`, `balanceDue>0` | Blocking warning: paid status has outstanding balance. |
| `paymentStatus=paid`, missing amount due/paid | Data review, not blindly trusted as fully resolved. |
| `paymentStatus=complimentary`, `amountDue=0`, `amountPaid=0` | No payment follow-up. |
| `paymentStatus=complimentary`, positive balance | Warning. |
| `amountPaid > amountDue` | Overpaid warning. |
| `door-list`, positive balance | Payment follow-up remains visible. |
| `door`, zero paid | Warning that door paid has no confirmed amount. |

Structured evidence: `output/full-repository-audit/data-calculation-results.json`.

## Verified Behavior

- Balance is calculated from explicit amount due minus amount paid when explicit balance is absent.
- Partial payments remain visible through classification.
- Overpayments are not silently normalized away; they are flagged.
- Complimentary records do not create follow-up when the balance is zero.
- CPB totals are record-derived in normal utilities, not hardcoded into finance calculation.
- Operations entries are explicitly excluded from registration payment totals and reconciliation reports possible overlap separately.
- Bulk finance updates create registration finance audit logs.

## Findings

| ID | Priority | Finding |
| --- | --- | --- |
| PASS3-PAY-P2-001 | P2 | `bulkUpdatePaymentStatus` changes only status and does not recalculate amount due, amount paid, or balance. This can create review warnings until a finance-field update is used. |
| PASS3-PAY-P3-001 | P3 | Paid status does not require payment reference by default; this is a product choice but weakens evidence completeness for future reconciliation. |
