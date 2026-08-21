# Appendix A. Field-Level Firestore Dictionary

This appendix documents fields that can be proven from current source code, validators, Firestore Rules comments, and tests. Where evidence is incomplete, the entry is marked `UNKNOWN — REQUIRES FUTURE VERIFICATION`.

## settings/accessControl

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| approvedEmails | list<string> | Yes | Secondary organizer allowlist used by authorization checks. | `src/services/accessManagementService.js` | `src/auth/AuthProvider.jsx`, `src/utils/accessRoles.js`, Firestore Rules | High. Organizer authorization depends on normalized membership. | Current |
| rolesByEmail | map<string,string> | No | Access-type lookup by organizer email. | `src/services/accessManagementService.js` | `src/utils/accessRoles.js` | Medium. UI role labels and capabilities use it. | Current |
| approvedOrganizerRecords | map<string,map> | No | Organizer metadata keyed by normalized email. | `src/services/accessManagementService.js` | `src/utils/accessRoles.js`, `src/pages/SettingsPage.jsx` | High. Status, access type, date added, and removal state live here. | Current |
| approvedOrganizerRecords.{email}.email | string | Yes when record exists | Canonical organizer email. | `src/services/accessManagementService.js` | `src/pages/SettingsPage.jsx` | High. Must match normalized allowlist identity. | Current |
| approvedOrganizerRecords.{email}.accessType | string | No | Owner-facing access type label such as `admin` or `organizer`. | `src/services/accessManagementService.js` | `src/utils/accessRoles.js`, `src/pages/SettingsPage.jsx` | Medium. Drives capability display. | Current |
| approvedOrganizerRecords.{email}.status | string | Yes when record exists | Organizer lifecycle state such as active, disabled, restored, or removed. | `src/services/accessManagementService.js` | `src/utils/accessRoles.js`, `src/pages/SettingsPage.jsx` | High. Only active records should authorize. | Current |
| approvedOrganizerRecords.{email}.addedAt | timestamp/string | No | Date the organizer was first added, when available. | `src/services/accessManagementService.js` | `src/pages/SettingsPage.jsx` | Low. Audit/display field. | Current |
| approvedOrganizerRecords.{email}.updatedAt | timestamp/string | No | Most recent status or metadata change time. | `src/services/accessManagementService.js` | `src/pages/SettingsPage.jsx` | Low. Operational history support. | Current |
| updatedAt | timestamp | No | Last document-level mutation time. | `src/services/accessManagementService.js` | Settings diagnostics | Medium. Useful for change review. | Current |
| updatedBy | string | No | UID or email of last mutating actor. | `src/services/accessManagementService.js` | Settings diagnostics | Medium. Audit-adjacent metadata. | Current |

## settings/integrations

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| integrations | map<string,map> | Yes | Supported integration states grouped by integration key. | `src/services/integrationSettingsService.js` | `src/pages/SettingsPage.jsx` | High. Must remain owner-managed, truthfully displayed, and non-authorizing. | Current |
| integrations.{key}.status | string | No | Human-readable integration state such as connected, disconnected, disabled, or not configured. | `src/services/integrationSettingsService.js` | `src/pages/SettingsPage.jsx` | Medium. Owner-facing operational truth. | Current |
| integrations.{key}.updatedAt | timestamp | No | Per-integration last update time. | `src/services/integrationSettingsService.js` | `src/pages/SettingsPage.jsx` | Low. Review aid. | Current |
| integrations.{key}.updatedBy | string | No | Actor who changed that integration state. | `src/services/integrationSettingsService.js` | `src/pages/SettingsPage.jsx` | Low. Traceability only. | Current |
| updatedAt | timestamp | No | Last full settings update time. | `src/services/integrationSettingsService.js` | `src/pages/SettingsPage.jsx` | Low | Current |
| updatedBy | string | No | Last mutating actor. | `src/services/integrationSettingsService.js` | `src/pages/SettingsPage.jsx` | Low | Current |

