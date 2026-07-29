# Fresh Component To Rendered UI Map

Date: 2026-07-29

## Shared Shell

| Rendered area | Component | File | Layout source |
| --- | --- | --- | --- |
| Desktop sidebar | `SidebarContent` | `src/layout/AppShell.jsx` | `aside fixed inset-y-0 left-0 w-[258px]` |
| Mobile More drawer | `SidebarContent` with `mobileMoreGroups` | `src/layout/AppShell.jsx` | `w-[min(20rem,calc(100vw-2rem))]` |
| Header | `AppShell` | `src/layout/AppShell.jsx` | sticky header, `max-w-[1480px]` |
| Working Event strip | `AppShell` | `src/layout/AppShell.jsx` | `rounded-2xl ... px-4 py-3` |
| Page outlet | `Outlet` | `src/layout/AppShell.jsx` | `main px-4 ... lg:px-10`, inner `max-w-[1480px]` |
| Mobile bottom nav | `AppShell` | `src/layout/AppShell.jsx` and `src/styles.css` | `.mobile-tab-bar`, `.mobile-tab-item` |

Shared shell finding:

- The 320px overflow is not page-specific. It appears on all 14 measured routes at `mobile-320x568`.
- Source-level suspects are `html/body min-width: 320px` in `src/styles.css` and main wrapper padding in `src/layout/AppShell.jsx`.

## Navigation

Primary desktop nav labels:

- Overview
- Events
- Guests & Registrations
- Payments
- Tickets
- Check-In
- Operations
- Message Builder
- Reports
- Import Center
- Settings
- System QA

Mobile primary nav:

- Overview
- Guests
- Tickets
- Check-In
- More

Source:

- `navGroups` and `mobileMoreGroups` in `src/layout/AppShell.jsx`.

Risk:

- The mobile nav currently includes Check-In prominently, which is correct for event-day work.
- System QA is kept under More/Admin, which is correct.

## Overview

| Rendered section | Source |
| --- | --- |
| Current event hero | `src/pages/DashboardPage.jsx` |
| Metric row | `Metric` usage in `DashboardPage.jsx` |
| Needs Attention | Readiness helpers in `src/utils/eventReadiness.js` |
| Quick Actions | Links in `DashboardPage.jsx` |
| Event details / progress disclosures | `details className="phase23v-panel"` in `DashboardPage.jsx` |

Finding:

- Overview is now product-oriented, but it still contains secondary planning details behind disclosures near the page bottom.

## Events

| Rendered section | Source |
| --- | --- |
| Event calendar | `src/pages/EventsPage.jsx` |
| Event form modal | `src/components/events/EventFormModal.jsx` |
| Selected event planning workspace | `src/components/events/EventPlanningWorkspace.jsx` |
| Budget and cash position | `EventPlanningWorkspace.jsx` |
| Readiness checklist | `EventPlanningWorkspace.jsx` |

Oversized planning-number source:

- `EventPlanningWorkspace.jsx`
- Parent section: `grid gap-6 xl:grid-cols-[0.95fr_1.05fr]`
- Budget card: `rounded-[24px] border ... bg-white p-5 ... sm:p-6`
- Inner metric grid: `mt-5 grid gap-3 sm:grid-cols-2`

Finding:

- The budget/cash panel is structurally paired with readiness as a major page section, even when values are small or empty.

## Guests & Registrations

| Rendered section | Source |
| --- | --- |
| Summary metrics | `src/pages/RegistrationsPage.jsx` |
| More Registration Metrics | `details className="phase23v-panel"` |
| Registration audit details | `details className="phase23v-panel border-[#D8C5A8]` |
| Filters/tabs | `RegistrationsPage.jsx` |
| Desktop table | `RegistrationsPage.jsx` |
| Mobile cards | `src/components/registrations/RegistrationCard.jsx` |
| Registration modal | `src/components/registrations/RegistrationFormModal.jsx` |

Rendered table finding:

- Desktop wrapper: `overflow-x-auto`, width about `1085px`.
- Table: about `1216px` at `1440 x 900`.
- The Finance Review table cell combines multiple values and statuses.

## Payments

| Rendered section | Source |
| --- | --- |
| Payment summary and follow-up | `src/pages/PaymentsPage.jsx` |
| Payment evidence disclosure | `details className="phase23v-panel border-[#D8C5A8]` |
| Filters | `PaymentsPage.jsx` |
| Records table | `PaymentsPage.jsx` |

Source finding:

- Payments table uses `min-w-[1080px]`.
- This protects audit detail but creates a dense financial review surface.

## Tickets

| Rendered section | Source |
| --- | --- |
| Ticket summary | `src/pages/TicketsPage.jsx` |
| Ticket generation controls | `TicketsPage.jsx` |
| Assigned/missing tickets | `TicketsPage.jsx` |
| QR payload helper | `src/utils/qrTicketUtils.js` |

Guardrail:

- QR payload remains ticket-code-only in source and prior tests.

## Check-In And Scanner

| Rendered section | Source |
| --- | --- |
| Organizer check-in page | `src/pages/CheckInPage.jsx` |
| QR scanner panel | `src/components/checkin/QrScannerPanel.jsx` |
| Scanner route | `src/pages/ScannerPage.jsx` |
| Assigned event gate | `src/components/AssignedEventGate.jsx` |

Finding:

- Check-In contains several `phase23v-panel` disclosures, including attendance counts, helper exports, and advanced filters.
- Scanner remains outside `AppShell`, which keeps helper access separate from organizer navigation.

