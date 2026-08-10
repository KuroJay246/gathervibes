# Gather & Savor Master System Reference

Last updated: 2026-08-04.

This is the primary engineering, debugging, QA, and release reference for the Gather & Savor Event Hub. It describes the current product, source layout, route map, access model, Firestore shape, safety boundaries, and first files to inspect when a feature breaks. Historical phase reports under `docs/archive/` are evidence only and are not current operating instructions.

## 1. Product Definition

Gather & Savor Event Hub is a private internal event-operations web application for approved organizers and event-scoped helpers. It supports event setup, guest and registration work, ticketing, check-in, event-level operations, reporting, imports, documents, contacts, run of show, resources, and copy-only messaging.

It is not a public guest portal, public vendor portal, payment gateway, CRM, public marketing site, native app, or automatic communications sender.

Current production:

- Firebase project: `gathervibeshub`.
- Production URL: `https://gathervibeshub.web.app`.
- Canonical local URL: `http://localhost:4173`.
- Synthetic QA/training event: `CODEX_DEMO - Full System Walkthrough`.
- Synthetic QA/training event ID: `codex_demo_full_system_walkthrough`.
- Retired historical QA fixture: `CODEX_TEST Live Verification Event` / `xPfa0b3KZyLSDnAD2uGI`.
- CPB event ID: `zhaPxi31cpqLAW0cuS20`.

CPB is a normal completed real event. Completed status does not make a real event read-only. CPB must not receive synthetic QA writes. Real events are protected by the standard safeguards used for every real event: authentication, approved-organizer authorization, event scoping, validated writes, destructive-action confirmation, append-only audit logs, duplicate detection, payment validation, ticket validation, and attendance validation.

## 2. Runtime And Stack

- Frontend: React 19, Vite, React Router, Firebase Web SDK, Tailwind CSS-style utility classes in `src/styles.css`.
- Hosting: Firebase Hosting Classic, public directory `dist`, SPA rewrite to `/index.html`.
- Firebase client setup: `src/lib/firebase.js`.
- Monitoring/error capture: `src/lib/monitoring.js` and `src/components/AppErrorBoundary.jsx`.
- Auth: Firebase Authentication through `src/auth/AuthProvider.jsx`, `src/auth/AuthContext.js`, `src/auth/useAuth.js`, `src/auth/ProtectedRoute.jsx`, and `src/auth/authFlow.js`.
- Firestore: Cloud Firestore with default-deny `firestore.rules`.
- Workbook intake: `read-excel-file` through `src/utils/xlsxImport.js` and `src/utils/reconciliationWorkbook.js`.
- QR generation/scanning: `qrcode`, `html5-qrcode`, `src/components/tickets/TicketQrCode.jsx`, `src/components/checkin/QrScannerPanel.jsx`, and `src/utils/qrTicketUtils.js`.
- Advisory React health: `react-doctor@0.8.3` through `npm run doctor:json`.

Dependency guardrails:

- `xlsx` must remain absent.
- `read-excel-file` must remain present.
- Do not add runtime dependencies during maintenance unless the feature scope explicitly requires it.

## 3. Application Startup

Startup path:

1. `src/main.jsx` mounts the React application and wraps it with the top-level providers.
2. `src/lib/firebase.js` initializes Firebase app, auth, and Firestore clients.
3. `src/auth/AuthProvider.jsx` restores Firebase Auth state and resolves approved access.
4. `src/events/ActiveEventProvider.jsx` restores or resolves the Working Event.
5. `src/App.jsx` declares routes and gates.
6. `src/layout/AppShell.jsx` renders organizer navigation, page chrome, and Working Event context.

If the app stalls on load, inspect `src/auth/AuthProvider.jsx`, `src/auth/authFlow.js`, Firebase config in `src/lib/firebase.js`, and browser console errors before changing routes or Firestore rules.

## 4. React Entrypoint And Providers

Primary files:

- `src/main.jsx`: React entrypoint.
- `src/App.jsx`: route tree and route gates.
- `src/layout/AppShell.jsx`: organizer shell.
- `src/events/ActiveEventProvider.jsx`: Working Event provider.
- `src/events/useActiveEvent.js`: Working Event consumer hook.
- `src/tutorial/TutorialProvider.jsx`: tutorial orchestration.
- `src/components/AppErrorBoundary.jsx`: fallback boundary.

Provider failures usually surface as a blank app, route fallback, missing Working Event state, or tutorial overlay errors. First inspect provider ordering in `src/main.jsx` and whether the failing page assumes `activeEvent` exists before the gate has loaded.

## 5. Router

Routes are declared in `src/App.jsx`. Preserve route paths unless a route is genuinely broken.

Organizer routes:

