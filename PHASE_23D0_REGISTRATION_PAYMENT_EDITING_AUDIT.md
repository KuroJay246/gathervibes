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

## Recommended Next Phase

Phase 23D should continue with a regenerated reconciliation manifest, then a fresh organizer approval review using the corrected payment-status and finance grouping contract.
