# Page By Page Layout And Code Map

Date: 2026-07-29
Branch: `codex/full-current-state-application-map`
Base commit inspected: `f61cb96d466975ca902e417025a1deff0445393c`

## Shared Layout

Primary files:

- `src/App.jsx`
- `src/layout/AppShell.jsx`
- `src/styles.css`
- `src/auth/ProtectedRoute.jsx`
- `src/components/AssignedEventGate.jsx`
- `src/events/ActiveEventProvider.jsx`

The authenticated organizer shell has a fixed desktop sidebar, sticky top header, compact Working Event strip, large content well with `max-w-[1480px]`, and mobile bottom navigation. The shell uses warm Gather & Savor colors, rounded panels, cards, small uppercase section labels, and consistent page title/subtitle text.

The Working Event strip appears before page content and states that the page is scoped to the selected event. Event switching links to `/events`; it does not change event status.

## `/login`

Source: `src/pages/LoginPage.jsx`

Purpose: Auth entry and approval feedback.

Visible structure:

- Brand and public-facing login hero.
- Google sign-in button.
- Email/password sign-in controls.
- Access verification state for unapproved accounts.
- Password visibility toggle.

Current notes:

- The login page uses protected return-path logic so stale scanner and external paths are sanitized before redirect.
- It is the only public product entry besides not-found fallback.

## `/dashboard` as Overview

Source: `src/pages/DashboardPage.jsx`

Purpose: Current Working Event overview.

Visible structure:

- Working Event summary.
- Selected-event or no-event action state.
- Key metric grid for registration and event numbers.
- Needs Attention style summary.
- Event Summary and Financial Snapshot sections.
- Quick links to adjacent workflows.
- Upcoming or related event cards.

Current notes:

- Registration count and guest count are separate.
- CPB-specific locked-history copy appears when the CPB event is selected.
- The page is substantially product-language based, but it still carries some event-review and CPB safety context that can crowd the first screen.

## `/events`

Source: `src/pages/EventsPage.jsx`
Supporting components:

- `src/components/events/EventFormModal.jsx`
- `src/components/events/DeleteEventDialog.jsx`
- `src/components/events/EventPlanningWorkspace.jsx`

Purpose: Create, edit, delete, select, and plan events.

Visible structure:

- Event totals.
- Event list/cards with select, edit, and delete controls.
- Create event entry point.
- Event planning workspace for selected event details.
- Event form modal with event metadata, pricing, readiness, operations planning, tasks, and partner records.

Current notes:

- The route is the real Working Event selection point.
- Event creation/editing is admin-level behavior and should stay clearly separate from event-day actions.

## `/registrations` as Guests & Registrations

Source: `src/pages/RegistrationsPage.jsx`
Supporting components:

- `src/components/registrations/RegistrationFormModal.jsx`
- `src/components/registrations/RegistrationFilters.jsx`
- `src/components/registrations/RegistrationCard.jsx`
- `src/components/registrations/ExportModal.jsx`
- `src/components/registrations/DeleteRegistrationDialog.jsx`

Purpose: Manage registration records and guest counts.

Visible structure:

- Page heading and event-scoped summary.
- Registration count and persons-attending guest totals.
- Add/edit/delete registration controls.
- Filters for identity, contact, group, ticket, price tier, payment status, and payment method.
- Bulk payment controls.
- Desktop table and mobile card list.
- CPB booking crosswalk detail panel.

Current notes:

- The app correctly distinguishes a registration record from guests/persons attending.
- Finance fields remain registration-level fields, not Operations ledger entries.
- The CPB crosswalk panel is useful audit history but is not generic event-management UI.

## `/payments`

Source: `src/pages/PaymentsPage.jsx`

Purpose: Registration payment review and follow-up.

Visible structure:

- Registration payment summary.
- Payment metrics.
- Documentary support panel for CPB ticket income.
- Resolved records outside urgent attention.
- Registration payment rows/cards with filters.

Current notes:

- Payments is separate from Operations.
- It reviews registration-level amounts due, amount paid, balances, status, method, and follow-up state.
- The CPB documentary panel should remain guarded, but it is event-specific rather than reusable prototype language.

## `/payments/reconciliation`

Source: `src/pages/PaymentReconciliationPage.jsx`
Supporting utilities:

- `src/utils/paymentReconciliation.js`
- `src/services/reconciliationReadService.js`

Purpose: Read-only CPB payment reconciliation preview.

Visible structure:

- Payment Reconciliation Preview heading.
- Matching and discrepancy analysis.
- Evidence classifications and guarded actions.

Current notes:

- This is an internal audit route, not a normal organizer route.
- It should remain read-only unless a future exact production-write package is separately authorized.

## `/imports`

Source: `src/pages/ImportsPage.jsx`
Supporting components:

- `src/components/imports/FieldMappingForm.jsx`
- `src/components/imports/ImportPreviewTable.jsx`
- `src/components/imports/ImportSummary.jsx`
- `src/components/imports/ImportTemplatesPanel.jsx`

Purpose: Import registrations through preview-first review.

Visible structure:

- Import Center heading.
- XLSX upload.
- CSV/text upload.
- Pasted table rows.
- Field mapping.
- Preview table.
- Import summary.
- Template and guidance panels.

Current notes:

- `read-excel-file` is the active spreadsheet parser.
- `xlsx` is intentionally absent.
- Google Forms style headers are supported through import mapping tests, but no live Google Forms API integration exists.

## `/tickets`

Source: `src/pages/TicketsPage.jsx`
Supporting components/utilities:

