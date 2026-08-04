# AI Agent Rules

Before any future AI/Codex phase, read this file first, then read `PROJECT_HANDOFF.md`, then read `README.md`.

This project previously had real stale-knowledge bugs: staff/scanner rules were once deployed while the client still used an approvedEmails-only gate, and later docs still described retired CODEX_TEST/CPB-specific behavior after CODEX_DEMO and standard real-event safeguards became current. Future AI/Codex work must treat related app flow, docs, tests, rules, data, and UI copy as one connected surface.

## Current canonical truth

- Current production Firebase project: `gathervibeshub`.
- Current production URL: `https://gathervibeshub.web.app`.
- Current local URL: `http://localhost:4173`.
- Protected Owner UID: `WcDU2jmbopdAgDlMMWvD3TkqqbC3`.
- Protected Owner email: `jaylanspencer99@gmail.com`.
- Current synthetic QA/training event: `CODEX_DEMO - Full System Walkthrough`.
- Current synthetic QA/training event ID: `codex_demo_full_system_walkthrough`.
- Retired historical QA event: `CODEX_TEST Live Verification Event` / `xPfa0b3KZyLSDnAD2uGI`.
- Real event safety: CPB is a normal completed real event and uses the same safeguards as every other real event. Do not use CPB for synthetic QA writes.
- Canonical docs: `docs/GSV_MASTER_SYSTEM_REFERENCE.md`, `docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md`, `docs/PRODUCT_GUIDE.md`, and `docs/ROUTE_MAP.md`.

## Required startup checks for every future AI/Codex phase

1. Read `AI_AGENT_RULES.md` first.
2. Read `PROJECT_HANDOFF.md`.
3. Read `README.md`.
4. Identify the current phase, active branch, deploy status, and live safety status before making changes.
5. Identify whether Firestore rules are already deployed, dry-run only, or unchanged.
6. Identify whether Hosting is already deployed or still pending.
7. Check whether the requested change affects any of these surfaces:
   - `AuthProvider`
   - `ProtectedRoute`
   - app routes
   - `accessRoles`
   - Settings page
   - QA page
   - runtime health
   - `README.md`
   - `PROJECT_HANDOFF.md`
   - Firestore rules
   - tests
8. Search for stale, contradictory, or historical wording before handoff.
9. Update all affected docs, UI copy, runtime status, and tests together when behavior changes.
10. Preserve historical closeout notes, but clearly label historical facts so they are not confused with current live behavior.
11. Never solve staff/scanner/helper access by adding staff/scanner/helper emails to `approvedEmails`.
12. Treat `approvedEmails` as admin-level access only.
13. Treat staff/scanner access as `staffProfiles/{uid}` plus `events/{eventId}/staffAssignments/{uid}`.
14. Protect CPB as production data.
15. Use `CODEX_DEMO` only for new synthetic QA, demos, training, and reversible write testing.
16. Preserve QR payload exactly as `GSV:TICKET:{ticketCode}`.
17. Keep `xlsx` absent and `read-excel-file` active.
18. Run `npm run lint`, `npm test`, `npm run build`, `npm audit --omit=dev`, and `npx -y firebase-tools@latest deploy --only firestore:rules --dry-run --project gathervibeshub` when relevant to the change.
19. State clearly what changed, what did not change, what was deployed, and what remains blocked.
20. Stop if current docs, rules, app behavior, and tests contradict each other.

## Chat-to-Codex handoff update rule

Before every future AI/Codex phase, the AI must use the latest ChatGPT conversation update together with `AI_AGENT_RULES.md`, `PROJECT_HANDOFF.md`, `README.md`, and any active phase plan documents.

The AI must not rely only on older repository docs if the current chat contains newer organizer decisions, manual smoke results, safety instructions, branch status, deployment status, or closeout approvals.

Every handoff must clearly include:

- current phase
- active branch
- latest commit
- merge status
- deploy status
- manual smoke status
- organizer approvals or blockers
- what changed
- what did not change
- what remains forbidden
- what docs/status pages/tests must be updated

If chat decisions and repo docs contradict each other, stop and reconcile them before coding.

## Current standing rules to preserve

- Phase 17C-B is closed after Firestore rules deployment in B2, the scanner auth-gate fix in B3, organizer scanner smoke PASS, and admin after-smoke PASS.
- Phase 17D-B is scanner-only polish work. It must not broaden access, rewrite Firestore rules dynamically, implement Access & Roles workflows, or implement lead-scanner permissions.
- Phase 17D-C is read-only/admin UI foundation only. It must not add write mutations for staffProfiles, staffAssignments, approvedEmails, or auditLogs.
- Phase 17C-B3 fixed the scanner login gate by allowing active staff profile plus active assignment access after approved-admin lookup.
- Scanner/check-in-only users remain check-in only. Do not give the normal scanner role Undo Check-In or Check Out.
- Approved admins may use existing admin-only undo/check-out paths where already implemented.
- A future lead-scanner undo permission may be planned later, but it is not implemented now.
- `CODEX_DEMO` is the current scanner smoke and synthetic QA event. Older CODEX_TEST references are historical unless a compatibility test explicitly uses that name.
- CPB must not be used for QA.
- Firestore indexes must not be deployed unless explicitly requested.
- Native app, Cloud Functions, Storage, payment gateway, and public portal work remain out of scope unless explicitly requested.