- `/dashboard`: Overview, file `src/pages/DashboardPage.jsx`.
- `/events`: Events and setup, file `src/pages/EventsPage.jsx`.
- `/tasks`: Tasks, file `src/pages/TasksPage.jsx`.
- `/registrations`: Guests & Registrations, file `src/pages/RegistrationsPage.jsx`.
- `/payments`: Registration Payments, file `src/pages/PaymentsPage.jsx`.
- `/payments/reconciliation`: Payment Reconciliation, file `src/pages/PaymentReconciliationPage.jsx`.
- `/imports`: Import Center, file `src/pages/ImportsPage.jsx`.
- `/tickets`: Tickets, file `src/pages/TicketsPage.jsx`.
- `/check-in`: Check-In, file `src/pages/CheckInPage.jsx`.
- `/operations`: Operations, file `src/pages/OperationsPage.jsx`.
- `/run-of-show`: Run of Show, file `src/pages/RunOfShowPage.jsx`.
- `/resources`: Resources, file `src/pages/ResourcesPage.jsx`.
- `/documents`: Documents, file `src/pages/DocumentsPage.jsx`.
- `/contacts`: Contacts and Organizations, file `src/pages/ContactsPage.jsx`.
- `/event-review`: Reports, file `src/pages/EventReviewPage.jsx`.
- `/communications`: Message Builder, file `src/pages/CommunicationsPage.jsx`.
- `/settings`: Settings, file `src/pages/SettingsPage.jsx`.
- `/qa`: System QA, file `src/pages/QaPage.jsx`.

Special routes:

- `/login`: `src/pages/LoginPage.jsx`.
- `/scanner`: `src/pages/ScannerPage.jsx`, behind scanner-specific assignment gates.
- `/security`: redirects to `/settings`.
- Unknown routes use `src/pages/NotFoundPage.jsx`.

Route access data is centralized in `src/utils/accessRoles.js`. Navigation labels and grouping are in `src/utils/navigation.js` and shell rendering in `src/layout/AppShell.jsx`.

## 6. Navigation Architecture

Organizer navigation follows real work, not historical phases:

- Overview
- Events
- Tasks
- Guests & Registrations
- Payments
- Payment Reconciliation
- Import Center
- Tickets
- Check-In
- Operations
- Run of Show
- Resources
- Documents
- Contacts
- Reports
- Message Builder
- Settings
- System QA

Scanner navigation is isolated from organizer navigation. Do not expose organizer routes in scanner mode unless access-role policy explicitly changes.

Mobile navigation should keep event-day work reachable: Overview, Guests, Tickets, Check-In, and More. System QA is not a primary event-day action.

## 7. App Shell And Layout

Primary file: `src/layout/AppShell.jsx`.

The shell owns:

- desktop navigation;
- mobile navigation;
- page content frame;
- Working Event context strip;
- account/access display;
- tutorial entry affordances where implemented;
- bottom spacing so mobile navigation does not cover content.

If a page looks inconsistent, inspect the page heading/subtitle first, then shell spacing and shared UI components under `src/components/ui/`. Do not solve layout drift by duplicating shell-level explanations inside each page.

## 8. Authentication

Primary files:

- `src/auth/AuthProvider.jsx`
- `src/auth/AuthContext.js`
- `src/auth/useAuth.js`
- `src/auth/ProtectedRoute.jsx`
- `src/auth/authFlow.js`
- `src/components/SystemHealthPanel.jsx`

Auth state is Firebase Auth based. Organizer approval is checked against `settings/accessControl` unless the user is the Protected Owner. Auth failures should be classified as:

- Firebase session restore problem;
- Google sign-in problem;
- approved-organizer authorization problem;
- Protected Owner diagnostic problem;
- staff/scanner assignment problem;
- Firestore rule denial after auth succeeded.

Do not fix permission-denied save errors by loosening broad rules. Verify the user UID, access document, target event, write shape, and audit-log batch first.

## 9. Protected Owner

Primary files:

- `src/config/protectedOwner.js`
- `src/auth/AuthProvider.jsx`
- `firestore.rules`
- `docs/PROTECTED_OWNER_APPLICATION_ACCESS_STANDARD.md`
- `docs/PROTECTED_OWNER_SUPER_ADMIN_AND_MAINTENANCE_STANDARD.md`
- `docs/PROTECTED_OWNER_AUTHORIZATION_MATRIX_2026-08.md`
- `tests/protected-owner-authorization-matrix.test.js`

Protected Owner identity:

- UID: `WcDU2jmbopdAgDlMMWvD3TkqqbC3`.
- Email: `jaylanspencer99@gmail.com`.