## events/{eventId}

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| eventId | string | Yes | Stable event document identifier. | `src/services/eventService.js` | Most event-scoped pages | High. Route and scope anchor. | Current |
| eventName | string | Yes | Primary event title. | `src/services/eventService.js` | Shell, Events, Overview, imports, reports | Medium. Working Event visibility depends on it. | Current |
| eventDate | string/timestamp | Yes | Event date used for sorting and readiness. | `src/services/eventService.js` | Events, Overview, shell, reports | Medium | Current |
| status | string | Yes | Event lifecycle state such as draft, registration-open, live, or completed. | `src/services/eventService.js` | Events, Overview, shell | High. Controls organizer interpretation. | Current |
| venueName | string | No | Venue label. | `src/services/eventService.js` | Events, Overview, runbooks | Low | Current |
| location | string | No | Address or place description. | `src/services/eventService.js` | Events, Overview | Low | Current |
| timezone | string | No | Event timezone. | `src/services/eventService.js` | Event utilities | Medium. Schedule calculations depend on it. | Current |
| currency | string | No | Default finance currency code. | `src/services/eventService.js` | Payments, Overview, Operations | Medium | Current |
| capacity | number | No | Planned guest capacity. | `src/services/eventService.js` | Overview, review metrics | Low | Current |
| category | string | No | Event category or type. | `src/services/eventService.js` | Events, tutorial, capability defaults | Medium | Current |
| capabilities | map | No | Feature switches/defaults by event. | `src/services/eventService.js` | Events, route logic, tutorial | High. Rules validate supported shape. | Current |
| createdAt | timestamp | No | Creation time. | `src/services/eventService.js` | Events sorting/history | Low | Current |
| createdBy | string | No | Creator identity. | `src/services/eventService.js` | Audit context | Low | Current |
| updatedAt | timestamp | No | Last edit time. | `src/services/eventService.js` | Events, reports | Low | Current |
| updatedBy | string | No | Last editor identity. | `src/services/eventService.js` | Audit context | Low | Current |

## events/{eventId}/staffAssignments/{uid}

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| uid | string | Yes | Assigned Firebase UID. | `src/services/staffManagementService.js` | `src/auth/AuthProvider.jsx`, Settings | High. Must match document id and auth UID in rules. | Current |
| eventId | string | Yes | Assigned event scope. | `src/services/staffManagementService.js` | AuthProvider, Settings | High. Assignment scoping depends on it. | Current |
| email | string | No | Staff email display/search field. | `src/services/staffManagementService.js` | Settings | Medium | Current |
| displayName | string | No | Staff display label. | `src/services/staffManagementService.js` | Settings | Low | Current |
| role | string | Yes | Assignment role such as scanner, viewer, event-manager, or operations-helper. | `src/services/staffManagementService.js` | AuthProvider, route access, Settings | High. Capabilities depend on role. | Current |
| status | string | Yes | Assignment state, typically `active` or disabled/removed variant. | `src/services/staffManagementService.js` | AuthProvider, Settings | High. Only active assignments should authorize. | Current |
| assignedAt | timestamp | No | When assignment was created. | `src/services/staffManagementService.js` | Settings history | Low | Current |
| assignedBy | string | No | Actor creating assignment. | `src/services/staffManagementService.js` | Settings history | Low | Current |
| updatedAt | timestamp | No | Last assignment change time. | `src/services/staffManagementService.js` | Settings | Low | Current |
| updatedBy | string | No | Last mutating actor. | `src/services/staffManagementService.js` | Settings | Low | Current |

## staffProfiles/{uid}

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| uid | string | Yes | Staff Firebase UID. | `src/services/staffManagementService.js` | AuthProvider, Settings | High. Must match auth UID in rules. | Current |
| email | string | Yes | Staff email. | `src/services/staffManagementService.js` | AuthProvider, Settings | Medium | Current |
| displayName | string | No | Staff label. | `src/services/staffManagementService.js` | AuthProvider, Settings | Low | Current |
| status | string | Yes | Global staff profile state. | `src/services/staffManagementService.js` | AuthProvider, Settings | High. Inactive profiles should not authorize. | Current |
| accessType | string | No | Owner-facing classification for staff profile. | `src/services/staffManagementService.js` | Settings | Low | Current |
| notes | string | No | Owner-maintained operational note. | `src/services/staffManagementService.js` | Settings | Low | Current |
| createdAt | timestamp | No | Creation time. | `src/services/staffManagementService.js` | Settings | Low | Current |
| updatedAt | timestamp | No | Last change time. | `src/services/staffManagementService.js` | Settings | Low | Current |

