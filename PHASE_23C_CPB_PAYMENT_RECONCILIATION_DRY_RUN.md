# Phase 23C - CPB Payment Reconciliation Dry Run

## Product Problem

Cake Piknik Barbados payment evidence exists in a local audit workbook, while the app already contains registration payment fields and a separate Operations Ledger. Before any apply phase, the organizer needs a safe preview that shows what the workbook appears to match, what would change, and where manual review is required.

Phase 23C is a dry-run only reconciliation preview. It does not write production data, does not import CPB registrations, and does not combine registration payments with Operations Ledger totals.

## Route And Entry

- New route: `/payments/reconciliation`
- Existing Payments route remains `/payments`.
- Payments page now includes a secondary action labeled `Reconciliation Preview`.
- The preview route is not wrapped in `AssignedEventGate`; it does not require, set, or mutate the selected Working Event.
- The page header still displays the current Working Event for safety and explicitly states that the Working Event is unchanged.

## CPB Target Gate

The preview starts locked with no target event selected. Loading CPB data requires all of the following:

- Target selected inside the tool: `Cake Piknik Barbados`
- Target event ID: `zhaPxi31cpqLAW0cuS20`
- Local workbook selected by file input
- Exact confirmation text: `CPB DRY RUN`

Refreshing the page returns to the locked setup state. CPB data is not silently reloaded.

## Record Sets Kept Separate

The preview keeps three sources separate:

- Workbook Records from `Cake_Piknik_Payment_Audit.xlsx`
- Registration Records from Firestore `registrations` scoped to CPB
- Operations Records from Firestore `operationsLedger` scoped to CPB

Operations records are excluded from registration payment totals. Possible Operations overlap is flagged using the existing Phase 23B `findPossibleRegistrationPaymentOverlap` helper.

## Workbook Reading

The primary reader uses `read-excel-file/browser`.

The local CPB workbook can trigger a shared-string parsing error in `read-excel-file`. To keep the preview usable without adding `xlsx` or changing the workbook, Phase 23C includes a fallback reader that:

- Uses the already-installed `fflate` runtime from the existing dependency tree
- Reads only workbook XML values in the browser
- Uses cached/displayed formula values only
- Reports formula and merged-cell counts when detected
- Does not modify or save the workbook

The workbook remains untracked and unstaged.

## Matching Rules

Safe matches require exact or multi-field identifiers only:

- Ticket code
- Payment reference
- Email plus name
- Phone plus name
- Email plus phone

Name-only similarity is never a safe match. It is classified as manual review.

Duplicate strong identifiers block automatic matching. One-to-many or many-to-one matches are classified as duplicate or conflict.

## Classifications

The dry run produces these classifications:

- Exact Match - No Change
- Exact Match - Proposed Update
- Possible Match - Manual Review
- Workbook-Only Record
- App-Only Registration
- Duplicate
- Conflicting Data
- Blocked

## Proposed Fields

Only these registration payment fields may be proposed:

- `ticketPrice`
- `amountDue`
- `amountPaid`
- `balanceDue`
- `paymentStatus`
- `paymentMethod`
- `paymentReference`
- `priceTier`

The preview never proposes changes to:

- Identity fields
- `eventId`
- `personsAttending`
- Ticket code
- Check-in fields
- Audit history

## Totals

The page displays:

- Workbook amount due, amount paid, and balance
- Current app registration payment totals
- Hypothetical app totals after safe proposed updates
- Operations record count and possible overlap count

No overall profit, final event net, or combined accounting total is calculated.

## UI Decisions

- The route is a secondary tool under Payments, not a new primary product area.
- The setup gate is the first screen and is intentionally explicit.
- The table prioritizes classification, match basis, proposed fields, and reason.
- Filters match the approved classification list.
- The final warning states that no apply action exists in Phase 23C.

## Files Changed

- `src/App.jsx`
- `src/layout/AppShell.jsx`
- `src/pages/PaymentsPage.jsx`
- `src/pages/PaymentReconciliationPage.jsx`
- `src/services/reconciliationReadService.js`
- `src/utils/paymentReconciliation.js`
- `src/utils/reconciliationWorkbook.js`
- `tests/phase23c-payment-reconciliation.test.js`
- `PHASE_23C_CPB_PAYMENT_RECONCILIATION_DRY_RUN.md`

## Tests Added

`tests/phase23c-payment-reconciliation.test.js` verifies:

