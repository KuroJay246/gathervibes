# Operations Guide

## What Operations is for

Operations records event-level money and obligations that are separate from registration payments.

Use it for:

- sponsor income
- supplier and vendor payments
- venue charges
- baker settlements
- reimbursements
- refunds
- adjustments
- in-kind support

## What Operations is not for

- It is not the registration payment workspace.
- It is not a complete accounting system.
- It does not automatically combine registration totals with Operations totals.
- It does not convert in-kind support into cash totals.

## Entry types and status

- `income`: cash income recorded in the Operations ledger.
- `expense`: paid event costs.
- `commitment`: expected or pending obligations not yet settled.
- `refund` or `adjustment`: corrections that belong to the event-level ledger.

Status should reflect the real state of the record, such as:

- `received`
- `paid`
- `pending`
- `expected`
- `cancelled`

## CPB closeout boundaries

- Paid expenses and outstanding commitments must remain separate.
- Cash sponsorship and in-kind support must remain separate.
- Provisional cash remainder is not final profit.
- Production financial corrections require exact evidence and explicit approval.

## Organizer workflow

1. Select the correct Working Event.
2. Add or review the ledger entry.
3. Confirm label, category, amount, method, status, and notes.
4. Keep registration payments in `Payments`.
5. Use `Reports` for the read-only cross-check.

## Baker payments

Use baker, vendor, and supplier commitment records to track what is still owed outside registration payments.

For baker payments:

1. Confirm the agreed amount and current balance.
2. Update amount paid only after the real payment is made.
3. Record payment method, payment date, evidence, and notes where available.
4. Use the remaining balance to track what is still outstanding.
5. Keep patron payment totals unchanged.

## QA rehearsal rule

Use CODEX_TEST for destructive QA and organizer rehearsal. Do not create temporary Operations entries in CPB.
