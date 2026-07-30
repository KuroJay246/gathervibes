# CPB Historical Attendance Dry Run

Date: July 29, 2026

Scope: Cake Piknik Barbados production event (`zhaPxi31cpqLAW0cuS20`)

This document records a read-only dry run for historical attendance handling. No CPB registration, ticket, check-in, Operations, or audit-log record was created, edited, deleted, or backfilled during this phase.

## Current CPB Counts

Read-only Firestore query result:

| Measure | Current value |
| --- | ---: |
| Registration records | 69 |
| Guest count from `personsAttending` | 73 |
| Scanner/live checked-in registrations | 0 |
| Scanner/live checked-in guests | 0 |
| Organizer-confirmed historical attendance records | 0 |
| Registration records lacking attendance evidence | 69 |

The app also preserves documentary audit context showing approximately 70 patrons attended, with an attendance evidence gap of 13 compared with Gmail-supported ticket spaces. That aggregate evidence is not a system check-in record and must not be converted into QR scans.

## Proposed Historical-Attendance Model

Phase 26 introduces a generic attendance distinction for all event types:

| Attendance state | Meaning | Effect on `checkedIn` |
| --- | --- | --- |
| `none` | No attendance evidence is recorded. | Remains `false` unless already checked in. |
| `scanner-confirmed` | Existing live check-in workflow recorded attendance. | Derived from existing `checkedIn: true`. |
| `manual-live` | Future organizer-only live correction model. | Not activated by this phase. |
| `organizer-confirmed-historical` | Organizer confirms historical attendance from non-scan evidence. | Remains separate from `checkedIn`; does not count as a QR scan. |

Optional registration fields:

| Field | Purpose |
| --- | --- |
| `attendanceRecordType` | Stores the attendance evidence classification. |
| `attendanceConfirmedAt` | Stores the organizer confirmation timestamp for historical evidence. |
| `attendanceConfirmedBy` | Stores the approved organizer identity string. |
| `attendanceEvidenceNote` | Stores the concise evidence note. |

## Proposed CPB Changes

No CPB changes are proposed for execution in this phase.

If a future organizer-approved CPB attendance correction package is created, it should:

1. Match one named registration at a time.
2. Verify the registration ID and current values before writing.
3. Leave `checkedIn`, `checkInTime`, and `checkedInBy` unchanged unless a separate live check-in correction is explicitly approved.
4. Set `attendanceRecordType` to `organizer-confirmed-historical`.
5. Set `attendanceConfirmedAt` to the server timestamp.
6. Set `attendanceConfirmedBy` to the approved organizer identity.
7. Add a concise evidence note to `attendanceEvidenceNote`.
8. Create one append-only audit log with action `registration.attendance-update`.

## Before / After Totals

Dry-run only:

| Measure | Before | After dry run |
| --- | ---: | ---: |
| Registration records | 69 | 69 |
| Guest count | 73 | 73 |
| Scanner/live checked-in registrations | 0 | 0 |
| Scanner/live checked-in guests | 0 | 0 |
| Organizer-confirmed historical attendance records | 0 | 0 |
| Registration records lacking attendance evidence | 69 | 69 |

## Audit Action

Future exact action:

`registration.attendance-update`

The audit log must be append-only and paired with the registration update in the same batch. Scanner users must not receive permission to create or edit historical attendance fields.

## Rollback Approach

If a future approved historical-attendance correction is entered incorrectly:

1. Do not delete the original audit log.
2. Create a new approved organizer correction that restores `attendanceRecordType` to `none`, clears historical attendance metadata, and appends a corrective audit log.
3. Verify `checkedIn`, `checkInTime`, `checkedInBy`, ticket records, payment records, Operations entries, and CPB aggregate finance totals remain unchanged.

## Guardrail Result

CPB remained untouched. This dry run added only the generic code and documentation foundation needed to support a future evidence-gated attendance correction workflow.