- `/payments/reconciliation` route exists
- route is not Working Event gated
- confirmation text and CPB target constants exist
- scanner navigation remains isolated
- workbook parsing normalizes synthetic records
- name-only matches remain manual review
- strong matches produce supported proposed updates only
- duplicate identifiers block automatic matching
- Operations overlaps are flagged but excluded
- no Firestore write calls exist in the read service
- `xlsx` remains absent
- `read-excel-file@9.2.0` remains the workbook dependency
- QR payload remains `GSV:TICKET:{ticketCode}`
- access workflows remain disabled

## Authenticated Local Browser Dry Run

Authenticated local review was performed at `http://localhost:4173/payments/reconciliation` with CODEX_TEST still selected as the Working Event.

Original Phase 23C aggregate dry-run result:

- Workbook Records: 70
- Registration Records: 71
- Operations Records: 0
- Exact Match - Proposed Update: 12
- Possible Match - Manual Review: 1
- App-Only Registration: 59
- Duplicate: 56
- Blocked: 1
- No apply action visible
- No app-originated red console messages observed
- Refresh returned to the locked setup state and did not silently reload CPB data

The browser automation wrapper could not change the authenticated Chrome viewport from its fixed desktop-sized surface, so tablet and mobile behavior were reviewed through responsive source structure and existing mobile shell patterns rather than a fully resized authenticated browser pass.

## Phase 23C-R Refinement Gate

Phase 23C-R found that the original duplicate handling was over-broad. A workbook row was previously classified as duplicate if any identifier key was duplicated, even when the row also had a unique exact ticket-code match. That mixed warning instances with record classifications and made the 56 duplicate result misleading.

The matcher now:

- Prefers unique ticket-code evidence when available.
- Preserves name-only matches as manual review only.
- Treats duplicated ticket/reference keys as blocking only when they actually block automatic matching.
- Separates workbook-row classifications from app-registration classifications.
- Reports duplicate/contact warning instances separately from classification counts.
- Lists only changed proposal fields.

Corrected authenticated desktop dry-run aggregate:

- Workbook records: 70
- App registration records: 71
- App guest count from `personsAttending`: 71
- Operations records: 0
- App-originated console errors observed: 0
- No apply control exists.
- Refresh reset back to the locked target/workbook/confirmation state.

### Mutually Exclusive Workbook Classifications

These counts sum to 70 workbook rows.

| Classification | Count |
| --- | ---: |
| Exact Match - No Change | 0 |
| Exact Match - Proposed Update | 65 |
| Possible Match - Manual Review | 1 |
| Workbook Only | 0 |
| Duplicate/Non-Unique | 3 |
| Conflict | 0 |
| Blocked | 1 |

### Mutually Exclusive App Registration Classifications

These counts sum to 71 app registration documents.

| Classification | Count |
| --- | ---: |
| Matched - No Change | 0 |
| Matched - Proposed Update | 65 |
| Matched - Manual Review | 0 |
| App Only | 6 |
| Duplicate/Non-Unique | 0 |
| Conflict | 0 |
| Blocked | 0 |

### Warning-Instance Counts

Warnings may overlap and must not be added to classification totals.

| Warning type | Count |
| --- | ---: |
| Workbook row warnings | 1 |
| Duplicate workbook identifier keys | 22 |
| Duplicate app identifier keys | 37 |
| Duplicate blocking keys | 22 |
| Duplicate contact keys | 37 |
| Registrations missing ticket code | 0 |
| Registrations missing payment reference | 71 |
| Registrations missing email | 12 |
| Registrations missing phone | 7 |

### Duplicate Investigation

The previous 56 duplicate result was not 56 distinct duplicate records. It represented row classifications caused by duplicated identifier keys, mostly shared payment evidence/reference text and shared contact patterns. After refinement:

- Duplicate/non-unique workbook classification is 3 rows.
- Duplicate/non-unique app classification is 0 records.
- Duplicate groups remain visible as warning groups.
- Shared contact information does not automatically block a unique ticket-code match.
- Duplicated payment-reference/evidence keys remain warning or blocking evidence when no stronger unique match is available.

Detailed row-level duplicate evidence is intentionally not committed because it can expose private CPB identities. The committed report uses masked/aggregate evidence only.

### Proposal-Level Evidence

The refined proposal list contains 65 matched registrations, not the previously reported 12. All 65 visible proposals matched by unique ticket code in the browser review. The changed field list is displayed row by row in the local tool.

Common changed fields:

- `ticketPrice`
- `amountDue`
- `amountPaid`
- `balanceDue`
- `paymentStatus`
- `paymentMethod` where applicable
- `priceTier`