- `src/components/tickets/TicketQrCode.jsx`
- `src/utils/qrTicketUtils.js`
- `src/services/ticketService.js`

Purpose: Assign ticket codes and prepare QR-ready access.

Visible structure:

- Tickets heading.
- Ticket readiness and assignment metrics.
- Ticket list/cards.
- Assign, unassign, and regenerate controls where role allows.
- QR display using local generated payload.

Current notes:

- QR payload must remain exactly `GSV:TICKET:{ticketCode}`.
- Ticket assignment mutates registration documents and creates append-only audit records.

## `/check-in`

Source: `src/pages/CheckInPage.jsx`
Supporting components/utilities:

- `src/components/checkin/QrScannerPanel.jsx`
- `src/utils/checkInUtils.js`
- `src/services/ticketService.js`

Purpose: Organizer event-day attendance workflow.

Visible structure:

- Door Check-In / QR Scan heading.
- Event-day summary metrics.
- QR scanner/manual ticket code flow.
- Search/list helper region.
- Selected guest card.
- Check-in action controls.
- Historical attendance evidence detail panel.

Current notes:

- Guest totals derive from `personsAttending`.
- Normal scanner check-in is separate at `/scanner`.
- Normal scanner Undo Check-In and Check Out are not productized.

## `/scanner`

Source: `src/pages/ScannerPage.jsx`

Purpose: Assigned-event scanner route for staff.

Visible structure:

- Focused scanner shell without organizer AppShell.
- Event identity.
- QR/manual ticket lookup.
- Guest result and check-in confirmation.

Current notes:

- Scanner access depends on active staff profile and assigned event.
- Scanner cannot access organizer navigation, Settings, QA, Operations, Payments, or Reports.

## `/operations`

Source: `src/pages/OperationsPage.jsx`
Supporting components/utilities:

- `src/components/operations/PartnerCommitmentsPanel.jsx`
- `src/services/operationsLedgerService.js`
- `src/utils/operationsReport.js`

Purpose: Event-level money and obligations.

Visible structure:

- Operations and Commitments heading.
- Operations cash-position style summary.
- Ledger entry form.
- Ledger filters and rows.
- Closeout records applied details.
- Partner commitments panel.

Current notes:

- Operations handles sponsor income, vendor or supplier payments, expenses, refunds, reimbursements, adjustments, and event-level entries.
- Operations totals are not automatically combined with registration payment totals.
- Some CPB closeout details remain visible in organizer workflow.

## `/communications` as Message Builder

Source: `src/pages/CommunicationsPage.jsx`
Supporting utilities:

- `src/utils/communicationsUtils.js`

Purpose: Create, personalize, and copy event messages.

Visible structure:

- Create Message heading.
- Copy-only description.
- Audience filters.
- Tone selector.
- Starter template or prompt starter selector.
- Editable draft textarea.
- Copy controls and review packet.

Current notes:

- The page clearly says messages are not sent automatically.
- It does not send email or WhatsApp.
- It does not call a live AI API.
- The prompt builder should not be described as real AI.

## `/event-review` as Reports

Source: `src/pages/EventReviewPage.jsx`
Supporting utilities:

- `src/utils/eventReview.js`
- `src/utils/eventReadiness.js`
- `src/utils/registrationMetrics.js`
- `src/utils/operationsReport.js`

Purpose: Read-only event report and review.

Visible structure:

- Event Report & Review style heading.
- Needs Follow-Up.
- Registration Payments.
- Operations Summary.
- Event Summary.
- Current-event vs post-event wording.

Current notes:

- The page is read-only.
- Registration payments and Operations remain separate.
- Attendance limitations are documented because attendance is registration-level where applicable.

## `/settings`

Source: `src/pages/SettingsPage.jsx`

Purpose: Practical workspace settings and access summary.

Visible structure:

- Settings category tabs.
- Event defaults.
- Currency/default pricing/ticket-prefix style settings where supported.
- Access summary.
- Onboarding replay.
- Safety and system notes.

Current notes:

- Settings has been cleaned compared with historical phase archive pages, but it still needs ongoing review to avoid becoming a roadmap/status archive again.
- It does not edit `approvedEmails` directly.

## `/qa` as System QA

Source: `src/pages/QaPage.jsx`
Supporting utilities:

- `src/utils/qaHelper.js`
- `src/utils/runtimeHealth.js`
- `src/components/SystemHealthPanel.jsx`

Purpose: Diagnostics, safe QA guidance, and system guardrails.

Visible structure:

- System status and event checks.
- Firebase and data-read diagnostics.
- CODEX_TEST safety guidance.
- CPB protection warnings.
- Scanner safety state.
- Access workflow state.

Current notes:

- System QA is intentionally less prominent than daily organizer tools.
- It is the correct home for technical guardrail status.

## Onboarding

Source:

- `src/components/onboarding/WelcomeCelebration.jsx`
- `src/components/onboarding/AppWalkthrough.jsx`
- `src/components/onboarding/onboardingSteps.js`
- `src/components/onboarding/useOnboarding.js`

Current state on this branch:

- Onboarding is a welcome modal plus route-based walkthrough.
- It is targeted to specific UIDs in source.
- It stores onboarding preference data at `staffProfiles/{uid}/preferences/onboarding`.
- The rules allow `lastStep` values from 1 to 13.
- The visible success modal in `AppShell` hardcodes `Welcome aboard, Anica.`

Known limitation:

- This is not yet the fully interactive spotlight/tutorial experience requested in the separate tutorial branch.