The Protected Owner must retain app and Firestore access even if mutable role documents are edited. This is UID-based and must not depend on `approvedEmails`, staff assignments, or scanner assignments. System QA must expose diagnostics that let the owner confirm the signed-in UID and access state.

Firestore write validation still applies to the Protected Owner. Owner writes must satisfy the current schema, event scope, status enums, immutable identity fields, and audit-log contract. Updates may preserve a historical `createdBy` value from another legitimate organizer; creates must set `createdBy`/`updatedBy` to the current authenticated user, while updates validate only the current `updatedBy` and keep immutable creator fields unchanged.

## 10. Other Role And Access Model

Primary files:

- `src/utils/accessRoles.js`
- `src/components/AssignedEventGate.jsx`
- `src/auth/AuthProvider.jsx`
- `firestore.rules`

Role types include organizer/admin access and event-scoped helper access. Scanner and helper users use `staffProfiles/{uid}` and `events/{eventId}/staffAssignments/{uid}`. Normal scanner users are assigned-event-only and must not receive:

- admin shell access;
- Event Review/Reports access;
- Undo Check-In;
- Check Out;
- lead-scanner functionality unless a future approved scope implements it.

When adding a route, update routes, navigation, access roles, docs, tests, and product QA together.

## 11. Central Capability Architecture

Capabilities are intentionally represented in multiple layers:

- UI labels and route availability: `src/utils/navigation.js`, `src/layout/AppShell.jsx`, `src/App.jsx`.
- Route access: `src/utils/accessRoles.js` and route gates.
- Business validation: service files under `src/services/` and validators under `src/utils/validators.js`.
- Firestore enforcement: `firestore.rules`.
- Audit evidence: `src/services/auditService.js` and service-specific batch writes.
- Product copy and guidance: `src/utils/pageGuidance.js` and docs.
- Tests: `tests/` and `e2e/`.

Do not treat a UI gate as the security model. Firestore rules and service validation must remain aligned.

## 12. Working Event Architecture

Primary files:

- `src/events/ActiveEventContext.js`
- `src/events/ActiveEventProvider.jsx`
- `src/events/useActiveEvent.js`
- `src/services/eventService.js`
- `src/utils/demoEvent.js`
- `src/utils/qaHelper.js`

Working Event scopes event-specific organizer workflows. Changing Working Event changes the workspace context; it must not change the event record status. Pages must avoid stale totals from a previous event after the selection is cleared or changed.

Selected-event workflows include registrations, payments, reconciliation, tickets, check-in, operations, tasks, documents, run of show, resources, reports, and QA checks. Cross-event pages such as event lists and contacts must make their scoping clear.

## 13. Firebase Initialization

Primary files:

