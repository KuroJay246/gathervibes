# Ticket and QR Integrity Audit

Audit pass: Pass 3
Date: 2026-07-30
Scope: `src/utils/ticketUtils.js`, `src/utils/qrTicketUtils.js`, `src/services/ticketService.js`, `TicketsPage`, `ScannerPage`, Firestore rules, and tests.

## Result

Ticket and QR integrity is strong. QR payload remains exactly `GSV:TICKET:{ticketCode}` and contains no personal, payment, email, or phone data.

## Verified Behavior

- Ticket code generation uses normalized event prefix or GSV fallback.
- Ticket assignment validates duplicates against selected-event registrations.
- Duplicate imported ticket codes are blocked in import processing.
- Assignment, unassignment, and regeneration write registration updates with paired audit logs.
- QR parser accepts prefixed and raw ticket codes, normalizes safely, and rejects invalid values.
- Scanner lookup matches only registrations supplied for the selected Working Event.
- Ticket status is derived from ticket code presence in service updates.
- Completed-event tickets remain reviewable/editable for approved organizers.
- Scanner route remains isolated from organizer shell.

## Findings

| ID | Priority | Finding |
| --- | --- | --- |
| PASS3-TKT-P3-001 | P3 | Regeneration supersedes the previous code through a registration update and audit detail, but there is no separate invalidated-ticket collection because tickets are registration fields, not standalone documents. |
