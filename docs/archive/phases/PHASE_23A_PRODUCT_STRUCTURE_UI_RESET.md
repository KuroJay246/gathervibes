# Phase 23A Product Structure and Organizer UI Reset

## Product Problem

The organizer app had accumulated phase labels, roadmap copy, repeated readiness panels, duplicated shortcuts, and implementation-status explanations. Individual workflows were usable, but the product structure read like a release history instead of one event-operations workspace.

Phase 23A resets the interface around one principle: fewer, clearer, stronger sections.

## Navigation

Previous organizer navigation:

- Dashboard
- Events
- Registrations
- Import Center
- Tickets
- Check-In
- Operations
- Event Review
- QA Center
- Communications
- Settings

New organizer-facing navigation:

- Overview
- Events
- Guests & Registrations
- Tickets
- Check-In
- Operations
- Message Builder
- Reports
- Settings
- System QA

Preserved route paths:

- `/dashboard`
- `/events`
- `/registrations`
- `/imports`
- `/tickets`
- `/check-in`
- `/operations`
- `/communications`
- `/event-review`
- `/settings`
- `/qa`
- `/scanner`

## Dashboard Consolidation

`/dashboard` now presents as Overview. It focuses on:

- Working Event context
- key event numbers
- one prioritized Needs Attention list
- common Quick Actions
- one compact event progress section
- secondary upcoming events

Dashboard card decisions:

- Retained: Working Event identity, registration count, guest count, registration money, capacity, readiness signals, upcoming events.
- Merged: scattered readiness warnings into Needs Attention.
- Converted to compact metrics: registration records, guests, money collected, capacity used.
- Converted to list: event issues and next actions.
- Relocated: QA and system-health material to System QA.
- Removed from organizer view: phase names, roadmap language, duplicate Event Review links, long technical notices, repeated Working Event explanations, integration status copy.

## Page Positioning

Guests & Registrations:

- Keeps registration CRUD, filters, import access, payment fields, ticket status, registration count, and guest count.
- Clarifies that registration records and guests are distinct.

Tickets:

- Remains the ticket-assignment and QR preparation route.
- QR payload remains `GSV:TICKET:{ticketCode}`.

Check-In:

- Remains the event-day attendance route.
- Keeps registration-level check-in behavior and guest totals derived from `personsAttending`.

Operations:

- Remains event-level money and obligations.
- Keeps registration payments separate from Operations Ledger records.
- Preserves current ledger controls and calculations.

Message Builder:

- Replaces Communications as the organizer-facing label.
- Presents copy-only message creation honestly.
- Removes Communications Pro, copy-only command-center, phase, and AI integration-coming-later language.
- Keeps prompt-building copy clear: no automatic sending, no OAuth, no delivery tracking, no real AI API.

Reports:

- Repositions `/event-review` as read-only reporting.
- Uses Event Report & Review as the page heading.
- Preserves selected-event scoping, registration-versus-guest distinction, registration attendance limitation, and Registration Payments versus Operations separation.

Settings:

- Contains practical settings and summaries only.
- Keeps profile, workspace, event defaults, currency, ticket prefix, pricing defaults, access summary, scanner/ticket boundaries, import defaults, finance/operations boundaries, message-builder status, and security notes.
- Removes phase chronology, implementation history, roadmap archive, developer-facing status lists, and duplicated QA material.

System QA:

- Replaces QA Center as the organizer-facing label.
- Keeps production fixture identity, CODEX_TEST protection, deployment/status diagnostics, scanner safety state, access-workflow disabled state, and technical guardrails.
- Remains visually separated from daily organizer tools.

## Mobile Navigation

Mobile primary navigation now prioritizes active event work:

- Overview
- Guests
- Tickets
- Check-In
- More

More contains the remaining organizer and admin routes. Scanner navigation remains isolated from organizer navigation.

## Accessibility and Visual Consistency

Phase 23A improves:

- page title consistency
- section spacing and hierarchy
- compact metric rows
- warning and empty-state language
- mobile bottom padding
- touch-friendly primary navigation
- visible event scope context
- clearer link and button labels

This is not a full accessibility certification.

## Files Changed

- `src/layout/AppShell.jsx`
- `src/pages/DashboardPage.jsx`
- `src/pages/RegistrationsPage.jsx`
- `src/pages/OperationsPage.jsx`
- `src/pages/CommunicationsPage.jsx`
- `src/pages/EventReviewPage.jsx`
- `src/pages/SettingsPage.jsx`
- `src/pages/QaPage.jsx`
- `src/utils/runtimeHealth.js`
- `src/utils/qaHelper.js`
- tests covering the updated product contract

## Tests Added

- `tests/phase23a-product-structure-ui-reset.test.js`

The new tests verify navigation labels, preserved routes, Dashboard cleanup, Message Builder truthfulness, Settings cleanup, Reports positioning, QR payload, dependencies, rules/index guardrails, scanner boundaries, and disabled access workflows.

## Deliberately Deferred

Phase 23A does not add:

- payments route
- Team & Access management
- sponsor/vendor/baker/school modules
- task or supply management
- real email sending
- WhatsApp sending
- real AI API
- Google Sheets OAuth
- public portal
- payment gateway
- export system
- new Firestore collections
- new dependencies

Recommended next phase: Registration Payments and Operations Financial Boundaries.

## Guardrails Preserved

- Firestore rules unchanged.
- Firestore indexes unchanged.
- Dependencies unchanged.
- QR payload unchanged.
- `approvedEmails` unchanged.
- Scanner remains assigned-event-only.
- Normal scanner Undo Check-In remains unavailable.
- Normal scanner Check Out remains unavailable.
- Lead-scanner path remains inactive.
- Access-request workflow remains disabled.
- Audit logs remain append-only.
- CPB production data remains untouched.
