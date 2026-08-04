# Gather & Savor Current Project Handoff

Last updated: 2026-08-04.

## Current State

- Current production project: `gathervibeshub`.
- Production URL: `https://gathervibeshub.web.app`.
- Local URL: `http://localhost:4173`.
- Protected Owner UID: `WcDU2jmbopdAgDlMMWvD3TkqqbC3`.
- Protected Owner email: `jaylanspencer99@gmail.com`.
- Current synthetic event: `CODEX_DEMO - Full System Walkthrough` (`codex_demo_full_system_walkthrough`).
- Retired historical synthetic event: `CODEX_TEST Live Verification Event` (`xPfa0b3KZyLSDnAD2uGI`).
- CPB event: `zhaPxi31cpqLAW0cuS20`.

## Active Handoff

Use `CODEX_DEMO` for synthetic QA, demo, tutorial, import rehearsal, and browser tests that create synthetic records.

Do not use CPB for synthetic QA. CPB is a normal completed real event and should be edited only through the same approved organizer safeguards used for other real events.

Protected Owner access is UID-based and must remain independent of mutable lower-role assignments or allowlists.

`AI_AGENT_RULES_HANDOFF.md` is not required. Its intended function is covered by this file plus `AI_AGENT_RULES.md`.

## Required Reading

- [AI_AGENT_RULES.md](./AI_AGENT_RULES.md)
- [README.md](./README.md)
- [docs/GSV_MASTER_SYSTEM_REFERENCE.md](./docs/GSV_MASTER_SYSTEM_REFERENCE.md)
- [docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md](./docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md)
- [docs/HISTORICAL_ARCHIVE_INDEX.md](./docs/HISTORICAL_ARCHIVE_INDEX.md)

## Historical Handoff

The previous long-form handoff was preserved at:

- [docs/archive/legacy/PROJECT_HANDOFF_HISTORICAL_2026-08.md](./docs/archive/legacy/PROJECT_HANDOFF_HISTORICAL_2026-08.md)

That archive is release evidence, not the current project instruction source.

## Current Guardrails

- Do not weaken Firestore Rules.
- Do not change QR payload format.
- Do not expand scanner permissions.
- Do not recreate CODEX_TEST.
- Do not expose or print secrets.
- Do not deploy Firebase targets that were not intentionally changed.
- Do not migrate or bulk-write real production records without explicit approval.
- Do not silently treat missing or legacy values as explicit financial evidence.