- `src/lib/firebase.js`
- `.firebaserc`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`

Firebase Hosting serves `dist` and rewrites SPA paths. Firestore rules and indexes are configured but should only be deployed when intentionally changed and validated. Hosting-only deployments are appropriate for application source, docs, tests, or static asset changes that do not require rules/index/function updates.

## 14. Firestore Data Architecture

Canonical paths:

- `settings/accessControl`: approved organizer data and access settings.
- `events/{eventId}`: event records, configuration, status, classification, defaults, capacity, and event-specific metadata.
- `events/{eventId}/staffAssignments/{uid}`: event-scoped staff/scanner assignments.
- `events/{eventId}/tasks/{taskId}`: event planning and deadline tasks.
- `events/{eventId}/documents/{documentId}`: event document references.
- `events/{eventId}/runOfShow/{itemId}`: event-day sequence records.
- `events/{eventId}/resources/{resourceId}`: resources, equipment, and supply records.
- `events/{eventId}/contactLinks/{linkId}`: event-contact relationships.
- `registrations/{registrationId}`: registration, guest, payment, ticket, and check-in fields.
- `operationsLedger/{ledgerEntryId}`: event-level income, expenses, commitments, refunds, reimbursements, and adjustments.
- `contacts/{contactId}`: people directory.
- `organizations/{organizationId}`: organizations directory.
- `auditLogs/{logId}`: append-only audit evidence.
- `accessRequests/{requestId}`: non-live/disabled request workflow contract.
- `staffProfiles/{uid}`: staff/helper/scanner profile records.
- `staffProfiles/{uid}/preferences/onboarding`: tutorial preferences.

Legacy compatibility is required. Existing records may contain older field shapes. Services and rules should validate write intent without forcing destructive migrations of real data.

Known supported legacy organizer values are normalized by services before writes, including task priority/category aliases, run-of-show `Ready`/`Expected` and older category names, resource `supplier` source types and `Partial` status, and lower-case contact/relationship statuses. Rules remain strict for the stored post-write shape and continue to reject unsupported arbitrary fields or statuses.

## 15. Firestore Rules Architecture

Primary file: `firestore.rules`.

Rules enforce:

- default deny;
- Protected Owner UID access;
- approved organizer checks;
- event-scoped staff/scanner checks;
- event document validation;
- registration validation;
- ticket and check-in validation;
- operations ledger validation;
- run-of-show/resource/document/contact validation;
- append-only audit logs;
- disabled access-request workflow boundaries.

`firestore.rules` is active security code, not documentation. Any change requires rules-focused tests and usually emulator validation before deployment. Do not deploy rules as part of documentation or Hosting-only releases.

## 16. Audit-Log Architecture

Primary files:

- `src/services/auditService.js`
- `src/utils/auditUtils.js`
- service files that batch writes with `auditLogs`
- `tests/firestore-checkin-rules.test.js`
- `tests/run-of-show-resource-rules.test.js`
- `tests/task-workflow-rules.test.js`

Business writes should create append-only audit evidence. Updates that require audit evidence should be atomic with the target write when possible. Audit logs must not be edited or deleted. If a write fails with permission denied, inspect whether the service wrote the target document and audit document in the same accepted shape.

## 17. Error Architecture

Primary files:

- `src/components/AppErrorBoundary.jsx`
- `src/lib/monitoring.js`
- `src/utils/organizerErrors.js`
- `src/components/ui/ErrorState.jsx`
- `src/components/SystemHealthPanel.jsx`

Organizer-facing errors should be actionable and not leak credentials or private data. Permission errors should tell the organizer to verify account/event/access state, while System QA should expose the deeper diagnostics. Browser-extension console messages must be separated from app-originated errors during QA.

## 18. Legacy Compatibility Architecture

Primary files:

- `src/services/registrationService.js`
- `src/utils/registrationMetrics.js`
- `src/utils/paymentStatus.js`
- `src/utils/financeUtils.js`
- `src/utils/manifestApplyEngine.js`
- `src/services/cpbAuditBackfill.js`
- `src/utils/demoEvent.js`

Legacy real records can have missing fields, null values, historical names, or partial finance evidence. Missing/null values are not the same as explicit zero values. Do not overwrite raw stored values just to make display totals look cleaner. For financial work, compare raw stored values, workbook evidence, audit logs, and derived UI values separately.

## 19. Import Architecture

Primary files:

- `src/pages/ImportsPage.jsx`
- `src/components/imports/FieldMappingForm.jsx`
- `src/components/imports/ImportPreviewTable.jsx`
- `src/components/imports/ImportSummary.jsx`
- `src/components/imports/ImportTemplatesPanel.jsx`
- `src/services/importService.js`
- `src/utils/importUtils.js`
- `src/utils/importSources.js`
- `src/utils/xlsxImport.js`
- `src/utils/reconciliationWorkbook.js`
- `src/utils/formResponseInbox.js`

Import Center is preview-first. It supports CSV, pasted tables, and XLSX parsing through `read-excel-file`. Google Forms response inbox material exists, but it is not an automatically deployed Cloud Function or OAuth sending integration.

Import failures should be debugged in this order: parser, header mapping, normalized preview rows, duplicate detection, event scoping, validation, then write/audit batch.

## 20. Tutorial Architecture

Primary files:

- `src/tutorial/TutorialProvider.jsx`
- `src/tutorial/TutorialController.js`
- `src/tutorial/TutorialStateMachine.js`
- `src/tutorial/tutorialRegistry.js`
- `src/tutorial/tutorialRoutes.js`
- `src/tutorial/tutorialSteps.js`
- `src/tutorial/tutorialStorage.js`
- `src/tutorial/tutorialDiagnostics.js`
- `src/tutorial/TutorialOverlay.jsx`
- `src/tutorial/TutorialTooltip.jsx`
- `src/tutorial/TutorialTarget.jsx`
- `src/tutorial/useTutorial.js`
- `src/tutorial/useTutorialTarget.js`

Tutorial storage must not write event, registration, ticket, or audit data. Tutorial content must not mention CPB, retired CODEX_TEST instructions, or private real-event data. Use CODEX_DEMO for guided write checks.

## 21. System QA Architecture

Primary files:

- `src/pages/QaPage.jsx`
- `src/components/SystemHealthPanel.jsx`
- `src/utils/qaHelper.js`
- `src/utils/runtimeHealth.js`
- `scripts/product/routeCheck.mjs`
- `scripts/product/productQa.mjs`
- `scripts/product/documentationCheck.mjs`
- `tests/production-qa.test.js`
- `tests/protected-owner-authorization-matrix.test.js`

System QA is the technical safety area, not a normal event-day action. It may display Protected Owner status, CODEX_DEMO guidance, scanner safety state, access workflow status, runtime diagnostics, route checks, and production-data protection boundaries.

## 22. E2E Architecture

Primary files:

- `e2e/accessibility.spec.js`
- `e2e/navigation.spec.js`
- `e2e/responsive.spec.js`
- `e2e/tutorial.spec.js`
- `e2e/workflows.spec.js`
- `e2e/support.js`
- `scripts/e2e/globalSetup.mjs`
- `playwright.config.js`

E2E runs should use synthetic/emulator-safe data or CODEX_DEMO where explicitly approved. Do not use CPB for synthetic E2E writes. If an E2E failure is visual or timing-related, rerun the focused spec before calling it a product regression.

## 23. Firebase Emulator Architecture

Primary files:

- `firebase.json`
- `firestore.rules`
- `tests/*rules*.test.js`
- `tests/onboarding-rules.test.js`
- `tests/task-workflow-rules.test.js`
- `tests/run-of-show-resource-rules.test.js`

Rules tests use emulator assertions for allowed and denied writes. Expected rule-rejection diagnostics are not app failures when the test asserts rejection. If emulator ports are occupied, identify the exact process before stopping it.

## 24. Build And Deployment

Canonical validation commands:

```bash
npm ci
npm run lint
npm test
npm run build
npm run product:routes
npm run product:qa
npm run e2e:smoke
npm run e2e:full
npm audit --omit=dev
npm run doctor:json
npm ls xlsx
npm ls read-excel-file
git diff --check
git status --short
```

Deployment rules:

- Hosting-only command: `npx firebase-tools deploy --only hosting --project gathervibeshub`.
- Deploy Firestore rules only when `firestore.rules` intentionally changes and rules tests pass.
- Deploy Firestore indexes only when `firestore.indexes.json` intentionally changes.
- Do not deploy Functions, Storage, or Auth configuration from this repository unless a future scope explicitly adds that target.

## 25. Current Integrations

Active/implemented:

- Firebase Authentication.
- Cloud Firestore.
- Firebase Hosting.
- QR generation and browser scanning.
- XLSX parsing through `read-excel-file`.
- Local/e2e Firebase Admin usage for test seeding through dev tooling.
- Advisory React Doctor.

## 26. Disabled Or Disconnected Integrations

Not active as product capabilities:

- real email sending;
- WhatsApp sending;
- AI API message generation;
- Google Sheets OAuth;
- payment gateway;
- public guest portal;
- public vendor portal;
- native app;
- deployed Google Forms Cloud Function from this repository.

Message Builder must be described as copy-only. Prompt-building must not be described as live AI integration.

## 27. Production Safety Boundaries

- Use CODEX_DEMO for synthetic QA/training/write checks.
- Do not use CPB for synthetic QA writes.
- Do not bulk-migrate real production data without explicit approval.
- Do not expose passwords, tokens, cookies, private keys, verification codes, guest private data, or private financial evidence.
- Do not print Firebase service-account private keys.
- Do not delete audit logs.
- Do not change `approvedEmails` casually.
- Preserve QR payload `GSV:TICKET:{ticketCode}`.
- Keep registration payments separate from Operations Ledger accounting.

## 28. Known Technical Limitations

- Message Builder is copy-only.
- Payment Reconciliation is a preview/review workflow unless a specific approved apply flow is in scope.
- Registration payments and Operations are separate financial domains.
- Attendance is registration-level where the current data model only stores registration check-in state.
- Some historical docs and tests still mention retired CODEX_TEST for compatibility; active docs must frame it as retired.
- External Desktop/archive copies may include credentials or private evidence and require manual review before deletion.

## 29. Permanent Engineering Standards

- Verify actual source before editing; do not redesign from phase docs alone.
- Keep route paths stable unless broken.
- Keep product wording current and remove phase/roadmap language from organizer workflows.
- Keep docs, tests, route access, Firestore rules, services, and UI aligned.
- Prefer fewer, clearer, stronger organizer sections over more cards.
- Treat Firestore rules as security code.
- Treat service-account JSON as sensitive even if it is outside the repo.
- Never fabricate production totals or infer missing raw values as explicit zeros.
- Use exact record IDs and before/after snapshots for production writes.
- End release work with validation, Git status, branch/head/remote checks, and an honest blocker list.

## Feature Debugging Map

Each feature row lists the first source files to inspect. Use the related service, rule path, and test files before changing data or security policy.

### Overview

- Route: `/dashboard`.
- Page: `src/pages/DashboardPage.jsx`.
- Utilities: `src/utils/registrationMetrics.js`, `src/utils/eventReadiness.js`, `src/utils/operationsReport.js`, `src/utils/organizerDisplay.js`, `src/utils/pageGuidance.js`.
- Firestore: `events/{eventId}`, `registrations`, `operationsLedger`, event subcollections as needed.
- Tests: `tests/organizer-shell-overview-refresh.test.js`, `tests/phase23m-overview-payments-usability.test.js`, `tests/phase21-command-center.test.js`.
- Common symptoms: stale Working Event totals, registration/guest count confusion, duplicate finance summaries, overlong guidance.

### Events And Guided Setup

- Route: `/events`.
- Page/components: `src/pages/EventsPage.jsx`, `src/components/events/EventFormModal.jsx`, `src/components/events/DeleteEventDialog.jsx`, `src/components/events/EventPlanningWorkspace.jsx`.
- Service/utilities: `src/services/eventService.js`, `src/utils/eventDefaults.js`, `src/utils/eventPlanning.js`, `src/utils/demoEvent.js`.
- Firestore: `events/{eventId}`.
- Rules: event create/update/delete validation in `firestore.rules`.
- Tests: `tests/event-utils.test.js`, `tests/phase2-guided-event-setup-task-deadline.test.js`, `tests/phase26-event-categories-capabilities.test.js`.
- Common symptoms: completed real event incorrectly read-only, CODEX_DEMO visible in normal event lists, event defaults not applied.

### Tasks

- Route: `/tasks`.
- Page: `src/pages/TasksPage.jsx`.
- Service/utilities: `src/services/taskService.js`, `src/utils/taskWorkflow.js`.
- Firestore: `events/{eventId}/tasks/{taskId}`.
- Rules/tests: task rules in `firestore.rules`, `tests/task-workflow-rules.test.js`, `tests/phase23-task-workflow-registration-refinement.test.js`.
- Common symptoms: tasks not scoped to Working Event, invalid priority/status transitions, missing audit logs.

### Guests And Registrations

- Route: `/registrations`.
- Page/components: `src/pages/RegistrationsPage.jsx`, `src/components/registrations/RegistrationFormModal.jsx`, `src/components/registrations/RegistrationCard.jsx`, `src/components/registrations/RegistrationFilters.jsx`, `src/components/registrations/DeleteRegistrationDialog.jsx`, `src/components/registrations/ExportModal.jsx`.
- Service/utilities: `src/services/registrationService.js`, `src/utils/registrationMetrics.js`, `src/utils/paymentStatus.js`, `src/utils/financeUtils.js`, `src/utils/validators.js`.
- Firestore: `registrations/{registrationId}`, `auditLogs/{logId}`.
- Tests: `tests/registration-utils.test.js`, `tests/registration-metrics.test.js`, `tests/phase23d0-registration-payment-editing-audit.test.js`, `tests/firestore-checkin-rules.test.js`.
- Common symptoms: permission-denied save, amount defaults mistaken as workbook evidence, guest count mixed with registration count, audit batch mismatch.

### Registration Payments

- Route: `/payments`.
- Page: `src/pages/PaymentsPage.jsx`.
- Utilities: `src/utils/paymentStatus.js`, `src/utils/financeUtils.js`, `src/utils/financialEvidenceAudit.js`.
- Firestore: `registrations/{registrationId}` and append-only `auditLogs/{logId}`.
- Tests: `tests/phase23b-payments-operations-boundaries.test.js`, `tests/payments-operations-refinement-2026-08.test.js`, `tests/phase23q-finance-status-classification.test.js`.
- Common symptoms: registration payment totals blended with Operations, paid/comp/unknown status confusion, missing evidence classification.

### Payment Reconciliation

- Route: `/payments/reconciliation`.
- Page: `src/pages/PaymentReconciliationPage.jsx`.
- Service/utilities: `src/services/reconciliationReadService.js`, `src/utils/paymentReconciliation.js`, `src/utils/reconciliationWorkbook.js`, `src/utils/manifestApplyEngine.js`.
- Firestore: selected Working Event registrations and Operations reads.
- Tests: `tests/phase23c-payment-reconciliation.test.js`, `tests/phase23e-cpb-manifest-regeneration.test.js`, `tests/phase23f-cpb-approval-package.test.js`, `tests/phase23g-apply-rehearsal.test.js`.
- Common symptoms: hardcoded CPB scope, workbook parser fallback warnings, applying without organizer approval, totals double-counted.

### Tickets

- Route: `/tickets`.
- Page/components: `src/pages/TicketsPage.jsx`, `src/components/tickets/TicketQrCode.jsx`.
- Service/utilities: `src/services/ticketService.js`, `src/utils/ticketUtils.js`, `src/utils/qrTicketUtils.js`.
- Firestore: `registrations/{registrationId}`, `auditLogs/{logId}`.
- Tests: `tests/phase45-ticketing.test.js`, `tests/run-of-show-resources-foundation.test.js`, `tests/firestore-checkin-rules.test.js`.
- Permanent payload: `GSV:TICKET:{ticketCode}`.
- Common symptoms: QR payload changed, ticket assignment not audited, ticket status not aligned with registration.

### Check-In

- Route: `/check-in`.
- Page/components: `src/pages/CheckInPage.jsx`, `src/components/checkin/QrScannerPanel.jsx`.
- Service/utilities: `src/services/registrationService.js`, `src/utils/checkInUtils.js`, `src/utils/attendanceUtils.js`, `src/utils/eventDayUtils.js`.
- Firestore: `registrations/{registrationId}`, `auditLogs/{logId}`.
- Tests: `tests/phase14-camera-checkin.test.js`, `tests/phase16-live-load-ticket-checkin-qa.test.js`, `tests/firestore-checkin-rules.test.js`.
- Common symptoms: scanner permission denial, attendance total mismatch, normal scanner undo/check-out exposed.

### Scanner

- Route: `/scanner`.
- Page/components: `src/pages/ScannerPage.jsx`, `src/components/checkin/QrScannerPanel.jsx`.
- Access: `src/components/AssignedEventGate.jsx`, `src/utils/accessRoles.js`, `staffProfiles/{uid}`, `events/{eventId}/staffAssignments/{uid}`.
- Tests: `tests/phase17b-staff-access.test.js`, `tests/phase17c-b-scanner-page.test.js`, `tests/phase17c-rules-readiness.test.js`.
- Common symptoms: scanner sees organizer shell, scanner sees unassigned events, undo/check-out exposed, QR camera/manual entry mismatch.

### Operations And Commitments

- Route: `/operations`.
- Page/components: `src/pages/OperationsPage.jsx`, `src/components/operations/PartnerCommitmentsPanel.jsx`.
- Service/utilities: `src/services/operationsLedgerService.js`, `src/utils/operationsReport.js`, `src/utils/bulkOperation.js`.
- Firestore: `operationsLedger/{ledgerEntryId}`, selected `events/{eventId}`.
- Tests: `tests/phase19-operations-productivity.test.js`, `tests/phase23b-payments-operations-boundaries.test.js`, `tests/payments-operations-refinement-2026-08.test.js`.
- Common symptoms: registration payments included in Operations, pending/received values collapsed, ledger edits not audited.

### Contacts And Organizations

- Route: `/contacts`.
- Page/components: `src/pages/ContactsPage.jsx`, `src/components/RelationshipSelector.jsx`, `src/components/AdminSearch.jsx`.
- Service/utilities: `src/services/contactService.js`, `src/utils/contactDirectory.js`, `src/utils/adminSearch.js`.
- Firestore: `contacts/{contactId}`, `organizations/{organizationId}`, `events/{eventId}/contactLinks/{linkId}`, `auditLogs/{logId}`.
- Tests: `tests/document-contact-foundation.test.js`, `tests/document-contact-rules.test.js`, `tests/search-health.test.js`.
- Common symptoms: relationship not scoped to event, contact/organization validation failure, private fields exposed in search.

### Documents

- Route: `/documents`.
- Page: `src/pages/DocumentsPage.jsx`.
- Service/utilities: `src/services/documentService.js`, `src/utils/documentRegistry.js`.
- Firestore: `events/{eventId}/documents/{documentId}`, `auditLogs/{logId}`.
- Tests: `tests/document-contact-foundation.test.js`, `tests/document-contact-rules.test.js`.
- Common symptoms: document reference not linked to event, missing audit, unsupported file metadata.

### Run Of Show

- Route: `/run-of-show`.
- Page: `src/pages/RunOfShowPage.jsx`.
- Service/utilities: `src/services/runOfShowService.js`, `src/utils/runOfShow.js`, `src/utils/eventDayUtils.js`.
- Firestore: `events/{eventId}/runOfShow/{itemId}`, `auditLogs/{logId}`.
- Tests: `tests/run-of-show-resources-foundation.test.js`, `tests/run-of-show-resource-rules.test.js`.
- Common symptoms: time ordering broken, arrival items invalid, event manager cannot update allowed item.

### Resources

- Route: `/resources`.
- Page: `src/pages/ResourcesPage.jsx`.
- Service/utilities: `src/services/eventResourceService.js`, `src/utils/eventResources.js`.
- Firestore: `events/{eventId}/resources/{resourceId}`, `auditLogs/{logId}`.
- Tests: `tests/run-of-show-resources-foundation.test.js`, `tests/run-of-show-resource-rules.test.js`.
- Common symptoms: resource status invalid, quantity/unit confusion, supplier assignment not scoped.

### Event Readiness

- Consumers: Overview, Events, Reports, System QA.
- Utilities/docs: `src/utils/eventReadiness.js`, `docs/EVENT_READINESS_STANDARD_2026-08.md`, `docs/WORKING_EVENT_OVERVIEW_STANDARD.md`.
- Firestore: event, registrations, tickets, tasks, operations, resources, run of show.
- Tests: `tests/event-readiness.test.js`, `tests/organizer-experience-simplification.test.js`.
- Common symptoms: multiple duplicate readiness cards, future/current event wording wrong, warnings not actionable.

### Reports

- Route: `/event-review`.
- Page: `src/pages/EventReviewPage.jsx`.
- Utilities: `src/utils/eventReview.js`, `src/utils/registrationMetrics.js`, `src/utils/operationsReport.js`.
- Firestore: selected event, registrations, operations ledger.
- Tests: `tests/phase22-event-review.test.js`, `tests/phase23a-product-structure-ui-reset.test.js`, `tests/phase5-tickets-checkin-reports-reconciliation-refinement.test.js`.
- Common symptoms: page becomes editable, registration payments mixed with Operations, attendance limitation hidden, current/post-event wording wrong.

### Import Center And Response Inbox

- Route: `/imports`.
- Page/components: `src/pages/ImportsPage.jsx`, `src/components/imports/*`.
- Utilities/services: `src/services/importService.js`, `src/utils/importUtils.js`, `src/utils/importSources.js`, `src/utils/xlsxImport.js`, `src/utils/formResponseInbox.js`.
- Docs: `docs/IMPORT_CENTER_DAILY_WORKFLOW_STANDARD.md`, `docs/GOOGLE_FORMS_RESPONSE_INBOX_WORKFLOW.md`.
- Tests: `tests/import-center.test.js`, `tests/import-center-workflow-upgrade.test.js`, `tests/google-forms-response-inbox.test.js`.
- Common symptoms: pasted table columns unmapped, XLSX fallback warning, duplicate preview rows, write attempted before preview approval.

### Message Builder

- Route: `/communications`.
- Page/utilities: `src/pages/CommunicationsPage.jsx`, `src/utils/communicationsUtils.js`.
- Docs/tests: `docs/MESSAGE_BUILDER_COPY_ONLY_STANDARD.md`, `tests/phase6-communications.test.js`, `tests/phase10-phase11-roles-communications.test.js`, `tests/import-intake-message-builder-refinement.test.js`.
- Boundary: create, personalize, and copy messages. Messages are not sent automatically. Prompt builder is not live AI.
- Common symptoms: old phase wording, automatic-send claim, false AI/OAuth/delivery-status claim.

### Settings

- Route: `/settings`.
- Page: `src/pages/SettingsPage.jsx`.
- Services/utilities: `src/services/accessRequestContract.js`, `src/utils/eventDefaults.js`, `src/config/protectedOwner.js`.
- Firestore: `settings/accessControl`, access-request contract.
- Tests: `tests/settings-systemqa-tutorial-final-refinement.test.js`, `tests/protected-owner-authorization-matrix.test.js`.
- Common symptoms: roadmap archive shown as setting, Protected Owner not diagnosed, access workflow appears live when disabled.

### System QA

- Route: `/qa`.
- Page/components: `src/pages/QaPage.jsx`, `src/components/SystemHealthPanel.jsx`.
- Utilities: `src/utils/qaHelper.js`, `src/utils/runtimeHealth.js`.
- Scripts/tests: `scripts/product/productQa.mjs`, `scripts/product/routeCheck.mjs`, `scripts/product/documentationCheck.mjs`, `tests/production-qa.test.js`.
- Common symptoms: CODEX_DEMO not recognized, Protected Owner not PASS for owner UID, browser QA confused with automated checks.

### Product And Repository QA

- Scripts: `scripts/product/routeCheck.mjs`, `scripts/product/productQa.mjs`, `scripts/product/documentationCheck.mjs`, `scripts/audit/generateRepositoryAudit.mjs`.
- Audit artifacts: `audit/gsv-file-inventory.json`, `audit/gsv-document-registry.json`, `audit/gsv-external-related-files.json`, `audit/gsv-cleanup-log.json`, `audit/gsv-credential-security-review.json`, `audit/gsv-external-groups.json`, `audit/gsv-output-evidence-review.json`.
- Docs: this file, `docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md`, `docs/QA_GUIDE.md`, `docs/DEPLOYMENT_GUIDE.md`.
- Common symptoms: stale inventory metadata, active doc still uses retired fixture as current instruction, generated output mistaken for safe deletion.
