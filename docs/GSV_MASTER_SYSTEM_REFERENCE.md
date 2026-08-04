# Gather & Savor Master System Reference

Last updated: 2026-08-04.

## Product

Gather & Savor Event Hub is a private internal event-operations web application. It is not a public guest portal, vendor portal, CRM, payment gateway, native app, or public marketing site.

## Runtime

- Firebase project: `gathervibeshub`.
- Production URL: `https://gathervibeshub.web.app`.
- Local URL: `http://localhost:4173`.
- Frontend: React 19, Vite, Firebase Web SDK, Tailwind CSS.
- Hosting: Firebase Hosting, SPA rewrite to `/index.html`.
- Robots policy: private admin app, `robots.txt` contains `Disallow: /`.

## Auth And Access

- Protected Owner UID: `WcDU2jmbopdAgDlMMWvD3TkqqbC3`.
- Protected Owner email: `jaylanspencer99@gmail.com`.
- Protected Owner access is UID-based and independent of mutable lower-role assignments.
- Approved organizer access is authenticated and authorized.
- Staff/scanner access uses `staffProfiles/{uid}` plus `events/{eventId}/staffAssignments/{uid}`.
- Normal scanner users are assigned-event-only and do not have Undo Check-In or Check Out.

## Events

- Current synthetic QA/training event: `CODEX_DEMO - Full System Walkthrough`.
- CODEX_DEMO event ID: `codex_demo_full_system_walkthrough`.
- Retired historical QA event: `CODEX_TEST Live Verification Event` / `xPfa0b3KZyLSDnAD2uGI`.
- CPB event ID: `zhaPxi31cpqLAW0cuS20`.
- CPB is a normal completed real event. Completed status does not by itself make a real event read-only.
- CPB must not receive synthetic QA writes.

## Routes

- `/dashboard`: Overview.
- `/events`: Events.
- `/tasks`: Tasks.
- `/registrations`: Guests & Registrations.
- `/payments`: Payments.
- `/payments/reconciliation`: Payment Reconciliation.
- `/imports`: Import Center.
- `/tickets`: Tickets.
- `/check-in`: Check-In.
- `/operations`: Operations.
- `/run-of-show`: Run of Show.
- `/resources`: Resources.
- `/documents`: Documents.
- `/contacts`: Contacts.
- `/event-review`: Reports.
- `/communications`: Message Builder.
- `/settings`: Settings.
- `/qa`: System QA.
- `/scanner`: Scanner.

## Feature Boundaries

- Working Event scopes event-specific organizer workflows.
- Registration and guest counts remain distinct.
- Registration payments and Operations Ledger records remain separate.
- Message Builder creates copyable messages only; it does not send email, WhatsApp, or AI messages.
- Import Center is preview-first and supports CSV, pasted tables, and XLSX through `read-excel-file`.
- QR payload remains `GSV:TICKET:{ticketCode}` and must not include private guest data.
- Google Forms receiver material is present but not a deployed Cloud Function in this repository.
- Public portal, payment gateway, live AI API, Gmail/Outlook OAuth sending, and native app work are not active.

## Firestore Path Map

- `settings/accessControl`: approved organizer access data.
- `events/{eventId}`: event records and configuration.
- `events/{eventId}/staffAssignments/{uid}`: event-scoped staff/scanner assignments.
- `events/{eventId}/tasks/{taskId}`: event tasks.
- `events/{eventId}/documents/{documentId}`: event document references.
- `events/{eventId}/runOfShow/{itemId}`: event-day sequence.
- `events/{eventId}/resources/{resourceId}`: event resources/equipment.
- `events/{eventId}/contactLinks/{linkId}`: event contact relationships.
- `registrations/{registrationId}`: registrations and guest/payment/ticket/check-in fields.
- `operationsLedger/{ledgerEntryId}`: event-level income, expenses, commitments, refunds, and adjustments.
- `contacts/{contactId}` and `organizations/{organizationId}`: contact directory.
- `auditLogs/{logId}`: append-only audit evidence.
- `accessRequests/{requestId}`: disabled/non-live access workflow contract.
- `staffProfiles/{uid}`: staff profile records.
- `staffProfiles/{uid}/preferences/onboarding`: guided tutorial preferences.

## Engineering Requirements

- Preserve default-deny Firestore posture.
- Keep Rules, services, UI, tests, and docs aligned.
- Keep append-only audit logs.
- Keep existing legitimate records compatible when schemas evolve.
- Do not bulk-migrate real production data without explicit approval.
- Keep `xlsx` absent and `read-excel-file` present.
- Deploy Hosting only for app-source changes. Deploy Firestore Rules only when Rules intentionally change and emulator tests pass.
