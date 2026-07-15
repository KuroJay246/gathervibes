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
- `priceTier`

`paymentReference` is intentionally not proposed from workbook evidence-summary text. The workbook evidence summary can describe Gmail/payment proof, but it is not treated as a clean processor or bank reference for app writes.

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

## Phase 23C-R2 Approval Evidence Completion

Phase 23C-R2 completed the remaining evidence gate without applying CPB changes. The private manifest was generated outside the repository and must be treated as the frozen input for any later Phase 23D review.

- Evidence folder: `C:\Users\Jaylan\Desktop\GSV_Phase23C_Approval_Review`
- Private manifest: `C:\Users\Jaylan\Desktop\GSV_Phase23C_Approval_Review\CPB_Proposal_Manifest_Private.json`
- Masked manifest: `C:\Users\Jaylan\Desktop\GSV_Phase23C_Approval_Review\CPB_Proposal_Manifest_Masked.csv`
- Canonical private manifest SHA-256: `4E62EDED15E4DB33B8BD0336C5C45C46B8EF7493948D41FC20F0068021212D8B`
- Canonical order: registration document ID, then workbook row number, then field name.
- Full private manifest is not committed.

### R2 Classification Completion

The previously missing 70th workbook row is the single `Possible Match - Manual Review` row. It is not a warning count.

Workbook classifications now sum to exactly 70:

| Classification | Count |
| --- | ---: |
| Exact Match - No Change | 0 |
| Exact Match - Proposed Update | 65 |
| Possible Match - Manual Review | 1 |
| Workbook Only | 0 |
| Duplicate/Non-Unique | 3 |
| Conflict | 0 |
| Blocked | 1 |

App-registration classifications now sum to exactly 71:

| Classification | Count |
| --- | ---: |
| Matched - No Change | 0 |
| Matched - Proposed Update | 65 |
| Matched - Manual Review | 0 |
| App Only | 6 |
| Duplicate/Non-Unique | 0 |
| Conflict | 0 |
| Blocked | 0 |

### R2 Warning Instances

Warnings remain separate from record classifications and may overlap:

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

### R2 Proposal Manifest Summary

The frozen manifest contains 65 proposed registration updates and 373 supported field changes. `paymentReference` is excluded.

| Field | Proposed changes |
| --- | ---: |
| `ticketPrice` | 65 |
| `amountDue` | 65 |
| `amountPaid` | 58 |
| `balanceDue` | 58 |
| `paymentStatus` | 65 |
| `paymentMethod` | 7 |
| `priceTier` | 55 |

Proposal-size distribution:

| Proposal size | Count |
| --- | ---: |
| One field | 0 |
| Two fields | 0 |
| Three or more fields | 65 |

Blank-fill changes: 373. Existing nonblank app-value replacements: 0.

Unsafe-overwrite result: no nonblank app value is replaced by the manifest. All proposals still require organizer approval before any later apply phase.

Uniqueness result:

- Unique proposal count: 65
- Proposals downgraded to Manual Review: 1 workbook row
- Proposals downgraded to Conflict: 0
- Proposals downgraded to Blocked: 1 workbook row
- Name-only matches used for proposals: 0
- Amount-only matches used for proposals: 0
- Shared email-only or phone-only matches used for proposals: 0

### R2 Complete Finance Totals

Rounding rule: all money values are rounded to two decimals using the existing app finance formatter. Differences are reconciliation differences, not missing-cash conclusions.

| Source | Expected | Paid | Outstanding |
| --- | ---: | ---: | ---: |
| Workbook | BBD $6,740.00 | BBD $5,785.00 | BBD $100.00 |
| Current app registrations | BBD $0.00 | BBD $0.00 | BBD $0.00 |
| Hypothetical after approved proposals | BBD $6,290.00 | BBD $5,420.00 | BBD $870.00 |

Differences:

- Workbook minus current expected: BBD $6,740.00
- Workbook minus current paid: BBD $5,785.00
- Workbook minus current outstanding: BBD $100.00
- Hypothetical minus current expected: BBD $6,290.00
- Hypothetical minus current paid: BBD $5,420.00
- Hypothetical minus current outstanding: BBD $870.00
- Workbook minus hypothetical expected: BBD $450.00
- Workbook minus hypothetical paid: BBD $365.00
- Workbook minus hypothetical outstanding: BBD -$770.00

Status counts:

