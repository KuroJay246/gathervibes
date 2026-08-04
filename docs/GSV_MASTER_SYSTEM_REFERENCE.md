# Gather & Savor Master System Reference

Last updated: 2026-08-04

## Current System Truth

Gather & Savor Event Hub is a private internal event-operations web app for approved organizers and scoped staff. It is not a public guest portal, vendor portal, payment gateway, CRM, native app, or automatic message-sending system.

Production is Firebase project `gathervibeshub` at `https://gathervibeshub.web.app`. Local development uses `http://localhost:4173`.

## Current Event Safety Model

- `CODEX_DEMO - Full System Walkthrough` with event ID `codex_demo_full_system_walkthrough` is the permanent synthetic QA, demo, tutorial, and reversible-write environment.
- `CODEX_TEST Live Verification Event` and ID `xPfa0b3KZyLSDnAD2uGI` are retired historical identifiers. They may remain in archived docs, old test names, or compatibility fixtures, but active instructions must use CODEX_DEMO for synthetic work.
- Cake Piknik Barbados with event ID `zhaPxi31cpqLAW0cuS20` is a normal completed real event. It must not receive synthetic QA writes. It uses the same authentication, authorization, validation, confirmation, and append-only audit safeguards as every other real event.
- Completed event status does not make an event read-only for approved organizers.

## Protected Owner

Protected Owner UID `WcDU2jmbopdAgDlMMWvD3TkqqbC3` and email `jaylanspencer99@gmail.com` must remain independently recognized for legitimate owner operations. This owner path must not depend on mutable `approvedEmails`, staff profile assignment, event assignment, viewer status, scanner status, or lower-role permissions.

## Product Structure

Organizer navigation is grouped around actual work:

- Plan: Overview, Events, Tasks & Deadlines, Contacts & Organizations, Documents.
- Guests & Attendance: Guests & Registrations, Tickets, Check-In.
- Event Day: Run of Show, Equipment & Supplies.
- Money & Follow-Up: Registration Payments, Operations & Commitments, Reports, Reconciliation Preview.
- Tools: Import Center & Response Inbox, Message Builder.
- System: Settings, System QA.

Routes are intentionally stable. Labels may be more organizer-friendly than their route paths. For example, `/communications` is Message Builder and `/event-review` is Reports.

## Data And Firestore Contract

Active paths discovered from source and rules include:

- `settings/accessControl`
- `events/{eventId}`
- `events/{eventId}/staffAssignments/{uid}`
- `events/{eventId}/tasks/{taskId}`
- `events/{eventId}/documents/{documentId}`
- `events/{eventId}/runOfShow/{itemId}`
- `events/{eventId}/resources/{resourceId}`
- `events/{eventId}/contactLinks/{linkId}`
- `registrations/{registrationId}`
- `operationsLedger/{ledgerEntryId}`
- `contacts/{contactId}`
- `organizations/{organizationId}`
- `auditLogs/{logId}`
- `accessRequests/{requestId}`
- `staffProfiles/{uid}`
- `staffProfiles/{uid}/preferences/onboarding`

Business writes must be event-scoped where applicable and paired with append-only audit evidence. Rules and services must agree before deployment. Audit logs remain create-only; update and delete are denied.

## Permanent Guardrails

- QR payload remains exactly `GSV:TICKET:{ticketCode}`.
- `xlsx` remains absent; XLSX workbook parsing uses `read-excel-file`.
- Registration payments and Operations Ledger are related reports, not one merged accounting system.
- Message Builder creates and copies messages. It does not send email, WhatsApp, SMS, or AI-generated messages through an external API.
- Scanner/check-in-only users remain assigned-event-only and do not receive normal Undo Check-In or Check Out.
- Access-request workflows remain disabled unless a future approved phase explicitly activates them with rules, services, UI, tests, and deployment evidence.
- Future behavior changes must bring forward existing records through backward-compatible reads, safe defaults, or approved migrations.

## Maintenance Policy

Future phases should update canonical documentation instead of creating another standalone Markdown report by default. Create new Markdown only for a permanent specialized standard, immutable migration evidence, compliance/legal evidence, operational tooling dependency, or content that cannot reasonably fit canonical docs.

Current canonical entrypoints are:

- `README.md`
- `AI_AGENT_RULES.md`
- `PROJECT_HANDOFF.md`
- `docs/GSV_MASTER_SYSTEM_REFERENCE.md`
- `docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md`
- `docs/PRODUCT_GUIDE.md`
- `docs/ROUTE_MAP.md`
- `docs/CODEX_DEMO_FULL_SYSTEM_WALKTHROUGH_STANDARD.md`
- `docs/PROTECTED_OWNER_APPLICATION_ACCESS_STANDARD.md`
- `docs/TUTORIAL_AND_IN_APP_GUIDANCE_MAINTENANCE_STANDARD.md`
- `docs/ORGANIZER_UNDERSTANDABILITY_AND_USABILITY_STANDARD.md`

