# Gather & Savor Repository Maintenance Manifest

Last updated: 2026-08-04

## Purpose

This manifest explains how the repository is organized, what is source versus generated output, and where future maintainers should look before changing product behavior.

Machine-readable audit artifacts live in:

- `audit/gsv-file-inventory.json`
- `audit/gsv-document-registry.json`

Regenerate them with:

```bash
node scripts/audit/generateRepositoryAudit.mjs
```

## Repository Shape

- `src/`: React application source, Firebase client access, services, pages, layout, tutorial, and shared utilities.
- `tests/`: Node test coverage for source contracts, product text, Firestore rules, import logic, finance boundaries, access, tickets, and QA helpers.
- `e2e/`: Playwright browser coverage.
- `scripts/`: admin, product-QA, e2e setup, and audit automation.
- `docs/`: active product references, operating standards, historical index, and audit/result documents.
- `integrations/google-forms/`: optional Google Forms script materials; not a live Cloud Function deployment.
- `public/`: static assets, manifest, service worker, and robots policy.
- `.github/`: GitHub workflow/security automation.
- `dist/`: generated Vite build output; recreate with `npm run build`.
- `node_modules/`: vendor dependencies; recreate with `npm ci`.
- `.firebase/`, `firestore-debug.log`, `test-results/`, and `output/`: generated or evidence artifacts; do not treat as application source.

## Current Audit Snapshot

The 2026-08-04 inventory found:

- 40,918 repository entries.
- 34,750 files.
- 6,168 directories.
- 407 human-maintained files outside vendor/generated output.
- 137 project documentation or instruction records outside `node_modules`.
- 297 project-maintained JavaScript/TypeScript files outside `node_modules`.
- 2 project-maintained style files outside `node_modules`.

Largest local disk areas before cleanup:

- `node_modules`: about 433.0 MiB, recreatable with `npm ci`.
- `.git`: about 78.9 MiB, repository history.
- `output`: about 6.7 MiB, browser/evidence artifacts.
- `dist`: about 2.3 MiB, generated build.

## Documentation Policy

Keep operational agent files at their expected paths:

- `AI_AGENT_RULES.md`
- `PROJECT_HANDOFF.md`
- `README.md`

Do not delete or move those files just because current truth is also summarized elsewhere. Tests and future agents reference them directly. Update the current-truth sections in place and use `docs/GSV_MASTER_SYSTEM_REFERENCE.md` for the concise authoritative summary.

Historical phase files may remain at root when tests or handoff history reference exact paths. Treat them as evidence, not current product instructions. Use `docs/HISTORICAL_ARCHIVE_INDEX.md` to interpret them.

## Cleanup Policy

Safe cleanup candidates are generated and recoverable only:

- stale `dist/`
- stale `test-results/`
- stale `playwright-report/`
- Firebase emulator debug logs
- obsolete screenshots or output folders

Do not clean:

- `.git`
- tracked source, tests, docs, configs, or public assets
- `.env.local`
- private evidence workbooks unless explicitly approved
- external project copies or worktrees without explicit approval

2026-08-04 cleanup result: `firestore-debug.log` and `test-results/` were identified as recoverable generated cleanup candidates. The deletion command was blocked before execution by the local command policy, so no generated files were removed in this pass.

## Guardrails

- CPB received zero synthetic writes in this maintenance audit.
- CODEX_DEMO remains the only synthetic QA/training event.
- Firestore Rules were audited from source and not changed in this documentation/inventory maintenance pass.
- Firestore indexes were not changed.
- No Functions, Storage, Auth configuration, or indexes are deployment targets for documentation-only maintenance.
- QR payload remains `GSV:TICKET:{ticketCode}`.
