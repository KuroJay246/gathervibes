# Registration Payments and Operations Refinement Plan

## Current organizer usability problem

Registration Payments already classifies records correctly, but the organizer still has to scan a long list and jump to Registrations to understand what to do next. Operations preserves the right boundaries, but ledger rows, commitments, partners, and in-kind support are visually mixed together.

## Area 1: Registration Payments

### Current behavior

- Strong payment classification and summary counts already exist.
- Mobile cards and desktop table already show core finance values.
- Review items are visible, but detail review and next-step actions are thin.

### Organizer difficulty

- It is harder than it should be to answer which record needs guest follow-up versus internal cleanup.
- There is no focused in-page detail panel for payment evidence, follow-up, and update context.
- The organizer cannot hand off a payment follow-up into Tasks from the payment workspace.

### Terminology and visual problems

- Internal review, guest follow-up, and historical limitations are not separated strongly enough in the working view.
- Method-based filtering is missing even though the data already supports it.

### Data-integrity concern

- The refinement must not recalculate money differently or blur Registration Payments into Operations.

### Proposed correction

- Add an in-page payment detail panel.
- Add explicit follow-up state wording.
- Add payment-method filtering.
- Add safe task-prefill links into `/tasks`.
- Keep the existing finance classification model and summary math unchanged.

### Existing behavior that must remain unchanged

- Registration Payments remains authoritative for registration-level money.
- Historical reconciliation stays out of the daily payment workflow.
- Registration review still routes through the existing Registrations workflow.

## Area 2: Operations, partners, and commitments

### Current behavior

- The ledger, partner records, and partner form all exist.
- Boundaries between Registration Payments and Operations are already stated correctly.

### Organizer difficulty

- Commitments, partner relationships, and in-kind support are not surfaced as distinct operational views.
- The organizer must read through mixed ledger and planning surfaces to understand next actions.

### Terminology and visual problems

- The page reads as one long mixed workspace rather than clear sub-views.
- Outstanding commitments and partner follow-up are present in data but not promoted enough in presentation.

### Data-integrity concern

- The ledger math and settlement logic must remain unchanged.
- Non-cash support must stay out of cash totals.

### Proposed correction

- Add derived Operations views for Ledger, Commitments, Partners and Suppliers, and In-Kind Support.
- Add detail panels and safe task-prefill links for commitments and partner follow-up.
- Preserve the current write contract for ledger and partner records.

### Existing behavior that must remain unchanged

- Registration Payments and Operations remain separate systems.
- Current Ledger Difference must not be relabelled as final profit.
- Existing partner, sponsor, and ledger models remain the source of truth.
