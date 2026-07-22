# Gather & Savor Event Hub Product Guide

## Product overview

Gather & Savor Event Hub is a private React and Firebase workspace for event organizers. It manages events, registrations, registration finance, tickets, check-in, event-level Operations, communications drafts, imports, reports, settings, and system checks. It is not a public attendee site, payment processor, accounting ledger, or automatic messaging service.

All daily work is scoped to the selected Working Event. `CODEX_TEST` is the permanent synthetic QA event. Cake Piknik Barbados (CPB) contains production data and is read-only during normal QA.

## Route map

| Route | Organizer purpose |
| --- | --- |
| `/login` | Sign in with Google or the approved email/password fallback. |
| `/dashboard` | Review the selected event, finance summary, readiness, and next actions. |
| `/events` | Create, edit, select, and remove event records. |
| `/registrations` | Manage registrations, guests, finance fields, and review filters. |
| `/payments` | Review registration charges, receipts, balances, and follow-up needs. |
| `/payments/reconciliation` | Run a locked, read-only CPB workbook comparison. |
| `/imports` | Import CSV, pasted tables, and XLSX through mapping and preview. |
| `/tickets` | Assign unique ticket codes and produce ticket-code-only QR payloads. |
| `/check-in` | Search guests, confirm attendance, and use event-day helper lists. |
| `/scanner` | Isolated scanner/check-in workspace for assigned staff. |
| `/operations` | Track event-level income, expenses, commitments, refunds, and in-kind support. |
| `/event-review` | Review the final event summary and unresolved follow-up. |
| `/communications` | Filter audiences and copy message drafts; the app does not send messages. |
| `/settings` | Review account, workspace, event defaults, access, ticket, import, and advanced settings. |
| `/qa` | Run organizer checks and inspect expandable technical release evidence. |

## Authorization and data access

The protected owner is recognized by an exact, version-controlled Firebase UID in both application authorization and Firestore rules. The normalized owner email is supporting display identity, not the primary grant. The protected owner cannot be removed or disabled in Settings.

Secondary organizers are approved through the protected `settings/accessControl` document. Staff use `staffProfiles/{uid}` plus `events/{eventId}/staffAssignments/{uid}`. Scanner users remain assigned-event-only and cannot access organizer finance, imports, Settings, or audit-log mutation.

Firestore rules default to deny, validate document schemas, protect immutable identity fields, and require approved roles. Audit logs are append-only. Registration, ticket, check-in, event, and Operations writes create a matching audit record in the same batch where required.

## Organizer workflows

### Registrations and finance

Registrations are records; guests are the sum of `personsAttending`. Finance uses explicit ticket price, amount due, amount paid, and balance due. A stored zero is distinct from a missing value. Paid, Partial, Pending, Door Paid, To Pay at Door, Complimentary, and Finance Review remain distinct.

Registration payment totals never include Operations entries. Evidence classification describes documentary support and never replaces payment status.

### Operations and in-kind support

Operations tracks event-level income, expenses, commitments, refunds, adjustments, and non-cash support. Paid expenses remain separate from outstanding commitments. In-kind sponsorship has zero cash impact unless a separate, supported cash transaction exists. The Operations cash position is not final event profit.

### Tickets, QR, and check-in

Ticket codes are unique within the selected event. QR payloads remain exactly `GSV:TICKET:{ticketCode}` and contain no attendee identity or payment data. Check-in records live or scanner-confirmed attendance with an audit log. Scanner users cannot undo check-in; organizer corrections remain separate and audited.

Approximate historical attendance is displayed as aggregate evidence only. It must not be converted into individual check-ins. Named historical attendance requires a dedicated evidence-supported correction workflow.

### Import Center

The organizer workflow is: select an event, choose a source, map columns, review validation, preview changes, confirm import, and review results. CSV, pasted table, and XLSX sources share the same preview-first contract. Imports never use private browser state in automated tests.

Completed CPB backfills, consumed manifests, and old recovery Apply controls are not exposed in the normal Import Center. Historical parsers and evidence remain preserved outside the organizer workflow where still needed for audit history.

### Communications

Message Builder filters a selected-event audience, previews a draft, and copies text or a review packet. It does not send email, WhatsApp, SMS, or social posts and does not call a live AI service.

### Settings and System QA

Settings separates Account, Workspace, Event Defaults, Organizer Access, Tickets & Check-In, Data & Messages, and Advanced information. Controls state their scope and timing; unavailable functionality is not presented as editable.

System QA starts with organizer-facing status for authentication, database access, current event, workflows, data integrity, release evidence, and known issues. Technical details are expandable and must not expose tokens, credentials, attendee data, or the complete organizer allowlist.

## Evidence reconciliation

CPB reconciliation is evidence-sensitive and approval-gated. Missing values are not converted to zero, zero is not automatically complimentary, and ambiguous identities are never guessed. Production corrections require an exact record, before snapshot, drift check, narrow fields, explicit authorization, and append-only audit evidence.

Phase 23N registration/attendance Subsets 5 and 6 remain locked. Christina Morris, Paula Gittens, Rossy Donawa, and the organizer-described Flour Mill attendee require exact identity/payment evidence before any registration or attendance correction.

## Product QA

Run the fast release gate:

```powershell
npm run product:qa
```

It runs lint, unit tests, Firestore emulator rules tests, the route smoke test, build, production dependency audit, changed-scope React Doctor, copy scan, and route inventory.

Run the complete local audit:

```powershell
npm run product:audit
```

It adds full emulator-backed workflows, all-route axe checks, the nine-viewport responsive matrix, full React Doctor, bundle reporting, documentation checks, and legacy-control checks. E2E uses only local Auth and Firestore emulators with synthetic records.

React Doctor must report zero errors and no unexplained changed-scope regression. Production dependencies must report zero vulnerabilities. The Java 17 warning from `firebase-tools@14.19.0` is expected locally; move to Java 21 before upgrading to Firebase CLI 15.

## Monitoring and release

Sentry is optional and initializes only when `VITE_SENTRY_DSN` is configured. User information and request bodies are not enabled by default. Route code and Sentry load lazily to keep the initial application bundle small.

Release steps are: update the feature branch from `main`, run `product:qa` and `product:audit`, inspect Git scope, merge without force-push, push `main`, deploy Hosting, deploy Firestore rules only when reviewed rules changed, and complete authenticated production smoke. Do not deploy indexes, Functions, Storage, or Auth configuration without a demonstrated separate need.

The repository includes Dependabot configuration and CodeQL analysis configuration. CodeQL CI is not active until a repository administrator with workflow scope installs and pushes the workflow file.

## Current limitations

- Google Sheets OAuth is not implemented; use CSV export.
- Messaging is copy-only and does not send automatically.
- The prompt builder does not call a live AI API.
- No public attendee portal, payment gateway, native app, or broad staff-management workflow is active.
- Historical CPB identity and attendance questions remain evidence-gated.

Historical implementation records are indexed in [HISTORICAL_ARCHIVE_INDEX.md](./HISTORICAL_ARCHIVE_INDEX.md).
