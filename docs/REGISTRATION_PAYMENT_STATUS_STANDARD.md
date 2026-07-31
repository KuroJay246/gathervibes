# Registration Payment Status Standard

## Organizer Labels

Use these labels in normal organizer UI:

| Label | Meaning | Calculation expectation |
|---|---|---|
| Paid | Payment is resolved and no positive balance remains. | `amountPaid >= amountDue` when exact amounts are known. |
| Partially Paid | Some money is recorded and a positive balance remains. | `amountPaid > 0` and `balanceDue > 0`. |
| Unpaid | No money is recorded and payment remains unresolved. | `amountPaid = 0` and `balanceDue > 0`, or status is pending. |
| Complimentary | Organizer has waived payment. | No outstanding balance should be shown. |
| Overpaid | Recorded amount paid is greater than amount due. | Show as finance review; do not silently discard. |
| Payment Review Needed | Status, amount, method, or reference is unclear. | Keep out of automatic paid/unpaid assumptions. |

## Calculation Rules

- `amountDue` comes from explicit `amountDue`, or from explicit `ticketPrice * personsAttending`.
- `amountPaid` comes from explicit `amountPaid`; missing values display as zero for totals only when no raw amount exists.
- `balanceDue = max(amountDue - amountPaid, 0)` unless a future model explicitly supports negative balances.
- Overpayment is a review condition, not a hidden negative balance.
- Complimentary registrations must not create outstanding payment follow-up.
- Payment Follow-Up means guest/buyer contact may still be needed.
- Data Review means the payment may be resolved but the stored data is incomplete or inconsistent.

## Write Guardrails

- Invalid, negative, or non-numeric money values are rejected by validators.
- Bulk payment changes must pass the same contradiction checks as individual updates.
- Imported values must pass the same finance calculations before they become proposed app values.
- Historical records are not silently migrated by UI calculation changes.
