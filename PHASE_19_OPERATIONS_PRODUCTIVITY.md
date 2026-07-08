# Phase 19 — Operations + Productivity

Status: active branch-only productivity lane  
Branch: `codex/phase-19-operations-productivity`  
Base commit: `83a3b9ff2fe19dce070761a66d93e4851f76e6cf`

## Scope

Phase 19 is limited to operations usefulness inside the existing private admin app.

This branch does not:

- redesign the dashboard
- create a public portal
- add payment processing
- add real email or WhatsApp sending
- add real AI API calls
- deploy Firestore rules or indexes
- touch CPB

## Improvements in this branch

1. Added ledger search across label, category, party, payment reference, notes, date, status, and entry type.
2. Added visible-view summaries so the filtered ledger can be reviewed without mental math.
3. Added copy-current-view and print-current-view helpers for organizer day-to-day operations.
4. Preserved selected-event scope, admin-write boundaries, and read-only helper access.

## Guardrails preserved

- Operations remains separate from ticket sales.
- CPB remains untouched.
- `approvedEmails` remains admin-only.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- No access-request workflow is activated.
