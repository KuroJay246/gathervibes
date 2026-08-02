# Tutorial V3 Final Standard

Tutorial V3 teaches the current organizer workflow. It must be concise, event-neutral, and action-oriented.

## Final Lesson Matrix

| # | Lesson | Route | Target | Purpose | Write behavior |
| --- | --- | --- | --- | --- | --- |
| 1 | Working Event | `/dashboard` | `working-event-selector` | Explain selected-event scope. | No business write |
| 2 | Overview | `/dashboard` | `overview-summary` | Teach event health scan. | No business write |
| 3 | Create Event | `/events` | `create-event-action` | Show event setup entry. | Opens unsaved form only |
| 4 | Event Basics | `/events` | `event-name-field` | Explain event identity fields. | No save |
| 5 | Event Category | `/events` | `event-category-selector` | Explain event category. | No save |
| 6 | Optional Capabilities | `/events` | `event-capabilities-controls` | Explain event-specific options. | No save |
| 7 | Tasks & Deadlines | `/tasks` | `tasks-workspace` | Teach task workflow. | No business write |
| 8 | Guests & Registrations | `/registrations` | `registrations-workspace` | Explain records versus guests. | No business write |
| 9 | Add Registration | `/registrations` | `add-registration-action` | Show form entry without save. | Opens unsaved form only |
| 10 | Registration Filters | `/registrations` | `registration-filters-panel` | Teach safe filtering. | No business write |
| 11 | Registration Payments | `/payments` | `payments-summary-metrics` | Teach guest payment review. | No business write |
| 12 | Tickets | `/tickets` | `tickets-workspace` | Teach ticket preparation. | No ticket write |
| 13 | Check-In | `/check-in` | `checkin-search-field` | Teach search before check-in. | No check-in write |
| 14 | Operations Ledger | `/operations` | `operations-workspace` | Teach event-level ledger boundary. | No ledger write |
| 15 | Reconciliation Preview | `/payments/reconciliation` | `reconciliation-workspace` | Teach dry-run payment evidence review. | No save |
| 16 | Message Builder | `/communications` | `message-builder-workspace` | Teach copy-only messaging. | Clipboard only |
| 17 | Reports | `/event-review` | `reports-workspace` | Teach read-only reporting. | No business write |
| 18 | Import Center | `/imports` | `imports-workspace` | Teach preview-first import. | No import write |
| 19 | Settings | `/settings` | `settings-workspace` | Teach support/configuration area. | No business write |
| 20 | System QA and Help | `/qa` | `system-qa-workspace` | Teach technical QA separation. | No business write |

## Interaction Rules

- Show Me may navigate, scroll, open safe temporary forms, or focus controls.
- Let Me Try must not require destructive or financial writes.
- Back, Next, replay, refresh, and completion must remain deterministic.
- Scanner roles must not receive organizer tutorial routes.
- System QA content is owner/admin oriented.
