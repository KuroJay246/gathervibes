# GSV Mobile Event Hub Expansion Audit

Date: 2026-09-28  
Baseline: `69aea0e`  
Scope: read-only architecture audit before Batch A implementation

This document compares the current web route manifest, web services, access
contracts, Firestore rules, and native route surface. It is an implementation
gate, not a claim that the native app already has the listed parity.

## Product Convergence Decision

Gather & Savor is one product with Web, Android, and future iOS clients. The
clients may use platform-appropriate layouts and interaction patterns, but
they must share Firebase data, schemas, statuses, validation, capabilities,
permissions, write semantics, and audit meaning. New native work must call an
existing service contract or a genuinely shared contract extracted into the
existing contracts package; it must not invent direct Firestore writes.

Message Builder is excluded from active native parity work. It is currently a
copy-only web utility with no provider send contract. Retain the web route for
now, trace references/tests/documentation before hiding or retiring it, and do
not implement a native version in Batch A.

## Route Inventory

| Web route | Canonical capability | Read model / data source | Mutation service | Native surface | Current status |
| --- | --- | --- | --- | --- | --- |
| `/dashboard` | Event overview | `buildDashboardOverviewModel`, registration summary, operations/tasks/documents listeners | none on page | Home | Native compact |
| `/events` | Event management and selection | `eventService.subscribeToEvents` | `eventService` | Event picker only | Selection native; management missing |
| `/tasks` | Tasks and deadlines | task listener / task read model | `taskService` with revision transaction | Tasks | Read-only native |
| `/registrations` | Registration management | `buildRegistrationListModel`, registration listener | `registrationService` | Guests / lookup | Lookup subset |
| `/payments` | Registration payments | `buildPaymentReconciliationModel` | `registrationService` payment mutations | Reports subset | Native summary only |
| `/payments/reconciliation` | Reconciliation review | `reconciliationReadService`, payment reconciliation model | none for apply | none | Web review |
| `/tickets` | Ticket assignment and QR access | ticket lookup / registrations | `ticketService` | Guest/ticket detail subset | Detail/check-in subset |
| `/check-in` | Check-in operations | check-in queue / registrations | `checkInService` | Scan, manual entry | Native core |
| `/operations` | Operations ledger | `buildOperationsSummaryModel`, operations listener | `operationsLedgerService` | Operations | Read-only native |
| `/run-of-show` | Event-day timeline | run-of-show listener/read model | `runOfShowService` | Run of Show | Read-only native |
| `/resources` | Equipment and supplies | event resource listener | `eventResourceService` | none | Native missing |
| `/contacts` | Contacts and organizations | contact/org/event-link listeners | `contactService` | Contacts | Compact native |
| `/documents` | Event documents | document listener/read model | `documentService` | Operational Notes subset | Documents missing |
| `/imports` | CSV/paste/XLSX import | `buildImportPreviewModel` | `importService` | none | Native missing |
| `/communications` | Message Builder | template/segment utilities | copy-only `messageBuilder` | none | Native intentionally deferred; web utility is a retirement candidate |
| `/event-review` | Reports and event review | `buildEventReviewModel` | none | Reports | Compact native |
| `/settings` | Workspace settings | settings/access/integration services | `settingsService`, protected access services | Settings | Partial native |
| `/qa` | System QA | runtime health and QA helpers | none | none | Web-only technical surface |

## Authoritative Write-Contract Matrix

The native app must call the existing service contract or a shared extracted
contract. It must not write directly to Firestore from a new screen.

| Capability | Existing write contract | Firestore boundary | Revision/conflict | Mobile Phase 1 decision |
| --- | --- | --- | --- | --- |
| Events | `createEvent`, `updateEvent`, `deleteEvent`, planning helpers | `/events/{eventId}` | Service validation; inspect delete cascade before exposing | Batch A: view/create/edit first; destructive action later |
| Registrations | `createRegistration`, `updateRegistration`, attendance, delete, bulk payment/finance updates | `/registrations/{registrationId}` | Existing service validation; no native direct writes | Batch A: list/detail/create/edit/status only after field audit |
| Tickets | `saveTicketAssignment`, `clearTicketAssignment` | registration ticket fields; QR contract remains `GSV:TICKET:{ticketCode}` | Service validation/audit | Batch A: assignment/detail; preserve QR payload |
| Tasks | `createTask`, `updateTask`, status, delete | `/events/{eventId}/tasks/{taskId}` | Required transaction and `revision`; stale conflict code exists | Batch A: keep read-only until shared conflict UI is implemented |
| Operations | `createLedgerEntry`, `updateLedgerEntry`, cancel | `/operationsLedger/{ledgerEntryId}` | Audit and valid status/amount transitions | Batch B: audit role and write UI before enabling |
| Run of Show | create/update/status/delete | `/events/{eventId}/runOfShow/{itemId}` | Audit and valid lifecycle/status | Batch B: read-only remains default |
| Resources | create/update/status/delete | `/events/{eventId}/resources/{resourceId}` | Audit and valid lifecycle/status | Batch B: read/search/detail first |
| Contacts | contact/org create/update; event-link create/update/delete | `/contacts`, `/organizations`, `/events/{eventId}/contactLinks` | Audit; delete is restricted | Batch B: read/search/actions first |
| Documents | reference create/update/status/delete | `/events/{eventId}/documents/{documentId}` | Audit; cloud-first references | Batch D: list/detail/metadata first |
| Payments | registration service payment/finance updates | registration fields | Validation/audit in registration service | Batch C: review first; authorized updates only after field audit |
| Reconciliation | read-only comparison services | read-only event data | No apply contract | Batch C: review/status only |
| Imports | preview/validation then `commitImport` | registrations and audit records | Import contracts and limits | Batch D: preview/validation first; no duplicate engine |
| Message Builder | copy-only composition | no provider write | No send contract | Excluded from active native parity; retain web pending retirement review |
| Settings/access | integration/settings/access management services | protected settings/access docs | Protected-owner transaction rules | Batch E: safe account/event/settings subset |

