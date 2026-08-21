# Appendix C. Route and Feature Indexes

## Route Index

| Route | Main purpose | Primary page module | Main supporting services/utilities | Related tests |
| --- | --- | --- | --- | --- |
| `/dashboard` | Event overview, readiness, and next actions | `src/pages/DashboardPage.jsx` | `eventReadiness`, `registrationMetrics`, `operationsLedgerService`, `runOfShowService`, `eventResourceService` | `tests/page-organization-pass2-compactness.test.js`, dashboard tests |
| `/events` | Event planning and Working Event control | `src/pages/EventsPage.jsx` | `eventService`, `eventPlanning` | `tests/event-utils.test.js`, category/capability tests |
| `/tasks` | Event-scoped task management | `src/pages/TasksPage.jsx` | `taskService`, `taskWorkflow` | `tests/task-workflow-rules.test.js` |
| `/registrations` | Guest records and attendance context | `src/pages/RegistrationsPage.jsx` | `registrationService`, `validators`, `registrationMetrics` | registration tests |
| `/payments` | Registration-linked payments | `src/pages/PaymentsPage.jsx` | `financeUtils`, `paymentStatus` | payments boundary tests |
| `/payments/reconciliation` | Workbook comparison and review-only reconciliation | `src/pages/PaymentReconciliationPage.jsx` | `reconciliationReadService`, `paymentReconciliation`, `reconciliationWorkbook` | reconciliation tests |
| `/imports` | Import Center workflow | `src/pages/ImportsPage.jsx` | `importService`, `importUtils`, `xlsxImport` | import-center tests |
| `/tickets` | Ticket assignment and QR preparation | `src/pages/TicketsPage.jsx` | `ticketService`, `ticketUtils`, `qrTicketUtils` | ticketing and QR tests |
| `/check-in` | Assisted event-day attendance operations | `src/pages/CheckInPage.jsx` | `ticketService`, `checkInUtils`, `eventDayHelpers` | check-in rules/tests |
| `/scanner` | Assigned-event scanner route | `src/pages/ScannerPage.jsx` | `QrScannerPanel`, `qrTicketUtils` | camera/check-in tests |
| `/operations` | Ledger, commitments, partners, and in-kind support | `src/pages/OperationsPage.jsx` | `operationsLedgerService` | operations tests |
| `/run-of-show` | Event-day sequence planning | `src/pages/RunOfShowPage.jsx` | `runOfShowService`, `runOfShow` | run-of-show tests |
| `/resources` | Equipment and supplies tracking | `src/pages/ResourcesPage.jsx` | `eventResourceService`, `eventResources` | resource tests |
| `/documents` | Event document references | `src/pages/DocumentsPage.jsx` | `documentService`, `documentRegistry` | document tests |
| `/contacts` | Contact, organization, and relationship directory | `src/pages/ContactsPage.jsx` | `contactService`, `contactDirectory` | contact tests |
| `/event-review` | Reports and read-only review surfaces | `src/pages/EventReviewPage.jsx` | review helpers, finance/report utils | event review tests |
| `/communications` | Copy-only message preparation | `src/pages/CommunicationsPage.jsx` | `communicationsUtils` | communications tests |
| `/settings` | Owner/admin settings surfaces | `src/pages/SettingsPage.jsx` | access/staff/integration services | settings tests |
| `/qa` | System QA diagnostics | `src/pages/QaPage.jsx` | `runtimeHealth`, `qaHelper` | production QA tests |

## Feature-to-File Index

| Feature | Main UI files | Main service files | Main utilities | Rule/test anchors |
| --- | --- | --- | --- | --- |
| Organizer access | `src/pages/SettingsPage.jsx` | `src/services/accessManagementService.js`, `src/services/staffManagementService.js` | `src/utils/accessRoles.js` | `firestore.rules` access-control/staff blocks; settings tests |
| Registration workflow | `src/pages/RegistrationsPage.jsx` | `src/services/registrationService.js` | `src/utils/validators.js`, `src/utils/registrationMetrics.js` | registrations rules and metrics tests |
| Payments | `src/pages/PaymentsPage.jsx` | registration service bulk finance paths | `src/utils/financeUtils.js`, `src/utils/paymentStatus.js` | payments boundary tests |
| Ticketing and QR | `src/pages/TicketsPage.jsx`, `src/components/tickets/TicketQrCode.jsx` | `src/services/ticketService.js` | `src/utils/ticketUtils.js`, `src/utils/qrTicketUtils.js` | ticket/QR tests |
| Check-In and scanner | `src/pages/CheckInPage.jsx`, `src/pages/ScannerPage.jsx` | `src/services/ticketService.js` | `src/utils/checkInUtils.js` | camera/check-in/rules tests |
| Import Center | `src/pages/ImportsPage.jsx` | `src/services/importService.js` | `src/utils/importUtils.js`, `src/utils/xlsxImport.js` | import-center tests |
| Operations | `src/pages/OperationsPage.jsx` | `src/services/operationsLedgerService.js` | operations workspace helpers | operations tests |
| Run of Show | `src/pages/RunOfShowPage.jsx` | `src/services/runOfShowService.js` | `src/utils/runOfShow.js` | run-of-show tests |
| Resources | `src/pages/ResourcesPage.jsx` | `src/services/eventResourceService.js` | `src/utils/eventResources.js` | resource tests |
| Documents | `src/pages/DocumentsPage.jsx` | `src/services/documentService.js` | `src/utils/documentRegistry.js` | document tests |
| Contacts | `src/pages/ContactsPage.jsx` | `src/services/contactService.js` | `src/utils/contactDirectory.js` | contact tests |
| Tutorial/onboarding | `src/tutorial/*` | onboarding preference reads/writes | tutorial registries/helpers | tutorial tests |
