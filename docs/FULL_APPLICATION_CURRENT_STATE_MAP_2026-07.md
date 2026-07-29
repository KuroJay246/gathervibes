# Full Application Current State Map

Date: 2026-07-29
Repository: `C:\Users\Jaylan\Documents\gathetr`
Branch: `codex/full-current-state-application-map`
Base commit inspected: `a89e60b88068c350ebbf63735754e24577a40b58`
Firebase project: `gathervibeshub`
Production URL: `https://gathervibeshub.web.app`
Canonical local URL: `http://localhost:4173`

## Scope

This is a source-grounded application map of the Gather & Savor Event Hub as it exists on the current local `main` line. It is not a redesign, implementation phase, deployment package, or production data write package.

No app behavior files were changed for this artifact. No Firestore rules, indexes, Firebase Authentication configuration, Functions, Storage, production data, QR payload, scanner permissions, or access-control data were changed.

## Git Position

Current local `main` is not identical to `origin/main`.

- Local `main`: `a89e60b88068c350ebbf63735754e24577a40b58`
- `origin/main`: `545e10f9497dbd0abb0866be9db763ce0eca56c0`
- Local-only commit on `main`: `a89e60b Run Daily QA locally instead of scheduled GitHub Actions`

This branch was created from local `main`, so it includes that local-only workflow-history commit. The workflow change is not pushed to GitHub because previous push authority did not include workflow scope. This audit does not rewrite or force-push history.

## Product Summary

Gather & Savor Event Hub is a private internal event-operations workspace for organizers. It supports event planning, registration records, registration finance, ticket assignment, event-day check-in, event-level Operations ledger records, copy-only messages, import review, read-only event reporting, practical settings, and system QA.

The app is not currently a public guest portal, vendor portal, payment gateway, CRM, native app, accounting system, automatic email sender, WhatsApp sender, or live AI system.

## Application Shell

The app uses `src/App.jsx` for route ownership and lazy page loading. Authenticated routes are wrapped by `ProtectedRoute`. Most organizer routes render inside `AppShell`; `/scanner` is isolated outside the organizer shell and is additionally wrapped by `AssignedEventGate`.

`AppShell` owns:

- Desktop sidebar navigation.
- Mobile bottom tab bar.
- Mobile More drawer.
- Page title/subtitle mapping.
- Working Event context strip.
- Admin search visibility.
- Onboarding welcome and walkthrough modals.

The organizer navigation has already moved to product language:

- Overview
- Events
- Guests & Registrations
- Payments
- Tickets
- Check-In
- Operations
- Message Builder
- Reports
- Import Center
- Settings
- System QA

## Route Inventory

Automated route inventory passed with 15 routes and 12 navigation labels.

| Path | Shell | Main label | Purpose | Access notes |
| --- | --- | --- | --- | --- |
| `/` | AppShell | Redirect | Redirects to `/dashboard` | Protected |
| `/login` | none | Login | Google and email/password sign-in | Public auth entry |
| `/security` | none | Redirect | Redirects to `/settings` | Legacy compatibility |
| `/dashboard` | AppShell | Overview | Current event status, priorities, metrics | Organizer |
| `/events` | AppShell | Events | Event list, event form, Working Event selection | Organizer/admin |
| `/registrations` | AppShell | Guests & Registrations | Registration CRUD, filters, finance fields, import link | Organizer/admin |
| `/payments` | AppShell | Payments | Registration payment review and follow-up | AssignedEventGate |
| `/payments/reconciliation` | AppShell | Reconciliation Preview | Read-only CPB payment audit comparison | Organizer/admin |
| `/imports` | AppShell | Import Center | CSV/XLSX/pasted-row import preview | Organizer/admin |
| `/tickets` | AppShell | Tickets | Ticket assignment and QR preparation | Organizer/admin |
| `/check-in` | AppShell | Check-In | Organizer check-in workflow | AssignedEventGate |
| `/scanner` | no AppShell | Scanner | Assigned-event scanner workflow | Isolated staff route |
| `/operations` | AppShell | Operations | Event-level ledger and obligations | AssignedEventGate |
| `/event-review` | AppShell | Reports | Read-only event report and follow-up | Organizer/admin |
| `/communications` | AppShell | Message Builder | Create and copy messages | Organizer/admin |
| `/settings` | AppShell | Settings | Practical preferences and access summary | Organizer/admin |
| `/qa` | AppShell | System QA | Diagnostics and safe QA guidance | Organizer/admin |
| `*` | none | Not Found | Unknown route fallback | Public fallback |

## Current Daily Workflow

GitHub Actions Daily QA is currently manual-only:

- Trigger: `workflow_dispatch`
- Permissions: `contents: read`
- Runner: `ubuntu-latest`
- Steps: checkout, setup-node, `npm ci`, lint, test, build, built auth UI smoke, live HTTP smoke, read-only write-smoke policy note.

There is no active cron schedule in `.github/workflows/daily-qa.yml`. The matching local script is `npm run daily:qa`.

## Current Product Strengths

- Route naming now matches organizer language more closely than older phase-language builds.
- Scanner access is isolated from organizer navigation.
- Working Event context is visible across organizer routes.
- Registration payments and Operations are separate product surfaces.
- Message Builder is explicitly copy-only and does not claim automatic sending.
- System QA is separated from daily work in the desktop sidebar and mobile More drawer.
- Firebase rules remain default-deny with explicit allow paths.
- QR payload remains `GSV:TICKET:{ticketCode}`.

## Current Product Risks And Friction

- Local `main` and `origin/main` are not aligned, so release planning should not assume the remote contains the local Daily QA workflow update.
- Current onboarding on `main` remains modal-route-walkthrough based and includes hardcoded Anica success copy. The richer tutorial branch exists separately but is not merged here.
- Mobile bottom navigation can duplicate Check-In for a role that can view `/check-in` but cannot view `/dashboard`, because Check-In is conditionally added once for scanner-like access and again unconditionally when `/check-in` is viewable.
- Several current product areas still contain CPB-specific explanatory panels or historical audit context. These are useful for safety, but they can make the product feel less event-agnostic.
- Operations, Payments, and Reports explain important financial boundaries, but the overall mental model still needs tighter separation between registration finance, event-level ledger records, and reconciliation history.
- Some pages intentionally use horizontally scrollable tables or tab strips; this is acceptable when contained, but should remain a responsive QA focus.

## Evidence

Private evidence for this audit is tracked in `output/current-state-application-map/`.

This run is primarily source-and-validation grounded. Prior authenticated production evidence exists in `docs/FULL_STACK_PRODUCT_REALITY_AUDIT_2026-07.md`, including a route matrix and responsive acceptance against `CODEX_TEST Live Verification Event`. This audit did not perform new production writes and did not select or modify CPB.

## Related Detailed Maps

- `docs/PAGE_BY_PAGE_LAYOUT_AND_CODE_MAP_2026-07.md`
- `docs/DATA_MODEL_SECURITY_AND_INTEGRATION_MAP_2026-07.md`
- `docs/EVENT_AGNOSTIC_ARCHITECTURE_ASSESSMENT_2026-07.md`
- `docs/KNOWN_PRODUCT_AND_DATA_DISCREPANCIES_2026-07.md`
