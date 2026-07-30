# Current Product Capability Matrix - 2026-07

Audit branch: `codex/full-repository-product-audit-2026-07`  
Release baseline: `f65aeba9bcf5f44372f7a49816386cef547ebb46`  
Evidence root: `output/full-repository-audit/`

## Classification Summary

| Classification | Count | Meaning |
| --- | ---: | --- |
| Fully operational | 17 | Implemented, routed, validated by source/tests and supported by production evidence. |
| Operational with limitations | 12 | Usable, but has known workflow, verification, scale, copy, or tooling limitations. |
| Manual workflow | 4 | Product-supported only through human/operator action; no automatic service is active. |
| Packaged but undeployed | 1 | Code/package exists, but production deployment or secret wiring is not verified. |
| Disconnected | 4 | Organizer-facing integration is not live and must not be represented as automatic. |
| Unsupported | 1 | Not currently a shipped product capability. |

## Capability Matrix

| Capability | Route / Surface | Current State | Evidence | Notes |
| --- | --- | --- | --- | --- |
| Authentication | App shell | Fully operational | Route and production console passes | Approved organizer sign-in is required for organizer surfaces. |
| Organizer authorization | App shell | Fully operational | Role/rules audit, production route checks | Approved organizers are the only normal admin operators. |
| Staff/scanner boundaries | Scanner routes | Operational with limitations | Role/rules consistency audit | Scanner boundaries remain assigned-event-only; no normal Undo Check-In or Check Out. |
| Event management | `/events` | Fully operational | Route matrix, browser evidence | Real events, including completed events, remain editable through normal validation and audit safeguards. |
| Completed event handling | `/events` | Fully operational | Pass 4 release readiness | Cake Piknik Barbados is a normal completed real event, not a special protected event. |
| Test event handling | `/events` | Fully operational | `codex-test-visibility.json` | CODEX_TEST is the only special QA/test event and is hidden from normal event lists by default. |
| Registrations | `/registrations` | Fully operational | Registration data-integrity audit | Registration records and guest counts remain distinct. |
| Guest totals | Dashboard, Reports, Check-In | Fully operational | Registration and reports audits | Guest totals are derived from `personsAttending`. |
| Registration Payments | `/registrations`, Reports | Operational with limitations | Registration payments audit | Payment totals are registration finance records, not Operations Ledger totals. |
| Payment Reconciliation | `/registrations`, Reports | Manual workflow | Reports and reconciliation audit | Reconciliation is selected-event scoped and still needs a focused product phase. |
| Tickets | `/tickets` | Fully operational | Ticket and QR audit | Ticket assignment/status is implemented. |
| QR payload | Tickets, scanner | Fully operational | Ticket and QR audit | Payload remains `GSV:TICKET:{ticketCode}`. |
| Check-In | `/check-in` | Fully operational | Check-In audit | Event-day check-in works with registration-level attendance limits documented. |
| Scanner | `/scanner` | Fully operational | Role/rules and scanner boundary audits | Scanner remains isolated from organizer/admin shell. |
| Historical attendance | Check-In / Reports | Manual workflow | Check-In and Reports audits | Historical attendance corrections require organizer/operator care. |
| Operations Ledger | `/operations` | Operational with limitations | Operations calculation audit | Event-level income, expenses, refunds, reimbursements, commitments, and adjustments are separate from registration payments. |
| Sponsor/vendor commitments | `/operations` | Operational with limitations | Operations audit | Tracked through Operations entries, not a full vendor/sponsor CRM. |
| Reports | `/event-review` | Fully operational | Reports integrity audit | Read-only reporting surface; registration payments and Operations stay separate. |
| Dashboard / Overview | `/dashboard` | Fully operational | Route matrix and browser evidence | Selected Working Event context drives totals. |
| Message Builder | `/communications` | Manual workflow | Product workflow audit | Copy-only message composition; no automatic send claim. |
| Import Center | `/imports` | Operational with limitations | Import Center audit | Import workflows have validation and duplicate controls but require careful operator review. |
| CSV import | `/imports` | Manual workflow | Import Center audit | Supported through operator file/import action. |
| pasted-row import | `/imports` | Manual workflow | Import Center audit | Supported through operator review, not automatic ingestion. |
| XLSX import | `/imports` | Operational with limitations | Dependency and import audits | `read-excel-file@9.2.0` is present; `xlsx` is absent. |
| Google Forms Response Inbox | `/imports` | Operational with limitations | Google Forms Inbox audit | Manual inbox/review capability only; not an automatic receiver. |
| Automatic Google Forms receiver | N/A | Packaged but undeployed | Integration status | Receiver package/idea exists, but production deployment/secrets are not verified. |
| Gmail integration | N/A | Disconnected | Integration status | No live Gmail OAuth/send integration. |
| Email sending | N/A | Disconnected | Message Builder audit | Messages are copied manually. |
| WhatsApp sending | N/A | Disconnected | Message Builder audit | No live WhatsApp send integration. |
| Online payments | N/A | Disconnected | Finance audits | The app records payment data but is not a payment gateway. |
| Settings | `/settings` | Fully operational | Route matrix | Contains organizer settings and system configuration surfaces. |
| System QA | `/qa` | Fully operational | Product QA validation | QA is separate from daily organizer workflow. |
| Audit logs | Data layer | Operational with limitations | Write-path audit | Append-only audit behavior is present; bulk/partial recovery needs hardening. |
| Bulk writes | Data layer | Operational with limitations | Write-path audit | Batch chunking is atomic per chunk, not all-or-nothing across a whole import. |
| Duplicate detection | Imports/registrations | Operational with limitations | Import and data-integrity audits | Present but should be tightened before high-volume CPB reconciliation work. |
| Accessibility | App-wide | Operational with limitations | Responsive/accessibility audits | No formal certification; obvious changed surfaces pass current tests. |
| Responsive layouts | App-wide | Operational with limitations | Browser screenshots and zoom attempts | Desktop/tablet/mobile evidence exists; true 200 percent browser zoom remains manual. |
| Tutorial V3 | App shell | Operational with limitations | Tutorial audits and final Browser attempt | Source/E2E evidence exists; full production human completion remains manual. |
| Production monitoring | N/A | Unsupported | Production audit | No dedicated monitoring/alerting product was verified. |

## Product Truth

The product is a private internal event-operations system. It is operational for event setup, registrations, tickets, check-in, reporting, copy-only messaging, imports, and Operations tracking. It is not a public guest portal, payment gateway, CRM, native app, automatic communications tool, or connected Gmail/WhatsApp sender.
