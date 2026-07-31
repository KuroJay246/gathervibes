# Operations Ledger Entry Standard

Operations Ledger records event-level money and obligations. It is not the registration-payment ledger and it is not final profit reporting.

## Entry Effects

| Entry type | Settled status | Cash effect | Commitment effect | Reporting treatment |
|---|---|---:|---:|---|
| Income | Received | Increase recorded Operations income | Expected or pending income remains pending | Cash income only when received |
| Expense | Paid | Increase recorded Operations expenses | Expected or pending expense is an outstanding commitment | Paid expense only when paid |
| Refund | Paid | Increase cash outflow | Expected or pending refund is an outstanding commitment | Paid refund only when paid |
| Reimbursement | Received | Increase cash inflow | Expected or pending reimbursement is pending | Separate from registration payments |
| Adjustment | Received or Paid | Increase or decrease by explicit direction | None | Direction is required; negative amount entry is not used |
| Cancelled | Cancelled | No effect | No effect | Visible history only |

## Form Rules

- Amounts must be valid zero-or-greater money values.
- Negative values are not used to reverse meaning.
- Adjustment rows use an explicit direction: increase or decrease.
- In-kind support is recorded separately and must not count as cash.
- Requested sponsorship is not received income.
- Outstanding supplier/vendor commitments are not paid expenses.

## Reporting Boundaries

- Current Ledger Difference uses settled Operations cash movement only.
- Registration ticket payments stay in Registration Payments.
- Reports may show Registration Payments and Operations together, but they remain separate sources.
- No combined number should be labelled final profit.
