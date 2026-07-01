# AI Agent Rules

Before any future AI/Codex phase, read this file first, then read `PROJECT_HANDOFF.md`, then read `README.md`.

This project previously had a real stale-knowledge bug: Phase 17C-B deployed staff/scanner Firestore rules and created scanner staff documents, but scanner login was still blocked by the old approvedEmails-only client auth gate. Future AI/Codex work must treat related app flow, docs, tests, rules, and UI copy as one connected surface.

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
15. Use `CODEX_TEST` only for QA and smoke testing.
16. Preserve QR payload exactly as `GSV:TICKET:{ticketCode}`.
17. Keep `xlsx` absent and `read-excel-file` active.
18. Run `npm run lint`, `npm test`, `npm run build`, `npm audit --omit=dev`, and `npx -y firebase-tools@latest deploy --only firestore:rules --dry-run --project gathervibeshub` when relevant to the change.
19. State clearly what changed, what did not change, what was deployed, and what remains blocked.
20. Stop if current docs, rules, app behavior, and tests contradict each other.

## Current standing rules to preserve

- Phase 17C-B is closed after Firestore rules deployment in B2, the scanner auth-gate fix in B3, organizer scanner smoke PASS, and admin after-smoke PASS.
- Phase 17D-B is scanner-only polish work. It must not broaden access, rewrite Firestore rules dynamically, implement Access & Roles workflows, or implement lead-scanner permissions.
- Phase 17D-C is read-only/admin UI foundation only. It must not add write mutations for staffProfiles, staffAssignments, approvedEmails, or auditLogs.
- Phase 17C-B3 fixed the scanner login gate by allowing active staff profile plus active assignment access after approved-admin lookup.
- Scanner/check-in-only users remain check-in only. Do not give the normal scanner role Undo Check-In or Check Out.
- Approved admins may use existing admin-only undo/check-out paths where already implemented.
- A future lead-scanner undo permission may be planned later, but it is not implemented now.
- `CODEX_TEST` is the only scanner smoke event.
- CPB must not be used for QA.
- Firestore indexes must not be deployed unless explicitly requested.
- Native app, Cloud Functions, Storage, payment gateway, and public portal work remain out of scope unless explicitly requested.
