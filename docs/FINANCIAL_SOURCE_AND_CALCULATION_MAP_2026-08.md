# Financial Source and Calculation Map 2026-08

Purpose: record where organizer-visible financial figures come from after the financial workflow data-integrity polish.

## Registration Payments

| Page | Label | Source collection | Source fields | Utility | Planned or actual | Cash or non-cash | Included in totals | Test events excluded | Wording accurate |
|---|---|---|---|---|---|---|---|---|---|
| Overview | Projected registration income | `registrations` | `ticketPrice`, `amountDue`, `personsAttending` | `buildFinanceSummary` | Actual registration records | Cash expected | Yes, registration expected only | Uses selected Working Event only | Yes |
| Overview | Payments received | `registrations` | `amountPaid` | `buildFinanceSummary` | Actual registration records | Cash received | Yes, registration received only | Uses selected Working Event only | Yes |
| Overview | Outstanding registration balance | `registrations` | `amountDue`, `amountPaid`, `balanceDue` | `calculateRegistrationFinance`, `buildFinanceSummary` | Actual registration records | Cash outstanding | Yes, registration outstanding only | Uses selected Working Event only | Yes |
| Payments | Expected Registration Income | `registrations` | `ticketPrice`, `amountDue`, `personsAttending` | `buildPaymentsWorkspace` | Actual registration records | Cash expected | Yes | Selected event scoped | Yes |
| Payments | Payments Received | `registrations` | `amountPaid` | `buildPaymentsWorkspace` | Actual registration records | Cash received | Yes | Selected event scoped | Yes |
| Payments | Outstanding Balance | `registrations` | `amountDue`, `amountPaid`, `balanceDue` | `buildPaymentsWorkspace` | Actual registration records | Cash outstanding | Yes | Selected event scoped | Yes |
| Payments | Paid / Partially Paid / Unpaid / Complimentary / Overpaid / Payment Review Needed | `registrations` | `paymentStatus`, `amountDue`, `amountPaid`, `balanceDue` | `classifyRegistrationFinance` | Actual registration records | Cash status | Count only | Selected event scoped | Yes |
| Registrations | Finance Review | `registrations` | price and payment fields | `calculateRegistrationFinance`, `financeWarnings` | Actual registration records | Mixed status | Count only | Selected event scoped | Yes |
| Check-In | Payment status and balance | `registrations` | `paymentStatus`, `amountDue`, `amountPaid`, `balanceDue` | `calculateRegistrationFinance` | Actual registration records | Cash status | Display only | Selected event scoped | Yes |

## Operations Ledger

| Page | Label | Source collection | Source fields | Utility | Planned or actual | Cash or non-cash | Included in totals | Test events excluded | Wording accurate |
|---|---|---|---|---|---|---|---|---|---|
| Operations | Recorded Event Income | `operationsLedger` | `entryType=income`, `status=received`, `amount` | `buildOperationsSettlementSummary` | Actual settled entries | Cash received | Yes, Operations only | Selected event scoped | Yes |
| Operations | Recorded Event Expenses | `operationsLedger` | `entryType=expense`, `status=paid`, `amount` | `buildOperationsSettlementSummary` | Actual settled entries | Cash outflow | Yes, Operations only | Selected event scoped | Yes |
| Operations | Refunds Paid | `operationsLedger` | `entryType=refund`, `status=paid`, `amount` | `buildOperationsSettlementSummary` | Actual settled entries | Cash outflow | Yes, Operations only | Selected event scoped | Yes |
| Operations | Reimbursements Received | `operationsLedger` | `entryType=reimbursement`, `status=received`, `amount` | `buildOperationsSettlementSummary` | Actual settled entries | Cash inflow | Yes, Operations only | Selected event scoped | Yes |
| Operations | Outstanding Commitments | `operationsLedger`, event `partnerRecords` | pending/expected expense and refund fields, partner balances | `buildOperationsSettlementSummary`, `buildOrganizerOverview` | Outstanding obligation | Cash obligation | Shown separately, not paid expense | Selected event scoped | Yes |
| Operations | Current Ledger Difference | `operationsLedger` | settled income, reimbursements, paid expenses, paid refunds, directional adjustments | `buildOperationsSettlementSummary` | Actual settled Operations entries | Cash movement | Yes, Operations only | Selected event scoped | Yes; not final profit |
| Reports | Operations Ledger | `operationsLedger` | same as Operations | `buildEventReview` | Actual and outstanding split | Cash and obligation split | Separate from registration payments | Selected event scoped | Yes |

## Planned Figures

| Page | Label | Source collection | Source fields | Utility | Planned or actual | Cash or non-cash | Included in totals | Test events excluded | Wording accurate |
|---|---|---|---|---|---|---|---|---|---|
| Events | Financial plan | `events` | `financialPlan.*` | `hydrateEventForPlanning`, `buildOrganizerOverview` | Planned | Budget target | Planning only | Event list hides test events by default where implemented | Yes |
| Overview | Projected cash position | `events` | planned revenue minus planned budgets | `buildOrganizerOverview` | Planned | Forecast only | Planning only | Selected event scoped | Yes, marked not final profit |
| Reports | Planned Figures | `events` | `financialPlan.*` | `buildEventReview` | Planned | Forecast only | Planning only | Selected event scoped | Yes |

## Reconciliation Evidence

| Page | Label | Source collection | Source fields | Utility | Planned or actual | Cash or non-cash | Included in totals | Test events excluded | Wording accurate |
|---|---|---|---|---|---|---|---|---|---|
| Review & Reconcile Records | Workbook expected/paid/current app/hypothetical app | Uploaded workbook, `registrations`, `operationsLedger` reads | workbook headers, registration finance, Operations entries | `buildPaymentReconciliationPreview` | Evidence comparison only | Cash evidence | Preview only, no writes | Selected Working Event scoped | Yes |
| Reports | Historical Reconciliation | Static evidence utility | event-specific historical evidence constants | `getEventFinancialEvidenceAudit` | Evidence notes | Mixed evidence | Display only | Only returns an audit object for known historical evidence | Yes, not daily workflow |

## Guardrail Notes

- Registration Payments and Operations Ledger are separate sources.
- Planned figures are forecasts and never actual cash.
- Missing documentary evidence is not proof that money is outstanding.
- CODEX_DEMO remains the QA/test event; real business reports should use normal event filtering.
- QR payload remains `GSV:TICKET:{ticketCode}`.
