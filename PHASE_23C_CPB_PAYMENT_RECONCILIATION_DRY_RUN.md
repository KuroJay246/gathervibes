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

Aggregate dry-run result:

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
