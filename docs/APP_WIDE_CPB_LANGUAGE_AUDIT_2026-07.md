# App-Wide CPB and Generic Product Language Audit

Date: 2026-07-30

Scope: organizer-facing React source, tutorial source, tests, e2e, and repository documentation references to Cake Piknik, CPB, CODEX_TEST, patron/baker/tasting wording, historical attendance, reconciliation, roadmap/deferred copy, and command-center phrasing.

## Product Rule

Normal daily organizer surfaces must describe a universal event-management system. Use Guests, Partners, Suppliers, Event Activities, Guest Flow, Special Requirements, Event Team, Event-Day Plan, and Registration Payment by default.

Specialized wording remains allowed only when an event category or capability makes it relevant, or when the organizer is viewing historical/reconciliation evidence. CPB is not a special protected event.

## Occurrence Classification

| Wording / Pattern | Route | Component / Area | File | Classification | Remain? | Replacement / Condition |
|---|---|---|---|---|---|---|
| `CODEX_TEST` normal rehearsal prompt | `/events` | Events page header | `src/pages/EventsPage.jsx` | Incorrect production-facing content | No | Removed from Events. QA event selection remains in System QA. |
| `Use CODEX_TEST` normal action | `/events` | Events page action row | `src/pages/EventsPage.jsx` | Incorrect production-facing content | No | Removed from Events. Use System QA for QA fixture selection. |
| `CODEX_TEST` and `CPB` tutorial examples | Guided tutorial | Working Event and System QA lessons | `src/tutorial/tutorialSteps.js` | Incorrect production-facing content | No | Replaced with neutral event examples and QA-agnostic safety wording. |
| `Confirm CODEX_TEST` practice mission | Practice Mode | Practice mission list | `src/tutorial/tutorialSteps.js` | Incorrect production-facing content | No | Replaced with generic local-state missions and permanent Practice Mode banner. |
| `CPB-001` QR placeholder | `/check-in`, scanner panel | Manual QR entry | `src/components/checkin/QrScannerPanel.jsx` | Generic product wording that must be replaced | No | Replaced with `TICKET-001 or GSV:TICKET:TICKET-001`. |
| `Check that CODEX_TEST is the Working Event before testing` | `/check-in` | Missing ticket error | `src/pages/CheckInPage.jsx` | Incorrect production-facing content | No | Replaced with generic Working Event confirmation. |
| `patron payment follow-up` | `/dashboard`, `/payments`, `/event-review`, finance helpers | Normal payment follow-up | `src/pages/DashboardPage.jsx`, `src/pages/PaymentsPage.jsx`, `src/pages/EventReviewPage.jsx`, `src/utils/financeUtils.js` | Generic product wording that must be replaced | No | Replaced with guest/buyer payment follow-up. |
| `bakers` in general setup copy | `/events`, `/operations`, readiness helpers | Event setup, Operations guidance, readiness | `src/components/events/EventFormModal.jsx`, `src/components/events/EventPlanningWorkspace.jsx`, `src/pages/OperationsPage.jsx`, `src/utils/eventReadiness.js`, `src/components/operations/PartnerCommitmentsPanel.jsx` | Generic product wording that must be replaced | No | Replaced with partners, vendors, suppliers, sponsors, venue contacts, and helpers. |
| `Bakers`, `Tasting zones`, `Cake Tasting` | Event configuration taxonomy | Event type/capability options | `src/utils/eventPlanning.js` | Event-category-specific wording | Yes | Remains only as food-showcase/cake-tasting capability language. |
| CPB financial evidence and baker evidence | `/dashboard` completed event view, `/payments`, `/event-review` | Historical evidence panels | `src/pages/DashboardPage.jsx`, `src/pages/PaymentsPage.jsx`, `src/pages/EventReviewPage.jsx`, `src/utils/financialEvidenceAudit.js` | Historical CPB evidence | Yes | Remains historical evidence only; it does not make CPB read-only. |
| Payment reconciliation preview | `/payments/reconciliation` | Selected-event read-only reconciliation tool | `src/pages/PaymentReconciliationPage.jsx`, `src/utils/paymentReconciliation.js` | Generic payment workbook comparison | Yes | Uses the selected Working Event and no CPB confirmation lock. |
| CPB manifest/apply references | Internal utilities and tests | Reconciliation/apply engines | `src/utils/manifestApplyEngine.js`, phase tests | Developer or QA documentation / test-only content | Yes | Remains out of normal tutorial and normal daily workflow. |
| CODEX_TEST references | `/qa`, QA helper utilities, tests, docs | System QA and automated tests | `src/pages/QaPage.jsx`, `src/utils/qaHelper.js`, tests, QA docs | Developer or QA documentation | Yes | Remains in System QA and tests only. |
| Historical attendance language | `/check-in`, docs, registration services | Protected evidence warning | `src/pages/CheckInPage.jsx`, `src/utils/attendanceUtils.js`, docs | Protected historical evidence | Yes | Remains when evidence audit exists; does not create check-ins. |
| `deferred` Google Sheets wording | `/imports` | Import templates panel | `src/components/imports/ImportTemplatesPanel.jsx` | Generic product wording that must be replaced | No | Replaced with direct manual sync wording. |

## Result

Normal tutorial and ordinary daily workflow copy no longer teaches from CPB or CODEX_TEST. CPB remains a normal completed real event with historical evidence preserved where relevant. CODEX_TEST remains QA-only.
