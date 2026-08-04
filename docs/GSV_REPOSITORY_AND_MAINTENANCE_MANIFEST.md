# Gather & Savor Repository And Maintenance Manifest

Last updated: 2026-08-04.

## Repository Shape

- `src/`: React app source, pages, layout, auth, Firebase client setup, services, utilities, components, tutorial, and styles.
- `tests/`: Node test suite for product, routes, Firestore rules contracts, imports, finance, tickets, check-in, protected owner, docs, and guardrails.
- `e2e/`: Playwright browser tests.
- `scripts/`: product QA, admin utilities, diagnostics, audit generators, and maintenance scripts.
- `docs/`: active documentation, standards, guides, and historical archive.
- `docs/archive/`: historical phase, release, audit, and legacy evidence.
- `integrations/`: disconnected or undeployed integration source, including Google Forms material.
- `public/`: static assets, PWA manifest, service worker, robots policy, and icons.
- `audit/`: generated repository-maintenance inventories and evidence JSON.
- `.github/`: GitHub workflows/security automation.
- `.firebase/`, `dist/`, `test-results/`, `firestore-debug.log`, `playwright-report/`, `coverage/`: generated/recreatable local output when present.
- `node_modules/`: vendor dependencies recreated with `npm ci`.

## Canonical Files

- `README.md`: concise entrypoint.
- `AI_AGENT_RULES.md`: operational agent rules.
- `PROJECT_HANDOFF.md`: current handoff.
- `docs/GSV_MASTER_SYSTEM_REFERENCE.md`: current system truth.
- `docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md`: repository and maintenance truth.
- `docs/HISTORICAL_ARCHIVE_INDEX.md`: archive guide.

`AI_AGENT_RULES_HANDOFF.md` is not required unless a future tool explicitly references that exact path. Its purpose is currently covered by `AI_AGENT_RULES.md` and `PROJECT_HANDOFF.md`.

## Audit Artifacts

Regenerate final inventories with:

```bash
node scripts/audit/generateRepositoryAudit.mjs
```

Generated files:

- `audit/gsv-file-inventory.json`
- `audit/gsv-document-registry.json`
- `audit/gsv-external-related-files.json`
- `audit/gsv-cleanup-log.json`

## Cleanup Policy

Safe automatic cleanup may remove only generated/recreatable local output after validation, such as stale `dist/`, `test-results/`, `.firebase/`, and `firestore-debug.log`.

Do not automatically delete:

- `.git`
- tracked source, tests, docs, configs, or public assets
- `.env.local`
- `node_modules`
- external backups/evidence
- `output/` folders that may contain unique acceptance or bug evidence
- private spreadsheets or production evidence files

## Archive Policy

Historical phase reports, result reports, release notes, dry runs, acceptance reports, audits, and legacy root handoffs belong under `docs/archive/` unless an exact path is still operationally required.

Active docs must not present historical facts as current instructions.

## External Related Files

External Gather & Savor matches under Desktop, Documents, and Downloads are inventoried in `audit/gsv-external-related-files.json`. They are manual-review items and must not be deleted automatically.

## Dependency Policy

- Do not broadly upgrade dependencies during maintenance.
- `xlsx` must remain absent.
- `read-excel-file` must remain present.
- Production audit is `npm audit --omit=dev`.

## Troubleshooting

- If emulator ports are occupied, identify the exact process before stopping it.
- Expected Firestore emulator rule-rejection diagnostics are not app failures when tests assert rejection.
- React Doctor is advisory unless it reports errors.
- `git fsck` dangling objects are not automatically a blocker when the command exits 0.
