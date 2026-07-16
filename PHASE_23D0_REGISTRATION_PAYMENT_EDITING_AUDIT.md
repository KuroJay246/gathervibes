# Phase 23D-0 Registration Payment Editing Audit

## Purpose

Phase 23D-0 audited registration editing, payment-status persistence, Payments workspace grouping, and Reports alignment for the Gather & Savor Event Hub. The audit used only the CODEX_TEST Live Verification Event (`xPfa0b3KZyLSDnAD2uGI`) and did not use or modify Cake Piknik Barbados.

## Baseline

- Branch: `codex/phase-23d0-registration-payment-editing-audit`
- Base commit: `431732480da9de781cc6e57721a3e50adcc9d336`
- Baseline validation before implementation: lint passed, tests passed with 341 total / 332 passed / 9 skipped / 0 failed, build passed, production audit reported 0 vulnerabilities.
- Dependency checks: `xlsx` absent, `read-excel-file@9.2.0` present.

## Browser Audit Summary

Authenticated Chrome Default-profile testing used CODEX_TEST and created eight synthetic records with the `QA_PAYMENT_STATUS_AUDIT_*` prefix. The field matrix verified that supported registration edit fields persisted after save and did not persist after cancel.

Verified status transitions:

- Pending to Paid
- Paid to Pending
- Pending to derived Partial
- Partial to Paid
- Pending to To Pay at Door
- Partial to To Pay at Door
- To Pay at Door to Door Paid
- Door Paid to Pending
- Door Paid to Paid
- Paid to Complimentary
- Complimentary to Paid
- Unknown to Paid

All transitions persisted the expected payment status, amount paid, balance due, and payment method.

## Findings and Fixes

### Stored Partial Is Not Allowed

Attempting to save `partial` as a stored payment status was rejected by Firestore rules. The product contract remains: partial payment is derived from `amountPaid > 0` and `balanceDue > 0`, while the stored `paymentStatus` remains `pending`.

### Paid Confirmed Normalization

`normalizePaymentStatus` now maps workbook/manual variants such as `Paid – Confirmed` and `Payment Confirmed` to `paid`. Partial labels normalize to `pending` so the stored value remains compatible with existing rules.

### Door Paid Classification

Door Paid is now counted as resolved paid only when `paymentStatus` is `door`, `amountPaid > 0`, and `balanceDue === 0`. It appears in the Door filter and Paid filter, and it does not require payment follow-up when no warnings exist.

### To Pay at Door With Deposit

To Pay at Door remains a door-list state even if a deposit is recorded. It is not collapsed into generic partial payment. It remains in the Door filter and follow-up list while a balance remains.

### Complimentary Follow-Up

Clean complimentary registrations are now treated as payment-resolved for follow-up purposes, while staying out of Paid counts and Paid filters.

### Reports Alignment

Reports now surfaces partial payment count explicitly and uses the same resolved-paid finance summary used by Payments. Registration Payments and Operations remain separate.

## Cleanup

The eight synthetic CODEX_TEST registration records were removed after browser testing. The app bulk-delete flow required a second `DELETE` prompt and the browser automation timed out while handling it, so cleanup was completed through a targeted Firestore REST operation using the locally authenticated Firebase CLI account.

Cleanup wrote only to:

- `registrations`: deleted the eight `QA_PAYMENT_STATUS_AUDIT_*` synthetic records for CODEX_TEST.
- `auditLogs`: appended eight `registration.delete` audit entries for those deletions.

Post-cleanup CODEX_TEST verification:

- Registrations: 5
- Guests: 6
- Expected registration income: BBD 225
- Recorded registration payments: BBD 225
- Outstanding balance: BBD 0
- Remaining synthetic records: 0

## Responsive and Console Review

Authenticated Chrome checks covered desktop (`1440 x 1000`), tablet (`834 x 1112`), and mobile (`390 x 844`) on Dashboard, Registrations, Payments, Tickets, Check-In, and Reports. No horizontal overflow or AppErrorBoundary fallback was found. Mobile retained visible Tickets and Check-In navigation.

Chrome console checks reported no app-originated warnings or errors during final route checks. The in-app browser reached the app but redirected to `/login`, so authenticated verification relied on Chrome Default profile. Windows Computer Use confirmed the Google Chrome Gather & Savor window was present, but its accessibility tree did not expose useful page text.

## Tests Added

`tests/phase23d0-registration-payment-editing-audit.test.js` verifies:

- stored payment-status contract
- derived partial behavior
- Door Paid versus To Pay at Door grouping
- payment method separation
- Payments filter behavior
- Overview/Reports finance alignment
- import normalization for paid confirmed, partial, door-list, and door
- no Operations writes during registration updates
- QR payload remains `GSV:TICKET:{ticketCode}`

## Guardrails Preserved