## Role and Capability Matrix

| Capability | Protected Owner | Approved Organizer (`owner`/`admin`) | Event Manager | Scanner-only | Viewer | Operations Helper |
| --- | --- | --- | --- | --- | --- | --- |
| Choose/view events | all readable events | all readable events | assigned events | assigned events | assigned events | assigned events |
| Event create/edit | view/create/edit | view/create/edit | no | no | no | no |
| Registrations | view/create/edit/delete per service | view/create/edit/delete per service | view only by current rules | lookup/check-in scope | view-only where implemented | no |
| Tickets | assign/correct/view | assign/correct/view | no | no | no | no |
| Check-in | full owner check-in | full owner check-in | only if route/rules allow | complete assigned check-in | no write | no |
| Tasks | full service capability | full service capability | manage assigned tasks | no | view assigned | no |
| Operations | manage | manage | no unless future contract | no | no | read assigned |
| Run of Show | manage | manage | no unless future contract | no | read where exposed | no |
| Resources | manage | manage | read where rules allow | no | read where exposed | no |
| Contacts/documents | manage | manage | assigned scoped document/link writes where rules permit | no | read-only where exposed | no |
| Payments/reconciliation | manage/review | manage/review | no | no | no | no |
| Imports | use | use | no | no | no | no |
| Message Builder | compose/copy | compose/copy | no | no | no | no |
| Settings/access | full protected-owner boundary | approved settings only | no | no | no | no |
| System QA | view/use | view/use | no | no | no | no |

Evidence: `packages/contracts/src/accessRoles.js` defines organizer route
capabilities and role behavior. `firestore.rules` grants organizer writes for
events, registrations, operations, run of show, resources, contacts,
documents, and protected settings, with narrower assigned-role exceptions.

## Settings Parity Matrix

| Settings area | Web source | Native current state | Mobile decision |
| --- | --- | --- | --- |
| Account identity and role | `SettingsPage.jsx`, auth/access provider | Present | Keep and improve |
| Working Event | Active event provider and `/events` | Present | Keep current event switch |
| Access management | `accessManagementService`, protected-owner UI | Not native | Owner/organizer review only; do not expose secrets |
| Staff and assignments | `staffManagementService` | Not native | Separate future admin workflow |
| Integrations | integration settings service | Partial account/connectivity display | Show safe status only |
| Check-in preferences | No separate authoritative mobile setting identified | Not present | Do not invent; re-audit source if needed |
| Security/session | auth provider and access state | Partial | Add safe session/access information |
| About/support/privacy | app metadata and product docs | Not present | Add in Batch E |
| System QA/debug | `/qa` | Web-only | Keep out of normal mobile navigation |

## Proposed More IA

More remains secondary navigation and should expose only routes that exist in
the canonical web manifest or have an approved native implementation.

### Event Management

- Events (management list/detail; separate from the event picker)
- Run of Show
- Operations
- Resources

### Registration

- Registrations (only when broader than Guests)
- Tickets
- Event Contacts

### Finance

- Registration Payments
- Reconciliation

### Files & Data

- Documents
- Import Center
- Response Inbox only if current source confirms it exists

### Communication

- Message Builder

### Insights

- Reports / Event Review as one destination, not duplicated labels

### Workspace

- Settings
- Operational Notes only if it remains a distinct useful document subset

System QA stays out of normal More navigation unless explicitly opened from an
approved technical/admin context.

## Batch A Plan

Batch A is implementation-ready only after this audit is accepted.

1. **More IA and route inventory**
   - Add only canonical current routes.
   - Keep Home, Guests, Scan, Tasks, More as the five bottom destinations.
   - Add role/capability visibility before navigation rows render.

2. **Events management**
   - Add native Events management list separate from the accepted picker.
   - Reuse `eventService` and current event schema.
   - Implement view/create/edit with validation, loading, empty, error, and
     keyboard-safe form states.
   - Defer delete/archive until related-record semantics are documented in the
     service and rules.

