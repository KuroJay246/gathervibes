# Tutorial V3 Step-by-Step Target Audit

Date: 2026-07-30

Tutorial version: `tutorial-v3-specific-guidance`

Total product-training moments: 22

Guided anchored lessons: 20

Separate non-anchored moments: Welcome and Completion

## Target and Behavior Inventory

| # | Purpose | Route | Intended Control | Registered Target | Container Opening | Expected Action | Advance Mode |
|---:|---|---|---|---|---|---|---|
| 1 | Welcome and purpose | Current page | Welcome dialog | Dialog, not `data-tour-id` | Opens from tutorial state | Start Guided Tour or Practice Using the App | Button action |
| 2 | Working Event | `/dashboard` | Working Event context strip | `working-event-selector` | None | Confirm event scope | Read, Show Me, Let Me Try |
| 3 | Overview | `/dashboard` | Overview metric section | `overview-summary` | None | Read metrics and Needs Attention | Read, Show Me, Let Me Try |
| 4 | Create Event | `/events` | Plan a New Event button | `create-event-action` | Closes stale event form first | Select Create Event | Show Me opens form safely |
| 5 | Event Basics | `/events` | Event name field | `event-name-field` | Opens event form, Basics step | Focus Event name | Show Me focuses field |
| 6 | Event Category | `/events` | Event type selector | `event-category-selector` | Opens event form, Basics step | Choose closest category | Show Me focuses selector |
| 7 | Optional Capabilities | `/events` | Capability checkbox group | `event-capabilities-controls` | Opens event form, Registration step | Turn on needed features only | Show Me opens controls |
| 8 | Planning Tasks | `/events` | Event planning workspace | `event-planning-workspace` | Closes unsaved form | Review readiness/planning items | Show Me returns to workspace |
| 9 | Guests & Registrations | `/registrations` | Registration workspace summary | `registrations-workspace` | None | Compare registration and guest counts | Read, Show Me, Let Me Try |
| 10 | Add Registration | `/registrations` | Add registration button | `add-registration-action` | None | Open form and cancel if practicing | Show Me opens form safely |
| 11 | Registration Filters | `/registrations` | Filters panel | `registration-filters-panel` | None | Review or choose filters | Read, Show Me, Let Me Try |
| 12 | Registration Payments | `/payments` | Payment metric row | `payments-summary-metrics` | None | Review expected, received, outstanding | Read, Show Me, Let Me Try |
| 13 | Tickets | `/tickets` | Ticket workspace | `tickets-workspace` | None | Review/assign ticket codes | Read, Show Me, Let Me Try |
| 14 | Check-In | `/check-in` | Search field | `checkin-search-field` | None | Focus guest/ticket search | Show Me focuses field |
| 15 | Operations Ledger | `/operations` | Operations summary | `operations-workspace` | None | Review ledger boundary | Read, Show Me, Let Me Try |
| 16 | Partners, Suppliers, and Sponsors | `/operations` | Partner commitments panel | `partners-commitments-panel` | Opens partner details | Review commitments summary | Show Me opens details |
| 17 | Message Builder | `/communications` | Message Builder workspace | `message-builder-workspace` | None | Preview/copy message content | Read, Show Me, Let Me Try |
| 18 | Reports | `/event-review` | Reports workspace | `reports-workspace` | None | Review read-only sections | Read, Show Me, Let Me Try |
| 19 | Import Center | `/imports` | Import source workspace | `imports-workspace` | None | Choose source, preview-first | Read, Show Me, Let Me Try |
| 20 | Settings | `/settings` | Settings workspace | `settings-workspace` | None | Find replay/configuration | Read, Show Me, Let Me Try |
| 21 | System QA and Help | `/qa` | System QA workspace | `system-qa-workspace` | None | Review QA safety area | Read, Show Me, Let Me Try |
| 22 | Completion | Current route | Completion dialog | Dialog, not `data-tour-id` | Opens after final lesson | Continue into the app | Button action |

## Target Validation

Every anchored lesson uses `isTargetAllowedForRoute` and `findRegisteredTarget` before presentation. Targets must be attached to the DOM, visible, measurable, and scrollable into view. The controller now prepares hidden containers before measurement:

- Event form steps open the form automatically.
- Event form step tabs change through `tutorial:event-form-step`.
- Planning Tasks closes the unsaved event form before targeting the workspace.
- Partner commitments opens the Operations details container.

## Visual Treatment

The spotlight backdrop was reduced from a heavy page dim to a lighter contextual overlay. The target cutout now uses a stronger border, glow, and ring while preserving surrounding page context.

## Safety

Show Me and Let Me Try perform UI-only demonstrations such as opening forms, focusing fields, opening details, or scrolling targets. The tutorial runtime still writes only onboarding preference progress under `staffProfiles/{uid}/preferences/onboarding`.
