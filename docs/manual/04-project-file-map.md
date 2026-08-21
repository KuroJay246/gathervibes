# Project File Map

## Feature Ownership Map

| Feature | Main files | Related tests | Risk |
| --- | --- | --- | --- |
| Authentication and access resolution | src/lib/firebase.js; src/auth/AuthProvider.jsx; src/auth/ProtectedRoute.jsx; src/utils/accessRoles.js; src/config/protectedOwner.js | tests/auth-reliability.test.js; tests/protected-owner-authorization-matrix.test.js; tests/settings-access-management.test.js | High |
| Events and working event | src/pages/EventsPage.jsx; src/services/eventService.js; src/events/ActiveEventProvider.jsx; src/utils/eventPlanning.js | tests/event-utils.test.js; tests/phase26-event-categories-capabilities.test.js | High |
| Tasks and deadlines | src/pages/TasksPage.jsx; src/services/taskService.js; src/utils/taskWorkflow.js | tests/phase2-guided-event-setup-task-deadline.test.js; tests/task-workflow-rules.test.js | Medium |
| Guests and registrations | src/pages/RegistrationsPage.jsx; src/services/registrationService.js; src/utils/validators.js; src/utils/registrationMetrics.js | tests/registration-utils.test.js; tests/registration-metrics.test.js | High |
| Registration payments | src/pages/PaymentsPage.jsx; src/utils/financeUtils.js; src/utils/paymentStatus.js | tests/phase23b-payments-operations-boundaries.test.js; tests/payments-operations-refinement-2026-08.test.js | High |
| Review and reconciliation | src/pages/PaymentReconciliationPage.jsx; src/services/reconciliationReadService.js; src/utils/paymentReconciliation.js; src/utils/reconciliationWorkbook.js | tests/phase23c-payment-reconciliation.test.js | High |
| Tickets and QR | src/pages/TicketsPage.jsx; src/components/tickets/TicketQrCode.jsx; src/services/ticketService.js; src/utils/ticketUtils.js; src/utils/qrTicketUtils.js | tests/phase45-ticketing.test.js; tests/phase7-qr-checkin.test.js | High |
| Check-in and scanner | src/pages/CheckInPage.jsx; src/pages/ScannerPage.jsx; src/components/checkin/QrScannerPanel.jsx; src/utils/checkInUtils.js | tests/phase14-camera-checkin.test.js; tests/firestore-checkin-rules.test.js; e2e/workflows.spec.js | High |
| Imports and XLSX parsing | src/pages/ImportsPage.jsx; src/services/importService.js; src/utils/importUtils.js; src/utils/xlsxImport.js | tests/import-center.test.js; tests/import-center-workflow-upgrade.test.js | High |
| Operations ledger and commitments | src/pages/OperationsPage.jsx; src/services/operationsLedgerService.js; src/components/operations/PartnerCommitmentsPanel.jsx | tests/phase19-operations-productivity.test.js; tests/phase23b-payments-operations-boundaries.test.js | High |
| Run of Show | src/pages/RunOfShowPage.jsx; src/services/runOfShowService.js; src/utils/runOfShow.js | tests/run-of-show-resources-foundation.test.js; tests/run-of-show-resource-rules.test.js | Medium |
| Equipment and supplies | src/pages/ResourcesPage.jsx; src/services/eventResourceService.js; src/utils/eventResources.js | tests/run-of-show-resources-foundation.test.js; tests/run-of-show-resource-rules.test.js | Medium |
| Documents | src/pages/DocumentsPage.jsx; src/services/documentService.js; src/utils/documentRegistry.js | tests/document-contact-foundation.test.js; tests/document-contact-rules.test.js | Medium |
| Contacts and organizations | src/pages/ContactsPage.jsx; src/services/contactService.js; src/utils/contactDirectory.js | tests/document-contact-foundation.test.js; tests/document-contact-rules.test.js | Medium |
| Settings, staff, integrations | src/pages/SettingsPage.jsx; src/services/accessManagementService.js; src/services/staffManagementService.js; src/services/integrationSettingsService.js | tests/settings-access-management.test.js | High |
| Message Builder | src/pages/CommunicationsPage.jsx; src/utils/communicationsUtils.js | tests/phase6-communications.test.js | Medium |
| System QA | src/pages/QaPage.jsx; src/utils/qaHelper.js; src/utils/runtimeHealth.js | tests/production-qa.test.js; tests/settings-systemqa-tutorial-final-refinement.test.js | Medium |
| Tutorial/onboarding | src/tutorial/* | tests/onboarding-flow.test.js; tests/phase26-interactive-product-tour.test.js; e2e/tutorial.spec.js | Medium |

## Root Configuration

| Path | Purpose | Risk |
| --- | --- | --- |
| package.json | Scripts and dependencies for development, QA, E2E, Firebase deploy helpers, docs generation. | High |
| firebase.json | Auth provider notes, emulator ports, Firestore file references, Hosting headers and rewrites. | High |
| firestore.rules | Backend authorization and schema validation. | Critical |
| firestore.indexes.json | Firestore composite index configuration. | High |
| vite.config.js | Vite/React/Tailwind build configuration. | Medium |
| playwright.config.js | E2E browser test configuration and emulator env. | Medium |
| AI_AGENT_RULES.md | Permanent coding assistant governance. | High |