`paymentReference` is not proposed from the workbook evidence summary because that value is not a clean processor/bank reference. Identity, `eventId`, `personsAttending`, ticket code, check-in fields, and audit history are not proposed.

Because the proposal count changed from 12 to 65, Phase 23D must not begin until the organizer reviews and approves the revised proposal list.

### Finance Totals

Rounding rule: all displayed money is rounded to two decimal places with the existing app finance formatter.

| Source | Expected | Paid | Outstanding |
| --- | ---: | ---: | ---: |
| Workbook | BBD $6,740.00 | BBD $5,785.00 | BBD $100.00 |
| Current app registrations | BBD $0.00 | BBD $0.00 | BBD $0.00 |
| Hypothetical after 65 proposals | BBD $6,290.00 | BBD $5,420.00 | BBD $870.00 |

Differences:

- Workbook versus current expected: BBD $6,740.00
- Workbook versus current paid: BBD $5,785.00
- Workbook versus current outstanding: BBD $100.00
- Current versus hypothetical expected: BBD $6,290.00
- Current versus hypothetical paid: BBD $5,420.00
- Current versus hypothetical outstanding: BBD $870.00
- Workbook versus hypothetical expected: BBD $450.00
- Workbook versus hypothetical paid: BBD $365.00
- Workbook versus hypothetical outstanding: BBD -$770.00

These are reconciliation differences, not a conclusion about missing cash.

### Workbook Identity

- SHA-256: `77AF3050F82D97D12067728FC1314E51CA734F73B798AAD8D63C263421029D96`
- Size: 24,587 bytes
- Last modified: 2026-06-23 21:41:57 local time
- Sheets: `Payment Audit`, `Tier Summary`, `Buyer Summary`, `Review Needed`, `Method`
- Source sheet: `Payment Audit`
- Header row: row 1
- Data rows: rows 2-71
- Blank rows excluded: 0
- Parsed records: 70
- Duplicate physical ticket identifiers: 0
- Duplicate evidence-summary/payment-reference groups: 22
- Formula handling: preview uses cached worksheet XML values; no workbook mutation occurs.

Workbook status counts:

| Workbook status | Count |
| --- | ---: |
| Paid - Confirmed | 52 |
| Paid - Confirmed (Price Inferred) | 4 |
| Needs Review - No Gmail Proof Found | 1 |
| Partial - Balance Due | 2 |
| To Pay at Door | 7 |
| Paid - Confirmed / Register Mismatch | 4 |

### Ticket And Operations Findings

- Workbook duplicate ticket identifiers: 0
- App registrations missing ticket code: 0
- Payment proposals do not include ticket writes.
- Operations records loaded for CPB: 0
- Possible Operations overlap: 0
- No automatic conclusion is made about historical event accounting.
- Registration payment totals remain independent from Operations.

### Browser And Network Evidence

- Desktop authenticated browser review: completed at the fixed available Chrome viewport.
- Tablet authenticated browser review: not completed; Chrome wrapper could not provide actual resized viewport evidence.
- Mobile authenticated browser review: not completed; Chrome wrapper could not provide actual resized viewport evidence.
- Console result: no app-originated red console messages observed during dry run.
- Network no-write evidence: no write UI exists and read-only code imports only `getDocs`; a full browser Network panel capture was not completed.

Because actual tablet/mobile viewport evidence and full Network capture are not complete, Phase 23D remains blocked.

### Phase 23D Gate Decision

`PHASE 23D NOT READY`

Required before Phase 23D:

- Organizer review of the revised 65-row proposal list.
- Actual tablet and mobile viewport evidence.
- Browser Network evidence showing no Firestore commit/write/audit-log requests during dry run.
- Explicit approval of any future apply list after manual review rows, duplicate/non-unique rows, blocked rows, and app-only rows are excluded.

## Guardrails Preserved

- No Firestore writes
- No Firestore rules change
- No Firestore indexes change
- No dependency change
- No QR payload change
- No approvedEmails change
- No scanner permission expansion
- No access workflow activation
- No CPB import
- No CPB registration creation, edit, deletion, ticket change, check-in, or Operations edit
- No merge
- No deploy

## Deliberately Deferred

Phase 23C does not include:

- Apply updates
- Export package
- Saved reconciliation report
- Manual review workflow
- CPB record edits
- CPB import
- Payment gateway integration
- Overall profit calculation

## Recommended Phase 23D Scope

Phase 23D should be an approval-gated apply review for registration payment fields only. It should require row-level organizer approval, backup/export evidence, audit-log writes, strict preflight diff review, and an explicit rollback plan before any CPB production write is considered.