## Operations

| Rendered section | Source |
| --- | --- |
| Operations summaries | `src/pages/OperationsPage.jsx` |
| Ledger table | `OperationsPage.jsx` |
| Partner commitments | `src/components/operations/PartnerCommitmentsPanel.jsx` |
| Event-level finance helpers | `src/utils/operationsLedger.js`, `src/services/operationsLedgerService.js` |

Finding:

- Operations is the correct home for event-level obligations, but the page remains dense because it combines ledger, partner commitments, evidence, filters, and summaries.

## Message Builder

| Rendered section | Source |
| --- | --- |
| Recipient filters | `src/pages/CommunicationsPage.jsx` |
| Templates | `CommunicationsPage.jsx` |
| Prompt Builder | `CommunicationsPage.jsx` |
| Copy-only utilities | `src/utils/communicationsUtils.js` |

Finding:

- Product wording is honest: messages are not sent automatically and no AI API is connected.

## Reports

| Rendered section | Source |
| --- | --- |
| Event Report & Review | `src/pages/EventReviewPage.jsx` |
| Follow-up calculations | `src/utils/eventReview.js` |
| Current vs post event wording | `src/utils/eventReview.js` |

Finding:

- Reports correctly separates registration payments, Operations summary, and event summary.
- It should stay read-only and not become another command center.

## Settings

| Rendered section | Source |
| --- | --- |
| Settings tab shell | `src/pages/SettingsPage.jsx` |
| Account | `SettingsPage.jsx` |
| Workspace | `SettingsPage.jsx` |
| Event Defaults | `SettingsPage.jsx` |
| Organizer Access | `SettingsPage.jsx` |
| Tickets & Check-In | `SettingsPage.jsx` |
| Data & Messages | `SettingsPage.jsx` |
| Advanced | `SettingsPage.jsx` |

Organizer count source:

- `listApprovedAccessEntries(accessControl || {})`
- `secondaryOrganizerCount = approvedEntries.filter((entry) => !entry.protectedOwner).length`

Finding:

- The count is allowlist-entry based after excluding protected owner. It does not represent staff profile count or all possible helper assignments.

## System QA

| Rendered section | Source |
| --- | --- |
| System QA shell | `src/pages/QaPage.jsx` |
| Runtime health | `src/utils/runtimeHealth.js`, `src/components/SystemHealthPanel.jsx` |
| QA helpers | `src/utils/qaHelper.js` |

Finding:

- System QA is intentionally technical and should remain separated from daily event work.

## Interactive Components Captured

| State | Component / source | Evidence |
| --- | --- | --- |
| Event creation modal | `src/components/events/EventFormModal.jsx` | `interactive-states/01-event-creation-modal-desktop.png` |
| Event editing modal | `src/components/events/EventFormModal.jsx` | `interactive-states/02-event-editing-modal-desktop.png` |
| Registration form modal | `src/components/registrations/RegistrationFormModal.jsx` | `interactive-states/03-registration-form-modal-desktop.png` |
| Registration record edit/detail | `src/components/registrations/RegistrationFormModal.jsx`, `src/pages/RegistrationsPage.jsx` | `interactive-states/04-registration-record-edit-detail-desktop.png` |
| Registration expanded disclosures | `src/pages/RegistrationsPage.jsx`, `.phase23v-panel` | `interactive-states/05-registration-filters-disclosures-expanded-desktop.png` |
| Payments expanded disclosures | `src/pages/PaymentsPage.jsx`, `.phase23v-panel` | `interactive-states/06-payments-filters-records-expanded-desktop.png` |
| Ticket QR list | `src/pages/TicketsPage.jsx`, `src/utils/qrTicketUtils.js` | `interactive-states/07-ticket-qr-display-desktop.png` |
| Check-In expanded disclosures | `src/pages/CheckInPage.jsx`, `.phase23v-panel` | `interactive-states/08-check-in-disclosures-expanded-desktop.png` |
| Operations commitments/disclosures | `src/pages/OperationsPage.jsx`, `src/components/operations/PartnerCommitmentsPanel.jsx` | `interactive-states/09-operations-partner-commitments-expanded-desktop.png` |
| Reports disclosures | `src/pages/EventReviewPage.jsx`, `src/utils/eventReview.js` | `interactive-states/10-reports-disclosures-expanded-desktop.png` |
| Import field mapping/preview | `src/pages/ImportsPage.jsx`, import preview components | `interactive-states/11-import-field-mapping-preview-desktop.png` |
| Organizer Access settings tab | `src/pages/SettingsPage.jsx`, `src/utils/accessRoles.js` | `interactive-states/12-settings-organizer-access-tab-desktop.png` |
| Welcome celebration | `src/components/onboarding/WelcomeCelebration.jsx` | `interactive-states/13-welcome-celebration-modal-desktop.png` |
| Existing walkthrough | `src/components/onboarding/AppWalkthrough.jsx` | `interactive-states/14-existing-walkthrough-dialog-desktop.png` |
| Mobile More drawer | `src/layout/AppShell.jsx` | `interactive-states/16-mobile-more-drawer-open-390x844.png` |

Interactive finding:

- The welcome/walkthrough replay surface renders, but closing/skipping it during production browser review emitted app-originated Firestore permission errors. This is a real follow-up item for the onboarding write path or close/skip behavior, not a rendered layout blocker.
