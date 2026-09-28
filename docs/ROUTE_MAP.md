# Gather & Savor Event Hub Route Map

## Organizer routes

| Route | Navigation label | Purpose | Notes |
| --- | --- | --- | --- |
| `/login` | Login | Sign in with approved organizer access. | Public entry only. |
| `/dashboard` | Home | Review the current Working Event, priorities, numbers, and next actions. | Best starting point for daily organizer work. |
| `/events` | Events | Create, edit, select, and remove event records. | Working Event changes start here. |
| `/registrations` | Guests & Registrations | Manage registration records, guests, finance fields, and review filters. | Registrations and guests stay distinct. |
| `/payments` | Payments | Review registration charges, payments, balances, and finance follow-up. | Registration payments only. |
| `/payments/reconciliation` | Review & Reconcile Records | Compare an organizer-approved payment workbook with the selected event in read-only mode. | Internal audit tool; no apply action. |
| `/tickets` | Tickets | Assign ticket codes and prepare QR-ready access. | QR payload stays `GSV:TICKET:{ticketCode}`. |
| `/check-in` | Check-In | Search guests, confirm attendance, and use event-day helper lists. | Uses the selected event only. |
| `/scanner` | Scanner | Assigned-event scanner workflow for event-day staff. | Separate from organizer navigation. |
| `/operations` | Operations | Track event-level income, expenses, commitments, refunds, adjustments, and in-kind support. | Separate from registration payments. |
| `/communications` | Message Builder | Create, personalize, and copy event messages. | Copy-only; nothing is sent automatically. |
| `/imports` | Import Center | Import CSV, pasted tables, and XLSX with preview-first review. | Use CODEX_DEMO for synthetic QA and rehearsal. |
| `/event-review` | Reports | Review follow-up, registration payments, Operations, and event summary. | Read-only. |
| `/settings` | Settings | Review workspace defaults, access summary, and practical event settings. | No roadmap archive. |
| `/qa` | System QA | Review system status, safe QA guidance, release evidence, and checklist items. | Technical but organizer-readable. |

## Working Event rules

- Event-scoped routes use the selected Working Event.
- CODEX_DEMO is the safe synthetic QA and demo event.
- Real events share the same standard safeguards and must not be used for synthetic QA.
- Clearing the Working Event should show clean empty states rather than stale data.

## Mobile parity audit (2026-09-28)

The native app keeps five compact primary destinations on phones: Home, Guests,
Scan, Tasks, and More. Event selection is a modal searchable picker rather than
an inline list, so a large assignment set does not consume the page. The
current event can be changed from Home or Settings without signing out.

| Web capability | Mobile surface | Current state | Next decision |
| --- | --- | --- | --- |
| Dashboard / Working Event | Home | Compact native summary with live event-scoped listeners | Continue hierarchy and live-state QA |
| Events | Event picker sheet | Native picker with chronological rows and search | Add runtime switch-from-context proof |
| Registrations / Guests | Guests | Native bounded lookup and guest detail | Expand registration filters and editing parity |
| Tickets | Guests / ticket detail | Read-only ticket lookup and detail | Add ticket-management decision for owner role |
| Check-In / Scanner | Scan | Native scanner, manual fallback, result states | Complete physical/device acceptance |
| Tasks | Tasks | Native event-scoped list | Recheck write/conflict parity against web |
| Operations | More > Operations | Native read-only operational summary | Decide approved native write scope |
| Run of Show | More > Run of Show | Native read-only timeline | Continue runtime evidence and accessibility QA |
| Contacts | More > Event Contacts | Native compact list | Add search/action parity where authorized |
| Reports / Event Review | More > Reports | Native compact summary | Expand payment/reconciliation coverage |
| Documents | More > Operational Notes | Native read-only notes/documents subset | Decide document-management scope |
| Resources | None | Native capability not yet implemented | Decide mobile read/review workflow |
| Payments | Reports subset | Read-only summary only | Design mobile payment review without implying a gateway |
| Payment reconciliation | None | Native capability not yet implemented | Assess mobile review/status before any apply action |
| Imports | None | Native capability not yet implemented | Assess a preview-first mobile subset |
| Communications / Message Builder | None | Native capability not yet implemented | Assess compose/preview/copy workflow |
| Settings | More > Settings | Native account, event, security, and connectivity view | Add approved operational settings deliberately |
| System QA | None | Web deep-link only | Keep technical QA out of primary mobile navigation |

The audit is a product-scope record, not a claim that every web capability is
already native. “Not yet implemented” is a current implementation status, not
a permanent product decision. Native screens must retain event scoping, capability checks,
read/write boundaries, listener cleanup, and explicit offline behavior.
