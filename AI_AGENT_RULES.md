# AI Agent Rules

Read this file first for every Gather & Savor task, then read `PROJECT_HANDOFF.md`, `README.md`, `docs/GSV_MASTER_SYSTEM_REFERENCE.md`, and `docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md`.

## Current Canonical Truth

- Firebase project: `gathervibeshub`.
- Production URL: `https://gathervibeshub.web.app`.
- Local URL: `http://localhost:4173`.
- Protected Owner UID: `WcDU2jmbopdAgDlMMWvD3TkqqbC3`.
- Protected Owner email: `jaylanspencer99@gmail.com`.
- Current synthetic QA/training event: `CODEX_DEMO - Full System Walkthrough`.
- CODEX_DEMO event ID: `codex_demo_full_system_walkthrough`.
- Retired historical QA event: `CODEX_TEST Live Verification Event` / `xPfa0b3KZyLSDnAD2uGI`.
- CPB event ID: `zhaPxi31cpqLAW0cuS20`.
- CPB is a normal completed real event. It is not a synthetic QA target and must not receive synthetic writes.
- QR payload must remain `GSV:TICKET:{ticketCode}`.
- `xlsx` must remain absent. `read-excel-file` remains the XLSX parser.

## Required Startup Checks

1. Confirm branch, HEAD, `origin/main`, and working-tree status.
2. Read the current task prompt and current repository docs before coding.
3. Identify whether the request affects runtime source, Firestore Rules, indexes, data, Auth, deployments, tests, docs, or production records.
4. Search for stale active documentation if behavior changes.
5. Update source, tests, docs, and product QA together when behavior changes.
6. Stop if the prompt, source, rules, tests, and active docs contradict each other.

## Security And Data Rules

- Do not weaken Firestore Rules.
- Do not expose secrets, cookies, tokens, service-account keys, or private credentials.
- Do not modify Jaylan's Firebase Auth account.
- Do not use Anica's account.
- Do not change payment, ticket, check-in, scanner, or role semantics unless explicitly requested.
- Do not deploy Firebase targets that were not intentionally changed and validated.
- Do not force-push or rewrite Git history.
- Do not delete unmerged branches or external evidence automatically.

## Access Rules

- Protected Owner access is UID-based and independent of mutable staff assignments or allowlists.
- `approvedEmails` is admin-level access only.
- Staff/scanner access is based on `staffProfiles/{uid}` plus `events/{eventId}/staffAssignments/{uid}`.
- Normal scanner users remain assigned-event-only and do not receive Undo Check-In or Check Out.
- Future lead-scanner behavior is not active unless explicitly implemented and validated.

## Synthetic QA Rules

- Use `CODEX_DEMO` for new synthetic QA, demos, tutorials, import rehearsal, and reversible write testing.
- Do not recreate retired `CODEX_TEST`.
- Historical archived files and compatibility tests may mention CODEX_TEST as evidence only.
- Do not use CPB for QA, synthetic imports, scanner rehearsal, or fake payment/attendance writes.

## Permanent Forward Compatibility

Whenever a change affects schemas, fields, statuses, calculations, validators, Firestore Rules, service write shapes, imports, reports, audit behavior, role behavior, tickets, check-in, Operations, Tasks, event configuration, or other persistent behavior:

- Support older legitimate records, not just newly created demo records.
- Check create, read, update, report, import, export, audit, and downstream workflows.
- Prefer backward-compatible reading, safe defaulting, normalization on edit, or documented legacy tolerance over broad production migrations.
- Do not bulk-modify real production data without explicit approval after inspection, classification, dry run, and testing.
- Add tests for new records, old records, imported old records, partially populated records, and completed-event records where relevant.

## Permanent Documentation Impact Rule

Every meaningful change must include a documentation-impact check before handoff. If a setting, permission, schema, field, workflow, external integration, Firebase rule, data contract, status, import/export shape, report, or owner/admin surface changes, update every affected source of truth in the same change set: runtime code, Firebase data or rules where intentionally changed, service functions, validation/normalization, Settings/admin visibility, tests, operational documentation, and repair runbooks.

Documentation is not complete when it only describes the code. It must describe the owner/operator workflow, the authoritative Firebase source, the security boundary, expected failure modes, recovery steps, and any known legacy tolerance. Use `docs/manual`, `docs/runbooks`, `docs/data-dictionary`, `docs/permissions`, `docs/problem-register`, `docs/decisions`, and `docs/changelog` as the living technical manual system.

For documentation-only work, state explicitly whether Firebase Hosting, Firestore Rules, Auth, Functions, Storage, QR format, production data, or runtime UI were unchanged. For runtime work, the final handoff must identify the documentation files reviewed or updated, or explain why no documentation update was required.

## Handoff Rule

Every handoff must state:

- current branch and commit;
- merge/deploy status;
- validation status;
- manual smoke status if performed;
- what changed;
- what did not change;
- remaining blockers;
- docs/tests that were updated;
- Firebase targets deployed or explicitly not deployed.
