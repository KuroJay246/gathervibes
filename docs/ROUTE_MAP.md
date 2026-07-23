# Gather & Savor Event Hub Route Map

## Organizer routes

| Route | Navigation label | Purpose | Notes |
| --- | --- | --- | --- |
| `/login` | Login | Sign in with approved organizer access. | Public entry only. |
| `/dashboard` | Overview | Review the current Working Event, priorities, numbers, and quick actions. | Best starting point for demos. |
| `/events` | Events | Create, edit, select, and remove event records. | Working Event changes start here. |
| `/registrations` | Guests & Registrations | Manage registration records, guests, finance fields, and review filters. | Registrations and guests stay distinct. |
| `/payments` | Payments | Review registration charges, payments, balances, and finance follow-up. | Registration payments only. |
| `/payments/reconciliation` | Reconciliation Preview | Compare the locked CPB workbook with live records in read-only mode. | Internal audit tool; no apply action. |
| `/tickets` | Tickets | Assign ticket codes and prepare QR-ready access. | QR payload stays `GSV:TICKET:{ticketCode}`. |
| `/check-in` | Check-In | Search guests, confirm attendance, and use event-day helper lists. | Uses the selected event only. |
| `/scanner` | Scanner | Assigned-event scanner workflow for event-day staff. | Separate from organizer navigation. |
| `/operations` | Operations | Track event-level income, expenses, commitments, refunds, adjustments, and in-kind support. | Separate from registration payments. |
| `/communications` | Message Builder | Create, personalize, and copy event messages. | Copy-only; nothing is sent automatically. |
| `/imports` | Import Center | Import CSV, pasted tables, and XLSX with preview-first review. | Use CODEX_TEST for destructive demos. |
| `/event-review` | Reports | Review follow-up, registration payments, Operations, and event summary. | Read-only. |
| `/settings` | Settings | Review workspace defaults, access summary, and practical event settings. | No roadmap archive. |
| `/qa` | System QA | Review system status, safe demo guidance, release evidence, and checklist items. | Technical but organizer-readable. |

## Working Event rules

- Event-scoped routes use the selected Working Event.
- CODEX_TEST is the safe demo event.
- CPB is protected production data and must stay read-only during demos and routine QA.
- Clearing the Working Event should show clean empty states rather than stale data.
