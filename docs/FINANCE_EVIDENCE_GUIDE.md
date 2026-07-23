# Finance Evidence Guide

## Core boundary

Gather & Savor tracks two separate financial record sets:

- registration payments in `Payments`
- event-level money and obligations in `Operations`

These record sets must stay separate in the UI, reporting, and release review.

## Evidence principles

- Missing is not the same as zero.
- A stored zero is not automatic evidence of complimentary access.
- In-kind support is not cash income.
- Approximate attendance is not a system check-in record.
- Provisional cash remainder is not final profit.

## Evidence classes

Use the existing evidence classes to describe support quality without changing payment status by themselves:

- Directly Verified
- Amount Inferred
- Organizer Reported
- Confirmed In-Kind
- Organizer-Reported In-Kind
- Unverified / Outstanding
- Historical / Excluded
- Control Exception
- Needs External Evidence

## CPB-specific safeguards

- Patron totals remain locked unless exact new evidence proves a correction.
- Operations corrections require a before snapshot, drift check, narrow field scope, and append-only audit evidence.
- Private workbook rows, receipts, and other sensitive source material stay outside Git.
- Named reconciliation working notes should stay in private release evidence, not in public repository docs.

## Baker settlement review

The named baker-settlement table belongs in the private release review because it contains production-sensitive evidence. Repository documentation should preserve the review method, not the raw private ledger detail.

For each baker, confirm:

1. participation status
2. cakes supplied
3. gross amount
4. advance paid
5. additional payment paid
6. total paid
7. outstanding balance
8. evidence source
9. organizer confirmation
10. discrepancy, if any
11. final classification

## Sponsor review

Keep these separate:

- requested sponsorship
- promised support
- delivered cash sponsorship
- delivered in-kind support
- estimated value
- confirmed quantity

Representative attendance alone is not sponsorship income.
