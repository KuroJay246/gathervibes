# Check-In and Attendance Integrity Audit

Audit pass: Pass 3
Date: 2026-07-30
Scope: `ticketService`, `checkInUtils`, `attendanceUtils`, Check-In/Scanner pages, registration rules, scanner rules, and tests.

## Result

Check-In and historical attendance are semantically distinct. Live check-in changes only `checkedIn`, `checkInTime`, `checkedInBy`, and `updatedAt`; historical attendance uses `attendanceRecordType` and evidence fields without changing `checkedIn`.

## Verified Behavior

- Duplicate scan/check-in is blocked by `canCompleteCheckIn` and rules.
- Duplicate attempts can create audit-only records.
- Scanner check-in cannot edit payment, ticket, or registration identity fields.
- Normal scanner Undo Check-In and Check Out are not available.
- Guest counts use `personsAttending`.
- Historical attendance requires an evidence note and approved-organizer access.
- Completed events can receive historical attendance corrections under normal rules.
- Test-event attendance remains selected-event scoped.

## Findings

| ID | Priority | Finding |
| --- | --- | --- |
| PASS3-CHK-P3-001 | P3 | `attendanceRecordType` supports `manual-live`, but the audited write service reviewed in Pass 3 explicitly implements historical attendance and live check-in; any future manual-live UI should get the same audit scrutiny before activation. |
