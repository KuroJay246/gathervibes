# Phase 23F - CPB Manifest Approval Package

## Purpose

Phase 23F turns the regenerated CPB payment manifest into an organizer-review package. It does not approve, apply, or write any CPB registration data.

The approval package is tied to new manifest SHA256:

`D690D6B84A272F5189098F57E4643FAF6F5E628F98519B74369593ED31DE0828`

## Inputs

- Private manifest: `C:\Users\Jaylan\Desktop\GSV_New_CPB_Manifest\CPB_Proposal_Manifest_New_Private.json`
- Parser contract: `cpb-reconciliation-parser-v1`
- Finance contract: `phase-23d0-registration-finance-v1`
- Workbook SHA256: `77AF3050F82D97D12067728FC1314E51CA734F73B798AAD8D63C263421029D96`

## Generated Approval Artifacts

Output folder:

`C:\Users\Jaylan\Desktop\GSV_New_CPB_Manifest_Approval`

Files:

- `CPB_New_Manifest_Approval_Decisions.json`
- `CPB_New_Manifest_Approval_Summary_Masked.csv`
- `CPB_New_Manifest_Field_Counts.json`
- `CPB_New_Manifest_Money_Changes_Masked.csv`
- `CPB_New_Manifest_Status_Changes_Masked.csv`
- `CPB_New_Manifest_Door_Changes_Masked.csv`
- `CPB_New_Manifest_Replacement_Warnings_Masked.csv`

## Approval State

The package is intentionally unresolved:

- Approval state: `unresolved`
- Proposal decisions: `65 unresolved`
- Field decisions: unresolved per changed field
- Firestore writes performed: `false`
- Manifest mutated: `false`

Exact full-approval phrase:

`I APPROVE CPB MANIFEST D690D6B84A272F5189098F57E4643FAF6F5E628F98519B74369593ED31DE0828 FOR PHASE 23G APPLY REHEARSAL AND PHASE 23H APPLY DESIGN ONLY`

Exact partial-approval phrase:

`I PARTIALLY APPROVE CPB MANIFEST D690D6B84A272F5189098F57E4643FAF6F5E628F98519B74369593ED31DE0828 USING THE SAVED APPROVAL DECISIONS FOR PHASE 23G APPLY REHEARSAL AND PHASE 23H APPLY DESIGN ONLY`

Exact rejection phrase:

`I DO NOT APPROVE CPB MANIFEST D690D6B84A272F5189098F57E4643FAF6F5E628F98519B74369593ED31DE0828`

## Counts

- Proposals: `65`
- Field changes: `385`
- Blank fills: `253`
- Existing-value replacements: `132`
- Money-field changes: `246`
- Payment-status changes: `65`
- Price-tier changes: `65`
- Payment-method changes: `9`
- Door Paid proposals: `2`
- To Pay at Door proposals: `7`
- Partial-deposit proposals: `2`
- Complimentary proposals: `0`
- Grouped review patterns: `6`

Field counts:

- `ticketPrice`: `65`
- `amountDue`: `65`
- `amountPaid`: `58`
- `balanceDue`: `58`
- `paymentStatus`: `65`
- `priceTier`: `65`
- `paymentMethod`: `9`

## Risk Flags

The package separately flags:

- nonblank monetary replacements
- payment-status replacements
- To Pay at Door proposals
- partial-deposit records
- proposals with three or more money fields
- proposal warnings from the regenerated manifest

## Guardrails

- No CPB Firestore writes were performed.
- The private manifest was read, not mutated.
- Approval decisions remain local Desktop artifacts.
- The package is not an application plan for CPB writes.
- Any future apply design must remain locked behind manifest hash, event ID, explicit approval phrase, dry-run/rehearsal, and rollback planning.
