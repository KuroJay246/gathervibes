# Operations Ledger Calculation Audit

Audit pass: Pass 3
Date: 2026-07-30
Scope: `src/services/operationsLedgerService.js`, `src/utils/operationsReport.js`, `src/pages/OperationsPage.jsx`, partner commitments, Firestore rules, and tests.

## Result

Operations Ledger writes are event-scoped, admin-only for writes, audited in the same batch, and separate from Registration Payments. Deletion is prohibited by design; cancellation changes status to `cancelled`.

## Ledger Types and Expected Effects

| Type/status | Expected effect |
| --- | --- |
| `income/received` | Counts as received Operations income. |
| `income/expected` | Counts as expected/planned income, not received cash. |
| `expense/paid` | Counts as paid expense. |
| `expense/pending` | Counts as pending commitment, not paid expense. |
| `refund/paid` | Should reduce/offset cash according to report utility treatment. |
| `adjustment/paid` | Should be visible as adjustment, not hidden profit. |
| `cancelled` | Excluded from active received/paid totals where utilities filter status. |
| sponsor cash in partner record | Planning/contact commitment until actual ledger record exists. |
| in-kind sponsor | Separate value; not counted as cash income. |

## Verified Behavior

- `operationsLedger` documents are queried by `eventId`.
- Create/update/cancel use a Firestore batch with `operation.*` audit logs.
- Rules deny `operationsLedger` delete.
- Operations helper can read assigned-event ledger entries but cannot write.
- Operations copy says ledger is separate from registration payment records.
- Registration ticket income is not automatically duplicated into Operations.

## Findings

| ID | Priority | Finding |
| --- | --- | --- |
| PASS3-OPS-P2-001 | P2 | `operation.cancel` is an update rather than a delete and preserves record history, but there is no explicit before-state snapshot in audit details beyond label/type/amount. |
| PASS3-OPS-P3-001 | P3 | Adjustments and refunds depend on report utility interpretation; operator-facing examples should stay explicit to avoid sign confusion. |