## events/{eventId}/tasks/{taskId}

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| taskId | string | Yes | Stable task identifier. | `src/services/taskService.js` | Tasks page, dashboard readiness | Medium | Current |
| eventId | string | Yes | Event scope. | `src/services/taskService.js` | Tasks, dashboard, audits | High | Current |
| title | string | Yes | Task name. | `src/services/taskService.js` | Tasks, dashboard, readiness | Medium | Current |
| description | string | No | Task detail text. | `src/services/taskService.js` | Tasks | Low | Current |
| status | string | Yes | Workflow state. | `src/services/taskService.js` | Tasks, readiness | High. Rules validate allowed values. | Current |
| priority | string | No | Priority grouping. | `src/services/taskService.js` | Tasks, dashboard | Medium | Current |
| dueDate | string/timestamp | No | Due date. | `src/services/taskService.js` | Tasks, dashboard | Medium | Current |
| assigneeName | string | No | Human assignee label. | `src/services/taskService.js` | Tasks | Low | Current |
| linkedResourceId | string | No | Resource relationship if created from another module. | Task prefill helpers | Tasks | Medium | Current |
| linkedRunOfShowId | string | No | Run-of-show relationship if created from another module. | Task prefill helpers | Tasks | Medium | Current |
| createdAt | timestamp | No | Creation time. | `src/services/taskService.js` | Tasks | Low | Current |
| updatedAt | timestamp | No | Last edit time. | `src/services/taskService.js` | Tasks | Low | Current |

## registrations/{registrationId}

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| registrationId | string | Yes | Stable registration identifier. | `src/services/registrationService.js`, `src/services/importService.js` | Registrations, payments, tickets, check-in, communications | High | Current |
| eventId | string | Yes | Event scope. | Registration and import services | Most organizer modules | High. Event scoping and rule queries depend on it. | Current |
| sourceRowId | string | No | Deterministic import lineage identifier. | `src/services/importService.js` | Imports, duplicate detection | Medium | Current |
| fullName | string | Yes | Primary attendee or booking name. | Registration/import services | Registrations, tickets, check-in, communications, audits | Medium | Current |
| buyerName | string | No | Purchaser label when different from attendee. | Import and registration services | Registrations, payments, communications | Low | Current |
| attendeeNames | list<string> | No | Group attendee names. | Import helpers | Registrations, communications | Low | Current |
| email | string | No | Guest contact email. | Registration/import services | Registrations, communications, payments | Medium | Current |
| phone | string | No | Guest contact phone. | Registration/import services | Registrations, communications | Medium | Current |
| groupName | string | No | Group booking grouping. | Registration/import services | Registrations, communications | Low | Current |
| personsAttending | number | Yes | Guest count for the record. | Registration/import services | Overview, registrations, check-in, capacity metrics | High. Summary totals use it. | Current |
| registrationStatus | string | No | Organizer-facing registration lifecycle. | Registration service | Registrations, reports | Medium | Current |
| paymentStatus | string | Yes | Finance classification such as paid, pending, complimentary, or door. | Registration/import/finance services | Payments, overview, communications, check-in helper lists | High | Current |
| amountDue | number | No | Expected amount. | Registration/import services | Payments, reports | Medium | Current |
| amountPaid | number | No | Recorded amount collected. | Registration/import/finance services | Payments, reports | Medium | Current |
| paymentMethod | string | No | Payment evidence method. | Registration/import/finance services | Payments, reconciliation | Medium | Current |
| paymentReference | string | No | Human-entered payment trace id. | Registration/import/finance services | Payments, reconciliation | Medium | Current |
| ticketStatus | string | No | Ticket lifecycle state. | `src/services/ticketService.js` | Tickets, check-in, reports | High | Current |
| ticketCode | string | No | QR-safe ticket code. | `src/services/ticketService.js` | Tickets, QR, check-in | High. Must remain event-safe and unique. | Current |
| ticketAssignedAt | timestamp | No | Ticket assignment time. | `src/services/ticketService.js` | Tickets, audits | Low | Current |
| ticketAssignedBy | string | No | Ticket assigning actor. | `src/services/ticketService.js` | Tickets, audits | Low | Current |
| checkedIn | boolean | No | Attendance state. | `src/services/ticketService.js` narrow update paths | Check-In, dashboard, reports | High. Scanner path is deliberately narrow. | Current |
| checkInTime | timestamp | No | Check-in timestamp. | Ticket/check-in service | Check-In, audits | High | Current |
| checkedInBy | string | No | Actor who completed check-in. | Ticket/check-in service | Check-In, audits | High | Current |
| historicalAttendanceStatus | string | No | Non-scanner attendance evidence marker. | Historical attendance helpers | Reports/review only | Medium | Legacy-tolerant |
| notes | string | No | Organizer notes. | Registration/import services | Registrations, reports | Low | Current |
| createdAt | timestamp | No | Creation time. | Registration/import services | Registrations, reports | Low | Current |
| updatedAt | timestamp | No | Last update time. | Registration/import/ticket/check-in services | Registrations, reports, audits | Low | Current |

