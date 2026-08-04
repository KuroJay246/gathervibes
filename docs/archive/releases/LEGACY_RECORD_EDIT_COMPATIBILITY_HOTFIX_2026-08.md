# Legacy Record Edit Compatibility Hotfix - 2026-08

## Scope

This hotfix addresses older registration records that open in the organizer edit form but fail to save with Firestore `permission-denied`.

Confirmed behavior before this hotfix:

- newly created registrations edit successfully;
- protected-owner/admin detection works;
- current Hosting and Firestore Rules are deployed;
- old registrations fail only when saving.

QR scanning, scanner permissions, Run of Show, Resources, CPB migration, and finance formulas are out of scope.

## Firestore Instance

- Project: `gathervibeshub`
- Database: `(default)`
- Edition: `STANDARD`
- Type: `FIRESTORE_NATIVE`

## Read-Only Production Diagnostic

A read-only CODEX_TEST schema diagnostic compared registration field names and types only. It did not print guest names, emails, phones, notes, or payment references.

### Old Registration Shape

Older CODEX_TEST registrations contain 30 keys:

```text
amountDue, amountPaid, attendeeNames, balanceDue, buyerName, checkInTime,
checkedIn, checkedInBy, createdAt, email, eventId, fullName, groupName,
notes, paymentMethod, paymentReference, paymentStatus, personsAttending,
phone, priceTier, registrationId, source, sourceRowId, ticketAssignedAt,
ticketAssignedBy, ticketCode, ticketPrice, ticketStatus, timestamp, updatedAt
```

### New Registration Shape

New current registrations contain those keys plus:

```text
attendanceRecordType, attendanceConfirmedAt, attendanceConfirmedBy, attendanceEvidenceNote
```

## Field Difference Table

| Field | Old value/type | New value/type | Current rule expectation | Current service expectation | Safe normalization |
| --- | --- | --- | --- | --- | --- |
| `attendanceRecordType` | missing | string | Normal registration detail edit must not change this field | Previously defaulted to `none` during normal edit | Do not write during normal details edit |
| `attendanceConfirmedAt` | missing | null or timestamp | Normal registration detail edit must not change this field | Previously defaulted to `null` during normal edit | Do not write during normal details edit |
| `attendanceConfirmedBy` | missing | null or string | Normal registration detail edit must not change this field | Previously defaulted to `null` during normal edit | Do not write during normal details edit |
| `attendanceEvidenceNote` | missing | string | Normal registration detail edit must not change this field | Previously defaulted to empty string during normal edit | Do not write during normal details edit |
| `ticketStatus` | string | string | Only ticket workflow may change ticket fields | Preserve by omission during normal edit | Leave unchanged |
| `ticketCode` | string or null | string or null | Only ticket workflow may change ticket fields | Preserve by omission during normal edit | Leave unchanged |
| `ticketAssignedAt` | null or timestamp | null or timestamp | Only ticket workflow may change ticket fields | Preserve by omission during normal edit | Leave unchanged |
| `ticketAssignedBy` | null or string | null or string | Only ticket workflow may change ticket fields | Preserve by omission during normal edit | Leave unchanged |
| `checkedIn` | boolean | boolean | Only check-in workflow may change live check-in fields | Preserve by omission during normal edit | Leave unchanged |
| `checkInTime` | null or timestamp | null or timestamp | Only check-in workflow may change live check-in fields | Preserve by omission during normal edit | Leave unchanged |
| `checkedInBy` | null or string | null or string | Only check-in workflow may change live check-in fields | Preserve by omission during normal edit | Leave unchanged |
| payment fields | number/string/null by field | number/string/null by field | Detail edit may update payment fields if valid | Registration editor may update payment fields | Preserve user-entered values; do not invent amounts |
| `createdAt` | timestamp | timestamp | Immutable historical field | Not included in update payload | Preserve unchanged |
| `updatedAt` | timestamp | timestamp | Must become request time | Set by service | Update only this metadata field |

## Exact Rejecting Rule Expression

The rejection is caused by this rule path:

```text
match /registrations/{registrationId}
allow update -> isApprovedRegistrationUpdate(registrationId)
-> isApprovedRegistrationDetailUpdate(registrationId)
-> validChangedRegistrationDetailFields(changedKeys)
```

`validChangedRegistrationDetailFields(changedKeys)` intentionally allows only normal registration detail and finance fields plus `updatedAt`.

When the service added missing attendance evidence defaults during a normal details edit, `changedKeys` included:

```text
attendanceRecordType, attendanceConfirmedAt, attendanceConfirmedBy, attendanceEvidenceNote
```

Those fields are deliberately excluded from normal detail edits, so the write was rejected.

## Full Document Update Problem

Firestore rules evaluate the post-update document. A partial `update()` still results in a full `request.resource.data` document. For old records, omitted legacy fields remain absent and unchanged. That is acceptable for normal detail edits because the registration detail update rule validates changed keys rather than requiring the entire document to be upgraded.

The failure happened because the client wrote new attendance fields, turning a normal details edit into a field transition that belongs to the historical attendance workflow.

## Service Fix

`registrationService.updateRegistration` now:

- updates only normal registration detail and payment fields from the form;
- sets `updatedAt`;
- creates the append-only audit log in the same Firestore batch;
- does not write ticket fields;
- does not write live check-in fields;
- does not write historical attendance evidence fields.

Dedicated services remain responsible for ticket assignment, live check-in, undo check-in, and historical attendance evidence.

## Rules Change

No Firestore Rules change is required for this fix.

The existing rules are the correct boundary:

- normal registration edits may update detail/payment fields;
- ticket fields are controlled by ticket workflows;
- live check-in fields are controlled by check-in workflows;
- attendance evidence fields are controlled by historical attendance workflows;
- audit logs remain append-only;
- lower roles remain restricted.

## Migration Decision

No production migration is required.

Older valid registrations can remain in their historical shape. They become editable because normal detail edits no longer attempt to add attendance evidence fields. A future controlled migration may normalize old records, but it must be dry-run first and must not target CPB automatically.

## Guardrails Preserved

- CPB was not read for this diagnostic and was not modified.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- Ticket codes are not changed by normal registration edits.
- Payment amounts are not invented.
- Attendance state is not changed by normal registration edits.
- Firestore indexes are not changed.
- Functions, Storage, and Auth configuration are not changed.
