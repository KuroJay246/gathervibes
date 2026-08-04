# Phase 23E New CPB Manifest Regeneration

## Objective

Regenerate the Cake Piknik Barbados payment reconciliation manifest after the released Phase 23D-0 finance-contract corrections. The old manifest is invalid and was not reused.

## Contracts

- Event ID: `zhaPxi31cpqLAW0cuS20`
- Workbook SHA256: `77AF3050F82D97D12067728FC1314E51CA734F73B798AAD8D63C263421029D96`
- Parser: `worksheet-xml-cached-values`
- Parser contract: `cpb-reconciliation-parser-v1`
- Finance contract: `phase-23d0-registration-finance-v1`
- Invalid old manifest: `2A98AB506F1846294944DA49A57CD2E898F6B5D97E4E03C412FD89683C92C409`

## Results

- New manifest SHA256: `D690D6B84A272F5189098F57E4643FAF6F5E628F98519B74369593ED31DE0828`
- Normalized workbook rows: 70
- CPB registration records read: 71
- Proposal count: 65
- Field-change count: 385
- Firestore writes performed: 0

## Classification Counts

Workbook classifications:

- Exact Match - No Change: 0
- Exact Match - Proposed Update: 65
- Possible Match - Manual Review: 1
- Workbook Only: 0
- Duplicate/Non-Unique: 3
- Conflict: 0
- Blocked: 1

App classifications:

- Matched - No Change: 0
- Matched - Proposed Update: 65
- Matched - Manual Review: 0
- App Only: 6
- Duplicate/Non-Unique: 0
- Conflict: 0
- Blocked: 0

## Totals

Workbook:

- Row count: 70
- Expected total: BBD 6740
- Paid total: BBD 5785
- Outstanding total: BBD 100

Current CPB registration finance:

- Registration count: 71
- Expected total: BBD 0
- Paid total: BBD 0
- Outstanding total: BBD 0
- Finance-review count: 71

Hypothetical after safe proposals:

- Expected total: BBD 6290
- Paid total: BBD 5420
- Outstanding total: BBD 870
- Affected registrations: 65
- Changed fields: 385

Differences are reconciliation evidence only. They are not classified as missing cash.

## Artifact Paths

Private artifacts were written outside Git:

- `C:\Users\Jaylan\Desktop\GSV_New_CPB_Manifest\CPB_Proposal_Manifest_New_Private.json`
- `C:\Users\Jaylan\Desktop\GSV_New_CPB_Manifest\CPB_Proposal_Manifest_New_Masked.csv`
- `C:\Users\Jaylan\Desktop\GSV_New_CPB_Manifest\CPB_Manifest_Comparison_To_Invalid_Masked.csv`
- `C:\Users\Jaylan\Desktop\GSV_New_CPB_Manifest\CPB_Reconciliation_Summary_Masked.json`

## Guardrails

- CPB was read only.
- No registration writes were performed.
- No Operations writes were performed.
- No ticket writes were performed.
- No check-in writes were performed.
- Operations totals remain excluded from registration payment totals.
- Supported proposed fields remain limited to `ticketPrice`, `amountDue`, `amountPaid`, `balanceDue`, `paymentStatus`, `paymentMethod`, and `priceTier`.
- Payment reference, identity, contact, ticket code, event ID, check-in fields, and count fields are not proposed as writes.

## Browser And Network Notes

The existing app route remains a read-only reconciliation preview with explicit CPB target gating and exact `CPB DRY RUN` confirmation. A combined authenticated browser review is still required after Phases 23F and 23G are implemented.

## Tests

Added `tests/phase23e-cpb-manifest-regeneration.test.js` covering:

- parser and finance contract constants
- invalid old manifest non-reuse
- released status normalization behavior
- deterministic proposal field list
- complete workbook/app classification counts
- read-only generator behavior