## auditLogs/{logId}

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| logId | string | Yes | Stable audit entry id. | Audit-coupled write services | QA, review flows | High. Append-only evidence key. | Current |
| eventId | string | Yes | Event scope for the change. | All audited write services | QA, reports, troubleshooting | High | Current |
| targetType | string | Yes | Changed entity type such as registration, operationsLedger, contactLink, runOfShow, or resource. | Audited write services | QA, troubleshooting | High | Current |
| targetId | string | Yes | Changed entity identifier. | Audited write services | QA, troubleshooting | High | Current |
| action | string | Yes | Action code such as create, update, delete, assign-ticket, check-in, or undo-check-in. | Audited write services | QA, troubleshooting | High | Current |
| timestamp | timestamp | Yes | Action time. | Audited write services | QA, troubleshooting | Medium | Current |
| performedBy | string | Yes | Actor UID/email display token. | Audited write services | QA, troubleshooting | High | Current |
| details | map | No | Action-specific evidence payload. | Audited write services | QA, troubleshooting | High. Rules validate that details match the mutation. | Current |

## operationsLedger/{ledgerEntryId}

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| ledgerEntryId | string | Yes | Stable ledger row id. | `src/services/operationsLedgerService.js` | Operations, dashboard, reconciliation | High | Current |
| eventId | string | Yes | Event scope. | Operations service | Operations, dashboard, reconciliation | High | Current |
| type | string | Yes | Operations classification such as expense, commitment, partner, supplier, or in-kind support. | Operations service | Operations, reports | Medium | Current |
| status | string | Yes | Row status. | Operations service | Operations, dashboard | Medium | Current |
| label | string | Yes | Primary row name/description. | Operations service | Operations | Medium | Current |
| amount | number | No | Monetary amount when applicable. | Operations service | Operations, reconciliation, dashboard | Medium | Current |
| counterpartyName | string | No | Supplier/partner name. | Operations service | Operations | Low | Current |
| dueDate | string/timestamp | No | Date-linked operational commitment. | Operations service | Operations | Low | Current |
| notes | string | No | Owner note field. | Operations service | Operations | Low | Current |
| createdAt | timestamp | No | Creation time. | Operations service | Operations | Low | Current |
| updatedAt | timestamp | No | Last change time. | Operations service | Operations, audits | Low | Current |

## events/{eventId}/documents/{documentId}

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| documentId | string | Yes | Stable document reference id. | `src/services/documentService.js` | Documents page, linked workflows | Medium | Current |
| eventId | string | Yes | Event scope. | Document service | Documents | High | Current |
| title | string | Yes | Reference title. | Document service | Documents | Medium | Current |
| category | string | No | Document category. | Document service | Documents filters | Medium | Current |
| status | string | No | Document status. | Document service | Documents | Medium | Current |
| url | string | Yes | External or internal reference URL. | Document service | Documents | High. URL validation protects integrity. | Current |
| expiresOn | string/timestamp | No | Expiry/review date. | Document service | Documents | Low | Current |
| linkedTaskId | string | No | Task relationship. | Document service/task prefill | Documents, tasks | Medium | Current |
| notes | string | No | Operational note. | Document service | Documents | Low | Current |
| createdAt | timestamp | No | Creation time. | Document service | Documents | Low | Current |
| updatedAt | timestamp | No | Last update time. | Document service | Documents | Low | Current |

## events/{eventId}/runOfShow/{itemId}

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| itemId | string | Yes | Stable run item id. | `src/services/runOfShowService.js` | Run of Show, dashboard | Medium | Current |
| eventId | string | Yes | Event scope. | Run of Show service | Run of Show, dashboard | High | Current |
| title | string | Yes | Sequence item label. | Run of Show service | Run of Show, dashboard | Medium | Current |
| startTime | string | Yes | Planned start time. | Run of Show service | Run of Show | High. Rules require valid timing shape. | Current |
| endTime | string | No | Planned end time. | Run of Show service | Run of Show | Medium | Current |
| status | string | Yes | Operational state. | Run of Show service | Run of Show, dashboard | Medium | Current |
| location | string | No | On-day location. | Run of Show service | Run of Show | Low | Current |
| ownerName | string | No | Human owner/operator. | Run of Show service | Run of Show | Low | Current |
| dependencyIds | list<string> | No | Sequence dependencies. | Run of Show service | Run of Show | Medium | Current |
| linkedResourceIds | list<string> | No | Resource relationships. | Run of Show service | Run of Show, resources | Medium | Current |
| notes | string | No | Event-day note. | Run of Show service | Run of Show | Low | Current |
| createdAt | timestamp | No | Creation time. | Run of Show service | Run of Show | Low | Current |
| updatedAt | timestamp | No | Last update time. | Run of Show service | Run of Show | Low | Current |

