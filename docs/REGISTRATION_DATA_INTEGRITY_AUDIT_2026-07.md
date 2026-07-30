# Registration Data Integrity Audit

Audit pass: Pass 3
Date: 2026-07-30
Scope: `src/services/registrationService.js`, `src/components/registrations/*`, `src/pages/RegistrationsPage.jsx`, `src/utils/validators.js`, `src/utils/registrationMetrics.js`, `src/utils/importUtils.js`, `firestore.rules`, and registration/import/check-in tests.

## Result

Registration data integrity is mostly sound for current workflows. Creation, editing, deletion, imports, bulk payment changes, and historical attendance all remain selected-event scoped and use Firestore batches with paired audit logs where they write business data.

## Field Dictionary

| Field | Meaning | Integrity rule |
| --- | --- | --- |
| `registrationId` | Firestore document identity | Immutable and must match document ID in rules. |
| `eventId` | Selected Working Event scope | Immutable on update; import/create writes selected event ID. |
| `fullName` | Primary registration display name | Required by validator and rules. |
| `buyerName` | Purchaser/contact identity | Optional; preserved separately from attendees. |
| `attendeeNames` | Guest names represented by the registration | Optional list, max 100 in rules. |
| `groupName` | Group/table/school/organization label | Optional organizer grouping field. |
| `personsAttending` | Guest count represented by one registration | Must be integer 1..100 in UI validator and rules. |
| `email` | Contact email | Normalized lower-case by manual save and import utility. |
| `phone` | Contact phone | Normalized by import utility; manual save trims only. |
| `source` | Manual/import provenance | Set to `manual` or import source; immutable after create. |
| `sourceRowId` | Import duplicate/provenance key | Used in duplicate checks; immutable after create. |
| `paymentStatus` | Registration payment state | Normalized and validated. |
| `priceTier` | Organizer-facing tier label | Optional; not a rules-enforced enum on registration. |
| `ticketPrice` | Per-person price when explicit | Non-negative money. |
| `amountDue` | Registration-level expected total | Calculated from explicit due or ticketPrice x persons. |
| `amountPaid` | Confirmed collected amount | Non-negative money; defaults to 0 when blank. |
| `balanceDue` | Remaining balance | Calculated when not explicit. |
| `paymentMethod` | Method classification | Normalized to supported labels. |
| `paymentReference` | Optional reference | String; not required for paid status by current default. |
| `ticketStatus` | Ticket assignment state | Must match allowed statuses. |
| `ticketCode` | QR/check-in code | Optional, validated by ticket workflow. |
| `checkedIn` | Live check-in state | Scanner/admin check-in only; separate from historical attendance. |
| `attendanceRecordType` | Attendance evidence type | Supports none, scanner-confirmed, manual-live, organizer-confirmed-historical. |

## Verified Behavior

- Registration totals count documents; guest totals sum `personsAttending`.
- Buyer and attendee names are represented separately in form, import mapping, display, and search.
- Imports cannot silently overwrite existing registrations; duplicate candidates are reviewed before commit.
- Completed events are editable by approved organizers under normal safeguards.
- Test-event records are selected-event scoped and should not appear in normal event-list totals by default.
- Deletes use service-level audit logs and UI delete dialogs.

## Discrepancy Register

| ID | Priority | Discrepancy |
| --- | --- | --- |
| PASS3-REG-P2-001 | P2 | Bulk delete and import are chunked; earlier chunks are not rolled back if a later chunk fails. |
| PASS3-REG-P3-001 | P3 | Manual phone entry is trimmed but not normalized like import phone values. |
| PASS3-REG-P3-002 | P3 | Registration `priceTier` is free text at registration level, so invalid legacy tier labels can persist as review data. |