| Source | Status counts |
| --- | --- |
| Workbook | Paid - Confirmed: 52; Paid - Confirmed (Price Inferred): 4; Needs Review - No Gmail Proof Found: 1; Partial - Balance Due: 2; To Pay at Door: 7; Paid - Confirmed / Register Mismatch: 4 |
| Current app | unknown: 69; complimentary: 2 |
| Hypothetical | paid: 56; complimentary: 2; unknown: 4; door-list: 7; pending: 2 |

Current app finance-review count: 71.

### R2 Status Crosswalk

| Workbook status | Current app status | Proposed app status | Count | Mapping result |
| --- | --- | --- | ---: | --- |
| Paid - Confirmed | unknown | paid | 52 | Numeric workbook amount fields only; no event-default or Operations amount used. |
| Paid - Confirmed (Price Inferred) | unknown | paid | 4 | Numeric workbook amount fields only; no event-default or Operations amount used. |
| Partial - Balance Due | unknown | pending | 2 | Numeric workbook amount fields only; no event-default or Operations amount used. |
| To Pay at Door | unknown | door-list | 7 | Numeric workbook amount fields only; no event-default or Operations amount used. |

The single `Needs Review - No Gmail Proof Found` row is excluded from proposals as manual review.

### R2 Ticket And Operations Findings

- Paid app registrations without tickets: 0
- Workbook ticket identifiers without app registrations: 5
- Duplicate workbook ticket identifiers: 0
- Duplicate app ticket codes: 0
- Conflicting ticket identifiers: 0
- Payment-safe proposals requiring separate ticket review: 0
- CPB Operations record count: 0
- Possible Operations overlap count: 0
- Possible Operations overlap total: BBD $0.00

Zero CPB Operations records means no current overlap was found. It is not proof of complete historical accounting.

### R2 Browser Evidence

Screenshots were saved outside the repository:

- Desktop: `01-desktop-target-lock.png` through `10-desktop-operations-overlap.png`
- Tablet: `11-tablet-summary.png` through `15-tablet-finance-totals.png`
- Mobile: `16-mobile-target-lock.png` through `23-mobile-bottom-spacing.png`
- Console: `24-console-no-target.png` through `27-console-refresh-reset.png`
- Network: `28-network-firestore-reads.png` through `31-network-refresh-reset.png`

Responsive result:

- Desktop review completed.
- Tablet viewport `834 x 1112`: no horizontal overflow, readable money values, usable filters, no overlapping cards, no write control.
- Mobile viewport `390 x 844`: no horizontal overflow, identifiers wrap, money values fit, filters remain usable, bottom navigation does not cover content, no apply/write action appears.

Console result:

- No React exception, duplicate-key warning, Firebase permission error, spreadsheet error, number-format error, null/undefined app error, or app-originated write warning was observed.
- The only repeated red console message was browser-extension async listener noise, not an app-originated reconciliation error.

Network result:

- Sanitized summary: `C:\Users\Jaylan\Desktop\GSV_Phase23C_Approval_Review\network-no-write-summary.txt`
- Total captured requests: 73
- Firestore/auth-related requests: 18
- Expected read activity: Firestore `Listen` channel requests, Identity Toolkit account lookup, Secure Token refresh, local workbook `GET`.
- Firestore `Commit`: 0
- Firestore `BatchWrite`: 0
- Firestore write channel/RPC: 0
- Write-like request count: 0
- No document create/update/delete, audit-log creation, registration update, Operations update, or ticket update request was observed.

Source cross-check: reconciliation route/read utilities do not import or call `setDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `runTransaction`, registration update services, Operations update services, ticket update services, or audit-log append services.

### R2 Refresh And Target Reset

Refresh/reset evidence passed:

- Initial route has no target selected.
- Normal Working Event remains `CODEX_TEST Live Verification Event`.
- CPB target selection is explicit inside the reconciliation route.
- `CPB DRY RUN` is required.
- Workbook must be explicitly loaded.
- Refresh clears target, confirmation, workbook, result classifications, and proposal manifest.
- No reconciliation target is stored in localStorage.
- Revisiting the route starts locked.

### R2 Gate Decision

`PHASE 23D APPLY REVIEW READY`

This means only that Phase 23D may begin as a separate approval-review phase. It does not authorize applying data changes. The frozen manifest hash above must be rechecked before any Phase 23D approval workflow, and any changed manifest requires organizer re-review.

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
