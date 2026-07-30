# Repository Architecture Current State - 2026-07

Audit Pass 1 is static repository inspection only. No application code, production data, merge, or deploy action was performed.

## Release State
- Audit branch: `codex/full-repository-product-audit-2026-07`
- Base commit: `f65aeba9bcf5f44372f7a49816386cef547ebb46`
- Main/origin main verified before inventory: `f65aeba9bcf5f44372f7a49816386cef547ebb46`

## Folder Map
- `src/`: React application source. Contains auth, events active-event context, layout, pages, services, tutorial runtime, utilities, and Firebase initialization.
- `public/`: static PWA/robots/assets surfaces.
- `tests/`: Node test-runner unit/static/rules tests. Current inventory: 67 total test/E2E files with 518 declared `test(...)` calls by static scan.
- `e2e/`: Playwright emulator tests for navigation, responsive behavior, tutorial, accessibility, and workflows.
- `scripts/`: product QA, admin verification, production fixture, import/reconciliation, and diagnostics scripts.
- `integrations/`: packaged Google Forms Apps Script and documentation artifacts; not automatically live from Hosting deploy.
- `functions/`: signed receiver package for external form intake.
- `docs/`: current and historical product, QA, integration, and phase documentation.
- `output/`: audit/evidence artifacts. This pass adds private repository audit evidence only.
- `.github/`: repository automation and security workflow configuration.

## Application Architecture
- Entry point: `src/main.jsx` mounts React with Firebase/auth providers and app error boundary.
- Router ownership: `src/App.jsx` owns all route declarations and lazy-loads page modules.
- Shell ownership: `src/layout/AppShell.jsx` owns authenticated organizer navigation, working-event context strip, mobile More menu, footer, and TutorialProvider wrapping.
- Authentication ownership: `src/auth/AuthProvider.jsx`, `ProtectedRoute.jsx`, and auth helpers resolve approved owner/admin/staff access.
- Working Event ownership: `src/events/ActiveEventProvider.jsx` and `useActiveEvent` hold selected event context; route pages consume it instead of hardcoded CPB.
- Data services: `src/services/*` isolate Firestore writes for registrations, tickets, check-in, operations, audit logs, access requests, imports, and reconciliation reads.
- Utility boundaries: `src/utils/*` hold event planning, finance, import mapping, QR parsing, navigation, communications, readiness, reporting, and validation logic.
- Tutorial architecture: `src/tutorial/*` provides a deterministic state-machine-driven guided orientation with registered targets and onboarding preference persistence.
- Import architecture: `src/pages/ImportsPage.jsx`, import components, `src/utils/importUtils.js`, and import services provide preview-first CSV/XLSX/paste workflows.
- Forms inbox architecture: `src/pages/ImportsPage.jsx`, `src/services/formResponseService.js`, `functions/`, and `integrations/google-forms/` split packaged intake from organizer review.
- Deployment architecture: Firebase Hosting static SPA from `dist`; Firestore rules/index deployment is separate and must remain explicit.

## Routes
- `/login` -> `LoginPage`
- `/security` -> `Navigate`
- `/scanner` -> `AssignedEventGate`
- `/dashboard` -> `DashboardPage`
- `/events` -> `EventsPage`
- `/registrations` -> `RegistrationsPage`
- `/payments` -> `AssignedEventGate`
- `/payments/reconciliation` -> `PaymentReconciliationPage`
- `/imports` -> `ImportsPage`
- `/tickets` -> `TicketsPage`
- `/check-in` -> `AssignedEventGate`
- `/operations` -> `AssignedEventGate`
- `/event-review` -> `EventReviewPage`
- `/qa` -> `QaPage`
- `/communications` -> `CommunicationsPage`
- `/settings` -> `SettingsPage`
- `*` -> `NotFoundPage`

## Oversized Or High-Responsibility Areas
- `src/pages/EventsPage.jsx`: route, event setup, planning workspace, readiness and event selection responsibilities intersect.
- `src/pages/RegistrationsPage.jsx`: registration CRUD, finance edit states, filters, responsive table/cards, and audit write orchestration converge.
- `src/pages/ImportsPage.jsx`: multiple import source types and Forms inbox review share one route.
- `src/auth/AuthProvider.jsx`: auth state, role resolution, persistence, redirect/popup handling and staff fallback are tightly coupled.
- `firestore.rules`: broad validated data model in a single file; rule expression cost has historical sensitivity.

## Duplicated Responsibilities / Architecture Risks
- Finance concepts are intentionally separated across Payments, Operations, Reports, and Reconciliation, but duplicated labels/calculations remain a risk area.
- Event setup, planning tasks, readiness, and partner records are partly event-embedded instead of normalized; this is acceptable for current prototype but limits reuse.
- Google Forms has source, functions, integration package, and docs; deployment status must remain explicitly documented to avoid assuming it is live.
- Admin scripts include read-only verifiers and write-capable production tools; operator safeguards depend on exact command selection.

## Well-Structured Areas
- Route paths are centralized in `src/App.jsx` and product route inventory passes.
- Scanner route is isolated outside AppShell and wrapped in assigned-event gate.
- QR utilities have dedicated tests preserving `GSV:TICKET:{ticketCode}` privacy.
- Product QA scripts aggregate route, copy, build, audit, and changed-source React Doctor checks.