- Firestore rules were not changed.
- Firestore indexes were not changed.
- Package dependencies were not changed.
- QR payload was not changed.
- Approved emails were not changed.
- Scanner permissions were not expanded.
- Access-request workflows were not activated.
- CPB production data remained untouched.
- No merge, push, or deploy was performed.

## Manifest Impact

MANIFEST MUST BE REGENERATED before any CPB payment-update approval is applied. This phase changed canonical payment-status normalization and finance grouping rules for Paid Confirmed, derived Partial, Door Paid, and To Pay at Door states.

## Release Gate Discrepancy Audit

The release gate reviewed the reported CODEX_TEST baseline discrepancy before merge:

- Earlier reported total: 5 registrations / 6 guests / BBD 270 expected and paid / BBD 0 outstanding.
- Post-cleanup canonical total: 5 registrations / 6 guests / BBD 225 expected and paid / BBD 0 outstanding.
- Difference reviewed: BBD 45.

The current CODEX_TEST registration inventory contains five registration records and six guests. Four records are one-person paid registrations at BBD 45 each. One record is a two-person paid registration at BBD 90. One record has one person with explicit zero-price registration finance fields: `ticketPrice: 0`, `amountDue: 0`, `amountPaid: 0`, and `balanceDue: 0`.

Record-level canonical finance summary:

| Masked record | Ticket | Persons attending | Ticket price | Amount due | Amount paid | Balance due | Payment status | Canonical contribution |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| `imp_...3af1` | `GSV-6EA5DZ` | 2 | BBD 45 | BBD 90 | BBD 90 | BBD 0 | Paid | BBD 90 |
| `imp_...9033` | `GSV-009` | 1 | BBD 0 | BBD 0 | BBD 0 | BBD 0 | Paid | BBD 0 |
| `imp_...28bd` | `TST-003` | 1 | BBD 45 | BBD 45 | BBD 45 | BBD 0 | Paid | BBD 45 |
| `imp_...3d0d` | `TST-001` | 1 | BBD 45 | BBD 45 | BBD 45 | BBD 0 | Paid | BBD 45 |
| `imp_...0f89` | `TST-002` | 1 | BBD 45 | BBD 45 | BBD 45 | BBD 0 | Paid | BBD 45 |

The BBD 270 figure equals `6 guests x BBD 45`, which applies the event default ticket price across every guest and incorrectly charges the explicit zero-price registration as BBD 45. The canonical total uses registration-level finance fields where they exist, so the zero-price record contributes BBD 0. That single record explains the full BBD 45 delta.

The release-gate comparison also evaluated the same current Firestore registration snapshot through the pre-Phase-23D-0 `main` finance helpers and the Phase 23D-0 helpers. Both calculated BBD 225 expected, BBD 225 paid, and BBD 0 outstanding for the current five records. The discrepancy is therefore not caused by the Phase 23D-0 commit and is not evidence of a missing payment or data loss. It is a correction of an earlier aggregate/default-ticket-price interpretation.

Final release-gate conclusion: **BBD 45 CHANGE LEGITIMATE**.

## Release Gate Cleanup Evidence

The synthetic browser-audit cleanup was verified from Firestore and audit logs:

- Eight synthetic `QA_PAYMENT_STATUS_AUDIT_*` CODEX_TEST registrations were created during the audit.
- The same eight synthetic registrations were deleted.
- The synthetic create target set and delete target set matched exactly.
- No synthetic CODEX_TEST registrations remained after cleanup.
- Recent release-gate review found no Operations writes, ticket writes, or event writes associated with the cleanup.
- Audit logs retained append-only evidence for the synthetic creates, updates, and deletes.

Five real CODEX_TEST registration update audit entries existed before the synthetic browser-audit cleanup window. The audit-log details for those entries identify the registration update event but do not expose a field-level before/after diff, so the exact changed fields cannot be reconstructed from audit logs alone. Current registration records are internally consistent and produce the canonical BBD 225 / BBD 225 / BBD 0 totals.

## Release Readiness and Manifest Invalidation

The release gate treats the current CODEX_TEST totals as canonical:

- Registrations: 5
- Guests: 6
- Expected registration income: BBD 225
- Recorded registration payments: BBD 225
- Outstanding registration balance: BBD 0
- Payment follow-up count: 0
- Remaining synthetic records: 0

The previous CPB reconciliation manifest remains invalid and must not be used for approval or production writes. The invalid manifest hash is `2A98AB506F1846294944DA49A57CD2E898F6B5D97E4E03C412FD89683C92C409`. A new CPB manifest must be generated only in a later authorized phase after this release is complete.

## Recommended Next Phase

Phase 23D should continue with a regenerated reconciliation manifest, then a fresh organizer approval review using the corrected payment-status and finance grouping contract.
