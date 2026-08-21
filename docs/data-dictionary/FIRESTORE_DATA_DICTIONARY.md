# Firestore Data Dictionary

This dictionary is based on current services, Firestore Rules, and tests. It does not include real production personal data.

## Collections and Subcollections

| Collection path | Purpose | Code that uses it | Rules reference | Security note |
| --- | --- | --- | --- | --- |
| settings/accessControl | Authoritative approved organizer source plus metadata records. | src/auth/AuthProvider.jsx; src/services/accessManagementService.js; src/pages/SettingsPage.jsx | firestore.rules match /settings/accessControl | Protected Owner only for mutations; approved admins read. |
| settings/accessControl/history/{historyId} | Append-only history for organizer access changes. | src/services/accessManagementService.js | firestore.rules match /settings/accessControl/history/{historyId} | Protected Owner create; approved admins read. |
| settings/integrations | Supported integration status settings surfaced in Settings. | src/services/integrationSettingsService.js | firestore.rules match /settings/integrations | Protected Owner create/update; approved admins read. |
| events/{eventId} | Event records, planning data, capability configuration, and working-event source. | src/services/eventService.js; src/events/ActiveEventProvider.jsx | firestore.rules match /events/{eventId} | Approved admins manage; assigned staff can read assigned events. |
| events/{eventId}/staffAssignments/{uid} | Event-scoped staff assignment records. | src/services/staffManagementService.js; src/auth/AuthProvider.jsx | firestore.rules match /events/{eventId}/staffAssignments/{uid} | Approved admins manage; assigned user can read own active assignment. |
| events/{eventId}/tasks/{taskId} | Event-scoped tasks and deadlines. | src/services/taskService.js | firestore.rules match /events/{eventId}/tasks/{taskId} | Approved admins and assigned event managers manage; viewers can read. |
| registrations/{registrationId} | Guest registration, ticket, payment, and check-in status records. | src/services/registrationService.js; src/services/ticketService.js | firestore.rules match /registrations/{registrationId} | Approved admins manage; assigned scanners can perform narrow check-in updates. |
| auditLogs/{logId} | Append-only audit evidence for business mutations. | src/services/auditService.js; service write batches | firestore.rules match /auditLogs/{logId} | Create only when matching a permitted target mutation; never update/delete. |
| operationsLedger/{ledgerEntryId} | Event-level Operations ledger, commitments, partners, in-kind support. | src/services/operationsLedgerService.js | firestore.rules match /operationsLedger/{ledgerEntryId} | Approved admins create/update; no delete. |
| events/{eventId}/documents/{documentId} | Event document references and external links. No Firebase Storage upload. | src/services/documentService.js | firestore.rules match /events/{eventId}/documents/{documentId} | Approved admins and event managers create/update; admins delete. |
| events/{eventId}/runOfShow/{itemId} | Event-day schedule sequence, dependencies, arrivals, status. | src/services/runOfShowService.js | firestore.rules match /events/{eventId}/runOfShow/{itemId} | Approved admins manage; assigned event staff can read through task read gate. |
| events/{eventId}/resources/{resourceId} | Equipment, supplies, packing, pickup, return, quantity tracking. | src/services/eventResourceService.js | firestore.rules match /events/{eventId}/resources/{resourceId} | Approved admins manage; assigned event staff can read through task read gate. |
| contacts/{contactId} | Reusable contact directory. | src/services/contactService.js | firestore.rules match /contacts/{contactId} | Approved admins create/update/read; delete false. |
| organizations/{organizationId} | Reusable organization directory. | src/services/contactService.js | firestore.rules match /organizations/{organizationId} | Approved admins create/update/read; delete false. |
| events/{eventId}/contactLinks/{linkId} | Event relationship links to contacts/organizations. | src/services/contactService.js | firestore.rules match /events/{eventId}/contactLinks/{linkId} | Approved admins and event managers create/update; admins delete. |
| accessRequests/{requestId} | Signed-in user access request workflow. | src/services/accessRequestContract.js | firestore.rules match /accessRequests/{requestId} | Signed-in create; approved admins review; no delete. |
| staffProfiles/{uid} | Global staff profile records. | src/services/staffManagementService.js; src/auth/AuthProvider.jsx | firestore.rules match /staffProfiles/{uid} | Approved admins manage; staff can read own active profile. |

## Indexes

| Collection group | Fields | Purpose |
| --- | --- | --- |
| registrations | eventId ASCENDING, createdAt DESCENDING | Supports scoped Firestore query ordering used by the app. |

## Schema Truth Rule

Do not infer schema from one example record. Cross-check service writes, page reads, utils, Firestore Rules validators, and tests.
