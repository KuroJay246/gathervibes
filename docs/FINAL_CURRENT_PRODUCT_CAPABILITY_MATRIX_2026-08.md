# Final Current Product Capability Matrix - 2026-08

| Capability | Classification | Current Behavior | Limitation | Evidence | Next Action |
| --- | --- | --- | --- | --- | --- |
| Authentication | Fully Operational | Google/Firebase-auth protected private app. | Production session visual check is manual when browser automation is unavailable. | Auth provider, route guards, tests. | Continue normal monitoring. |
| Protected owner access | Fully Operational | `jaylanspencer99@gmail.com` is pinned by UID and shown as Protected Owner. | Email alone is not sufficient without UID. | `protectedOwner.js`, `firestore.rules`, protected owner tests. | Preserve during all internals work. |
| Organizer access | Fully Operational | Approved organizers get normal organizer-level routes and writes. | Mutable allowlist remains console-managed. | Access roles, AuthProvider, rules tests. | Keep admin-only. |
| Staff roles | Fully Operational | Event manager, scanner, viewer, and operations-helper roles are scoped. | Limited route surfaces per role. | Access roles, route guards, Firestore rules. | Expand only with explicit workflow design. |
| Working Event | Fully Operational | Shell and pages scope event work to selected event. | No event state requires organizer selection. | App shell and active event tests. | Keep central. |
| Events | Fully Operational | CRUD, status grouping, completed-event editing, and test-event handling. | Destructive actions still require human confirmation. | Event service, Events page, E2E workflow. | Continue real-event safeguard model. |
| Guided setup | Fully Operational | Setup stages, validation, capability choices, and resume behavior. | Capability-dependent sections do not create unsupported modules. | Events page and E2E. | Keep focused on event creation quality. |
| Tasks | Fully Operational | Persistent event-scoped tasks with statuses, due dates, filters, and audit logs. | Not a full project-management suite. | Tasks page, task service, rules tests. | Consider deeper task workflow later. |
| Registrations | Fully Operational | Registration records, guest count, optional fields, details, filters, and duplicate handling. | Table complexity remains on dense data. | Registrations page and tests. | Continue responsive refinement as needed. |
| Registration payments | Fully Operational | Amount due/paid/balance/status/method/reference and follow-up states. | Does not connect to payment processor. | Payments page, registration service, financial tests. | Next finance work should focus on reporting boundaries. |
| Tickets | Fully Operational | Assignment, uniqueness protection, details, QR rendering, and mobile cards. | No public guest portal. | Ticket service, Tickets page, QR tests. | Preserve QR privacy. |
| QR | Fully Operational | QR payload is `GSV:TICKET:{ticketCode}`. | Ticket code only, no private data. | `qrTicketUtils.js` and repeated tests. | Do not expand payload. |
| Check-In | Fully Operational | Manual and scanner-assisted attendance with duplicate prevention. | Normal scanner cannot undo or check out. | CheckIn page, Scanner page, rules tests. | Keep correction organizer-only. |
| Historical attendance | Fully Operational | Historical evidence is stored separately from scanner-confirmed check-in. | Approximate attendance evidence is not converted into check-ins. | Attendance utilities and tests. | Preserve separation. |
| Operations | Fully Operational | Event-level cash entries, expenses, refunds, reimbursements, and adjustments. | Not a final accounting/profit system. | Operations page/service and tests. | Keep separate from registration payments. |
| Commitments | Fully Operational | Planned/partial/paid/cancelled obligations and in-kind support. | Commitments are not equivalent to paid expenses. | Operations page and tests. | Continue current semantics. |
| Partner/supplier view | Operational With Limitations | Derived from Operations/commitment records. | No reusable directory or CRM. | Operations UI. | Candidate for contacts foundation. |
| Reports | Fully Operational | Read-only event summary, payments, operations, commitments, in-kind, attendance, and closeout. | No export system. | Event Review page and tests. | Keep read-only until export scope is approved. |
| Reconciliation | Operational With Limitations | Selected-event preview and evidence review. | Corrections happen through normal audited workflows. | Payment Reconciliation page/tests. | Continue finance-boundary refinement. |
| Import Center | Fully Operational | Preview-first import flow with mapping, validation, confirm, result, retry remaining. | Live external sync is not enabled. | Imports page, import service, E2E. | Preserve preview-first writes. |
| CSV | Fully Operational | Custom CSV and exported CSV intake are supported. | Requires organizer-provided file. | Import tests. | Keep aliases updated. |
| Google Forms CSV | Manual Workflow | Organizer exports Forms responses and uploads CSV. | No live Forms API connection. | Import source labels/tests. | Keep manual unless receiver is deployed. |
| Google Sheets export | Manual Workflow | Organizer exports sheet data and imports. | No OAuth or live Sheets sync. | Import Center and integration copy. | Consider only after privacy/scope approval. |
| Excel | Fully Operational | Local workbook import uses `read-excel-file`. | Browser-local parsing only. | `npm ls read-excel-file`. | Keep `xlsx` absent. |
| PDF | Operational With Limitations | Fallback/intake guidance exists. | No OCR or reliable table extraction. | Import UI/copy. | Leave as fallback. |
| Response Inbox | Operational With Limitations | Manual response review, filtering, statuses, details, duplicate handling, import preview handoff. | Approving does not automatically import. | Response Inbox tests and Import Center. | Keep review-only. |
| Automatic Forms receiver | Packaged but Undeployed | Receiver materials exist. | Not proven deployed or configured. | Source/packages and audit brief. | Deploy only in explicit integration phase. |
| Message Builder | Manual Workflow | Create, personalize, preview, and copy messages/subjects. | No automatic sending or AI generation. | Communications page and tests. | Keep copy-only until send scopes are approved. |
| Gmail | Disconnected | No Gmail send/import integration. | External OAuth/privacy not configured. | Source inspection and copy tests. | Do not connect without approval. |
| WhatsApp | Unsupported | No direct sending. | External channel not implemented. | Source inspection and copy tests. | Future only if approved. |
| SMS | Unsupported | No direct sending. | External channel not implemented. | Source inspection. | Future only if approved. |
| Online payments | Disconnected | Payment records are manual/app-entered, not processor-connected. | No payment gateway. | Payment pages/tests. | Future only with security review. |
| Settings | Fully Operational | Practical owner, role, tutorial, test-event, integration, and advanced controls. | No destructive settings panel. | Settings page/tests. | Keep administrative. |
| System QA | Fully Operational | Environment, access, data-boundary, feature-status, and manual checks. | Some items remain manual acceptance. | Qa page/tests. | Keep separate from daily workflow. |
| Tutorial | Fully Operational | V3 route-targeted tutorial is tested and supports replay/progress. | Full production human walkthrough remains manual when browser unavailable. | E2E tutorial tests. | Run manual acceptance before major launch demos. |
| Audit logs | Fully Operational | Business writes are paired with append-only audit records. | Harmless UI state is not audited. | Services and rules. | Maintain append-only model. |
| Responsive support | Operational With Limitations | Automated responsive E2E passes across organizer routes. | Exact authenticated production visual review is manual here. | E2E responsive tests. | Human review before public demo. |
| Accessibility | Operational With Limitations | Automated desktop/mobile accessibility E2E passes. | True 200% zoom remains manual acceptance. | E2E accessibility tests and React Doctor advisories. | Fix targeted advisory clusters over time. |
| Photo booth | Unsupported | External business/service, not an app integration. | No code integration. | Source inspection. | Treat as future external scope only. |

## Capability Counts

| Classification | Count |
| --- | ---: |
| Fully Operational | 24 |
| Operational With Limitations | 6 |
| Manual Workflow | 3 |
| Packaged but Undeployed | 1 |
| Disconnected | 2 |
| Unsupported | 3 |

