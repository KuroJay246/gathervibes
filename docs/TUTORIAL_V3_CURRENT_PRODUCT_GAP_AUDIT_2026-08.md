# Tutorial V3 Current Product Gap Audit - 2026-08

Scope: Tutorial V3, current organizer routes, stable tutorial targets, and the in-app explanations affected by Run of Show, Event Resources, and Event Readiness.

## Result

Tutorial V3 was partially accurate before this release. It covered core organizer workflows, but it did not directly teach the newly completed Run of Show, Event Resources, or Event Readiness workflows. This release adds those three lessons and preserves zero-business-write tutorial behavior.

## Coverage Matrix

| Area | Route | Status Before | Status After | Notes |
| --- | --- | --- | --- | --- |
| Overview | `/dashboard` | Accurate | Accurate | Added Event Readiness explanation target on Overview. |
| Events | `/events` | Accurate | Accurate | Create Event, basics, category, and capability steps remain current. |
| Guided Setup | `/events` | Partially Accurate | Partially Accurate | Existing event-planning workspace remains represented by Events and Tasks; no new route was added. |
| Tasks and Deadlines | `/tasks` | Accurate | Accurate | Existing task lesson remains current. |
| Registrations | `/registrations` | Accurate | Accurate | Registration and guest distinction remains covered. |
| Registration Payments | `/payments` | Accurate | Accurate | Operations boundary remains covered. |
| Tickets | `/tickets` | Accurate | Accurate | QR privacy explanation remains current. |
| QR and Check-In | `/check-in` | Accurate | Accurate | Check-In remains separate from ticket assignment. |
| Operations | `/operations` | Accurate | Accurate | Ledger boundary remains current. |
| Commitments | `/operations` | Partially Accurate | Partially Accurate | Covered through Operations; not a separate tutorial step. |
| Documents | `/documents` | Missing | Missing | Current UI has stable route but no dedicated tutorial lesson yet. |
| Contacts | `/contacts` | Missing | Missing | Current UI has stable route but no dedicated tutorial lesson yet. |
| Organizations | `/contacts` | Missing | Missing | Organizations are managed through Contacts; no dedicated tutorial lesson yet. |
| Reports and Reconciliation | `/event-review`, `/payments/reconciliation` | Accurate | Accurate | Reports and dry-run reconciliation remain separate. |
| Import Center | `/imports` | Accurate | Accurate | Preview-first boundary remains current. |
| Response Inbox | `/responses` | Missing | Missing | Not included in current guided sequence. |
| Message Builder | `/communications` | Accurate | Accurate | Copy-only messaging remains covered. |
| Run of Show | `/run-of-show` | Missing | Accurate | Added operational sequence, Now/Next, dependencies, arrival, audit, and relationship-boundary lesson. |
| Event Resources | `/resources` | Missing | Accurate | Added quantity, shortage, supplier, pickup, return, packing, lifecycle, and financial-boundary lesson. |
| Event Readiness | `/dashboard` | Missing | Accurate | Added Ready, Needs Attention, At Risk, visible reasons, and recalculation lesson. |
| Settings | `/settings` | Accurate | Accurate | Tutorial replay remains covered. |
| System QA | `/qa` | Accurate | Accurate | Diagnostics remain separate from daily work. |

## Selector Audit

- Existing semantic targets remain based on `data-tour-id`.
- Added `run-of-show-workspace`, `resources-workspace`, and `event-readiness-summary`.
- No tutorial step relies on generated class names, row order, or text-only selectors.

## In-App Explanation Updates

- Overview now explains that Event Readiness is derived from visible records and is not a hidden score or guarantee.
- Run of Show and Resources page descriptions already explain event scope and boundary behavior.
- Tutorial copy now explicitly states relationship links do not automatically change linked Tasks, Documents, Operations, Commitments, quantities, amounts, or access.

## Deferred Tutorial Coverage

- Dedicated Documents lesson.
- Dedicated Contacts and Organizations lesson.
- Dedicated Response Inbox lesson.
- Dedicated Commitments lesson if Commitments becomes a first-class route.

These are deferred tutorial-content improvements only. No new product capability was added.

