# CODEX_TEST Retirement Result - 2026-08

## Scope

Retire `CODEX_TEST Live Verification Event` and replace it with `CODEX_DEMO - Full System Walkthrough` as the permanent synthetic demo and QA event.

## Retired Fixture

- Retired event name: `CODEX_TEST Live Verification Event`
- Retired event ID: `xPfa0b3KZyLSDnAD2uGI`
- Required deletion guard: exact event ID and event name match
- CPB event ID explicitly excluded from deletion: `zhaPxi31cpqLAW0cuS20`

## Replacement Fixture

- New event name: `CODEX_DEMO - Full System Walkthrough`
- New event ID: `codex_demo_full_system_walkthrough`
- Classification: Test Event
- Normal event-list behavior: hidden by default
- System QA behavior: shown as the current safe synthetic QA/demo fixture

## Production Maintenance Script

Use:

```powershell
npm run admin:replace-codex-test-with-demo
```

The script:

- verifies Firebase project `gathervibeshub`
- verifies the old event by exact ID and name before deleting
- writes a private local before snapshot under `C:\Users\Jaylan\Desktop\GSV_CODEX_DEMO_MIGRATION`
- refuses to touch CPB
- deletes only the old event and event-scoped records
- preserves global access control, staff profiles, settings, contacts, organizations, and audit logs
- creates the permanent synthetic demo dataset
- writes append-only retirement and creation audit logs
- verifies old event-scoped records are absent and the new demo is classified as a test event

## Verification

Use:

```powershell
npm run admin:verify-production-fixtures
```

This read-only check requires one `CODEX_DEMO` fixture, zero retired `CODEX_TEST` fixture matches, Test Event classification, and readable audit logs.

