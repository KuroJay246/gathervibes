# Gather & Savor Event Hub

Private internal event-operations system for Gather & Savor organizers.

## Current Truth

- Production Firebase project: `gathervibeshub`.
- Production URL: `https://gathervibeshub.web.app`.
- Local app URL: `http://localhost:4173`.
- Protected Owner UID: `WcDU2jmbopdAgDlMMWvD3TkqqbC3`.
- Protected Owner email: `jaylanspencer99@gmail.com`.
- Permanent synthetic QA/training event: `CODEX_DEMO - Full System Walkthrough`.
- CODEX_DEMO event ID: `codex_demo_full_system_walkthrough`.
- Retired historical QA event: `CODEX_TEST Live Verification Event` / `xPfa0b3KZyLSDnAD2uGI`.
- Cake Piknik Barbados event ID: `zhaPxi31cpqLAW0cuS20`.
- CPB is a normal completed real event protected by standard safeguards. Do not use CPB for synthetic QA writes.
- QR payload format remains `GSV:TICKET:{ticketCode}`.
- Message Builder is copy-only. It does not send email, WhatsApp, or AI-generated messages.
- `xlsx` must remain absent. `read-excel-file` is the XLSX parser.

## Start Here

Read these first:

- [AI_AGENT_RULES.md](./AI_AGENT_RULES.md)
- [PROJECT_HANDOFF.md](./PROJECT_HANDOFF.md)
- [docs/GSV_MASTER_SYSTEM_REFERENCE.md](./docs/GSV_MASTER_SYSTEM_REFERENCE.md)
- [docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md](./docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md)
- [docs/PRODUCT_GUIDE.md](./docs/PRODUCT_GUIDE.md)
- [docs/ROUTE_MAP.md](./docs/ROUTE_MAP.md)
- [docs/HISTORICAL_ARCHIVE_INDEX.md](./docs/HISTORICAL_ARCHIVE_INDEX.md)

Historical phase reports, old audits, and release notes are archived under `docs/archive/`. They are evidence, not current operating instructions.

## Product Areas

- Overview: `/dashboard`
- Events: `/events`
- Tasks: `/tasks`
- Guests & Registrations: `/registrations`
- Payments: `/payments`
- Payment Reconciliation: `/payments/reconciliation`
- Import Center: `/imports`
- Tickets: `/tickets`
- Check-In: `/check-in`
- Operations: `/operations`
- Run of Show: `/run-of-show`
- Resources: `/resources`
- Documents: `/documents`
- Contacts: `/contacts`
- Reports: `/event-review`
- Message Builder: `/communications`
- Settings: `/settings`
- System QA: `/qa`
- Scanner: `/scanner`

## Standard Commands

```bash
npm ci
npm run lint
npm test
npm run build
npm run product:routes
npm run product:qa
npm run e2e:smoke
npm run e2e:full
npm audit --omit=dev
npm ls xlsx
npm ls read-excel-file
npm run doctor:json
```

## Deployment Boundary

Deploy Hosting only for application-source changes that require a new web build:

```bash
npx firebase-tools deploy --only hosting --project gathervibeshub
```

Do not deploy Firestore Rules, indexes, Functions, Storage, or Auth configuration unless that target was intentionally changed, validated, and approved.

## Permanent Engineering Standard

When changing persistent data behavior, support existing legitimate records. Do not implement only for newly created demo records. Check old records, import paths, reports, rules, services, audit logs, and UI workflows for compatibility before calling a change complete.