## events/{eventId}/resources/{resourceId}

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| resourceId | string | Yes | Stable resource record id. | `src/services/eventResourceService.js` | Resources, dashboard, run-of-show links | Medium | Current |
| eventId | string | Yes | Event scope. | Resource service | Resources, dashboard | High | Current |
| name | string | Yes | Resource label. | Resource service | Resources | Medium | Current |
| category | string | No | Resource type or grouping. | Resource service | Resources filters | Medium | Current |
| status | string | Yes | Packing/return/availability state. | Resource service | Resources, dashboard | Medium | Current |
| quantityRequired | number | No | Planned quantity. | Resource service | Resources | Low | Current |
| quantityConfirmed | number | No | Confirmed quantity. | Resource service | Resources | Low | Current |
| supplierName | string | No | Vendor/source label. | Resource service | Resources | Low | Current |
| pickupDate | string/timestamp | No | Pickup timing. | Resource service | Resources | Low | Current |
| returnDate | string/timestamp | No | Return timing. | Resource service | Resources | Low | Current |
| linkedTaskId | string | No | Task relationship. | Resource service/task prefill | Resources, tasks | Medium | Current |
| notes | string | No | Resource note. | Resource service | Resources | Low | Current |
| createdAt | timestamp | No | Creation time. | Resource service | Resources | Low | Current |
| updatedAt | timestamp | No | Last update time. | Resource service | Resources | Low | Current |

## contacts/{contactId}, organizations/{organizationId}, events/{eventId}/contactLinks/{linkId}

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| contactId / organizationId / linkId | string | Yes | Stable id for the record type. | `src/services/contactService.js` | Contacts page | Medium | Current |
| fullName / organizationName | string | Yes | Main display label. | Contact service | Contacts, links, tasks prefills | Medium | Current |
| email | string | No | Contact email. | Contact service | Contacts, relationships | Medium | Current |
| phone | string | No | Contact phone. | Contact service | Contacts | Medium | Current |
| category | string | No | Contact or organization classification. | Contact service | Contacts filters | Low | Current |
| notes | string | No | Owner note field. | Contact service | Contacts | Low | Current |
| eventId | Yes on link | Event-scoped relationship target. | Contact service | Contacts page | High. Link scope must match event. | Current |
| contactId / organizationId on link | string | One of them required | Target record relationship. | Contact service | Contacts page | High. Relationship integrity depends on it. | Current |
| roleLabel | string | No | Event-specific role such as sponsor, vendor, speaker, or venue contact. | Contact service | Contacts page | Medium | Current |
| status | string | No | Relationship activity state. | Contact service | Contacts page | Medium | Current |
| createdAt | timestamp | No | Creation time. | Contact service | Contacts page | Low | Current |
| updatedAt | timestamp | No | Last update time. | Contact service | Contacts page | Low | Current |

## accessRequests/{requestId}

| Field | Type | Required | Purpose | Written by | Read by | Permission/security importance | Legacy status |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| requestId | string | Yes | Access request id. | `src/services/accessRequestContract.js` workflow | Access tooling | Medium | Current |
| email | string | Yes | Requesting email. | Access request flow | Future access-review flow | High. Identity evidence. | Current |
| displayName | string | No | Human requester label. | Access request flow | Future review flow | Low | Current |
| reason | string | No | Why access is requested. | Access request flow | Future review flow | Low | Current |
| status | string | Yes | Request lifecycle state. | Access request flow or admin tooling | Future review flow | Medium | Current |
| createdAt | timestamp | No | Request time. | Access request flow | Future review flow | Low | Current |

## History collections

`settings/accessControl/history/{historyId}`, `settings/integrations/history/{historyId}`, `staffHistory/{historyId}`, and `events/{eventId}/staffAssignmentHistory/{historyId}` are append-only evidence logs. The exact shape varies by change type, but each should at minimum carry actor identity, changed entity, changed-at time, previous/next status or access value, and a reason or note when provided.
