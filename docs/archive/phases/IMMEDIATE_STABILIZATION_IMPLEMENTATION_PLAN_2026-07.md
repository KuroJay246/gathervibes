# Immediate Stabilization Implementation Plan - 2026-07

Branch: `codex/immediate-stabilization-data-write-audit-quality`  
Base main: `f65aeba9bcf5f44372f7a49816386cef547ebb46`  
Audit source: `codex/full-repository-product-audit-2026-07` at `141f50b78f78b0ee8238b8f8355eba06caa05ce4`

## Selected P2 Findings

| Finding | Current Behavior | User Risk | Affected Files | Firestore Paths | Proposed Correction | Tests Required | Migration | Release Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PASS3-WRITE-P1-001` | Bulk/import writes commit in chunks; a later chunk can fail after earlier chunks succeeded. | Organizer may see vague failure and retry completed work. | `src/services/importService.js`, `src/services/registrationService.js`, `src/pages/ImportsPage.jsx`, `src/pages/RegistrationsPage.jsx` | `registrations/{id}`, `auditLogs/{id}` | Return deterministic operation results with chunk counts, completed/failed/unattempted rows, operation IDs, and safe retry inputs. | Unit tests for 1, 49, 50, 51 rows, chunk failures, retry remaining, duplicate retry. | None; client-side operation manifests are derived at runtime. | Phase 1 |
| `PASS3-IMP-P2-001` | `commitImport` uses 50-row chunks and throws on the first failed chunk. | Partial imports are possible without precise recovery guidance. | `src/services/importService.js`, `src/pages/ImportsPage.jsx` | `registrations/{id}`, `auditLogs/{id}` | Add import operation manifest, deterministic idempotency keys, partial-success result, and retryable remaining rows. | Import failure injection and retry tests. | None. | Phase 1 |
| `PASS3-PAY-P2-001` | `bulkUpdatePaymentStatus` updates `paymentStatus` only. | Contradictory finance states can be written, such as `paid` with balance outstanding. | `src/services/registrationService.js`, finance tests | `registrations/{id}`, `auditLogs/{id}` | Validate requested status against amount due, amount paid, balance, complimentary, and door state before the first write. | Contradiction tests for paid, pending, complimentary, door, door-list, and finance bulk updates. | None. | Phase 1 |
| `PASS3-WRITE-P2-002` | Audit details are compact and rarely include safe field-level before/after values. | Important business corrections are harder to reconstruct. | `src/services/auditService.js`, `src/services/registrationService.js`, `src/services/operationsLedgerService.js` | `auditLogs/{id}` | Add reusable safe before/after change summaries and operation metadata for changed business fields. | Tests for safe before/after inclusion and private-value exclusion. | None. | Phase 2 |
| `PASS3-OPS-P2-001` | Operations audit entries contain compact label/type/amount summaries. | Ledger changes are harder to audit precisely. | `src/services/operationsLedgerService.js` | `operationsLedger/{id}`, `auditLogs/{id}` | Add field-level safe before/after details for create/update/cancel. | Operations audit detail tests. | None. | Phase 2 |
| `PASS3-ROLE-P2-001` | Role descriptions still say scoped rules are not enforced yet. | Organizer-facing access copy contradicts current rules-backed staff model. | `src/utils/accessRoles.js`, `src/pages/SettingsPage.jsx`, role tests | `settings/accessControl`, `staffProfiles/{uid}`, `events/{eventId}/staffAssignments/{uid}` | Update role summaries without broadening permissions. | Role label/capability tests and scanner/operations/viewer boundary tests. | None. | Phase 3 |

## Deferred Audit Items

- `PASS1-P2-001`: Java 21 migration is environment maintenance, not this data-write stabilization.
- `PASS1-P2-002`: dev dependency remediation is a separate maintenance branch; production audit is clean.
- `PASS1-P2-003`: broad React Doctor cleanup is not included except for changed-file regressions.
- `PASS2-P2-002`: full Tutorial V3 production walkthrough remains manual acceptance.
- `PASS3-FORMS-P1-001` and `PASS3-FORMS-P2-001`: automatic Google Forms receiver and non-registration conversion workflows remain non-live.
- `PASS3-REC-P2-001`: reconciliation apply workflow remains out of scope for this first stabilization pass.

## Guardrails

- No production business data is used for tests.
- CPB remains a normal completed real event; no CPB-specific locks are added.
- CODEX_TEST remains the only special QA/test event.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- Firestore indexes are not expected to change.
- Firestore rules change only if required by new operation/audit shape and emulator tests prove it.