3. **Registrations**
   - Audit the actual registration form fields and validation helpers.
   - Add a native Registrations destination only if it is broader than Guests.
   - Start with bounded list, filter, detail, create, and edit flows.
   - Reuse `registrationService`; no direct Firestore writes.

4. **Tickets**
   - Add ticket management/detail where it is broader than check-in lookup.
   - Reuse `ticketService` and preserve `GSV:TICKET:{ticketCode}`.

5. **Shared acceptance**
   - Role matrix tests for owner, organizer, event manager, scanner, viewer,
     and operations helper.
   - Read/write boundary tests.
   - Loading/empty/error/offline/access-denied states.
   - Clean-emulator runtime proof for More, Events management, Registrations,
     and Tickets before commit.

No Batch A feature is being claimed as implemented by this audit.

## Feature Usefulness Review

| Feature | Classification | Reason | Removal risk / recommendation |
| --- | --- | --- | --- |
| Operational Notes | Useful supporting | A focused event-day notes subset is useful, but it is not equivalent to the full Documents capability. | Keep scoped; verify document references before expanding. |
| Response Inbox | Needs source confirmation | No current route or manifest entry was found in the inspected product surface. | Do not add or remove until source references and stored data are traced. |
| Message Builder | Retirement candidate | Copy-only composition has no provider write/send contract and is not an active native priority. | Retain web temporarily; trace routes, tests, docs, and dependencies before retirement. |
| Reconciliation | Desktop-first useful supporting | Current behavior is a read-only workbook comparison with no apply contract. | Keep web-first; consider mobile review/status later. |
| Import Center | Desktop-first useful supporting | Preview, mapping, validation, and commit are valuable, but advanced mapping is desktop-oriented. | Investigate a bounded mobile preview using the existing import engine. |
| System QA | Technical/QA | It is a release and diagnostic surface, not normal product navigation. | Keep out of normal More navigation. |
| Event Picker | Core | The searchable modal picker is accepted and scales better than an inline event list. | Freeze; only fix real regressions or final micro-polish. |

## Shared Product Convergence Matrix

This matrix records current capability alignment. Sync models are deliberately
per-feature; Home listeners do not make the whole product globally realtime.

| Feature | Authoritative data | Shared contract | Web read/write | Mobile read/write | Roles | Sync model | Offline | Audit | Parity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Events | `/events` | `eventService` | full / full | picker / none | owner, organizer | snapshot/focus refresh | cached selection only | event audit | MISSING MOBILE |
| Registrations | `/registrations` | `registrationService` and list model | full / full | lookup / none | admin; scoped readers | bounded listener | no offline write | registration audit | WEB AHEAD |
| Tickets | registration ticket fields | `ticketService`, `GSV:TICKET:{ticketCode}` | assignment/detail / assignment | detail/check-in / no assignment | admin; scanner check-in | bounded read | no false offline success | ticket/check-in audit | WEB AHEAD |
| Tasks | event task subcollections | `taskService` with revision transaction | full / full | list / none | admin, event manager | listener | no offline write | task audit | WEB AHEAD |
| Operations | operations ledger | `operationsLedgerService` | full / full | summary / none | admin, operations helper read | listener/focus | read-only | ledger audit | WEB AHEAD |
| Run of Show | event run-of-show | `runOfShowService` | full / full | timeline / none | admin | listener | read-only | lifecycle audit | WEB AHEAD |
| Resources | event resources | `eventResourceService` | full / full | none / none | admin | bounded listener | no offline write | resource audit | MISSING MOBILE |
| Contacts | contacts/org/event links | `contactService` | full / full | compact / none | admin; scoped readers | bounded listener | bounded reads | contact audit | WEB AHEAD |
| Documents | event document references | `documentService` | full / full | notes subset / none | admin, assigned manager | listener/on-demand | cloud-first | document audit | WEB AHEAD |
| Payments | registration finance fields | registration service/payment model | full / authorized updates | summary / none | admin | realtime/focus | no offline write | finance audit | WEB AHEAD |
| Reconciliation | event registrations/operations | `reconciliationReadService` | review / none | none / none | admin | manual read | read-only | no apply contract | MISSING MOBILE |
| Imports | import preview/commit records | `importService` | full / commit | none / none | admin | explicit refresh | no offline write | import audit | MISSING MOBILE |
| Message Builder | web copy utility | `messageBuilder`; no send contract | compose/copy / no provider write | none / none | admin | manual | web required | no provider audit | RETIREMENT CANDIDATE |
| Reports | event review aggregates | event review read model | full / none | compact / none | admin | aggregate/focus | read-only | report audit | WEB AHEAD |
| Settings | access/settings documents | settings/access services | full / protected writes | partial / none | owner, organizer | focus refresh | local/shared split | security audit | WEB AHEAD |
