# Gather & Savor Repository And Maintenance Manifest

Last updated: 2026-08-20.

This manifest is the repository-maintenance source of truth for Gather & Savor Event Hub. Pair it with `docs/GSV_MASTER_SYSTEM_REFERENCE.md`: the Master Reference explains how the app works; this manifest explains where things live, what is generated, what is safe to clean, and how to keep repository knowledge current.

## Repository Authority

- Canonical repository: `C:\Users\Jaylan\Documents\gathetr`.
- Canonical branch for release work: `main`.
- Remote: `origin` on GitHub.
- Firebase project: `gathervibeshub`.
- Production site: `https://gathervibeshub.web.app`.

Old worktrees, Desktop archives, Downloads files, and output evidence are not authoritative source unless explicitly copied into the canonical repository and committed after review.

## Top-Level Shape

- `src/`: React app source, auth, layout, pages, components, services, utilities, tutorial, Firebase client setup, and styles.
- `tests/`: Node test suite for product behavior, routes, Firestore rule contracts, import parsing, finance, tickets, check-in, protected owner, docs, and guardrails.
- `e2e/`: Playwright browser tests.
- `scripts/`: product QA, e2e setup, admin utilities, diagnostics, audit generators, and repository-maintenance automation.
- `docs/`: active documentation and archived historical evidence.
- `docs/archive/`: historical phase reports, release reports, audits, dry runs, legacy handoffs, and evidence summaries.
- `integrations/`: disconnected or undeployed integration source, currently including Google Forms material.
- `public/`: static assets, PWA manifest, service worker, robots policy, icons, and Hosting-served files.
- `audit/`: generated repository-maintenance inventories and review artifacts.
- `output/`: repository-local evidence/output that requires manual review before deletion.
- `.github/`: GitHub workflows and security automation.
- `.firebase/`, `dist/`, `test-results/`, `playwright-report/`, `coverage/`, `firestore-debug.log`: generated or recreatable local output when present.
- `node_modules/`: vendor dependencies recreated with `npm ci`.

## Canonical Current Docs

- `README.md`: concise entrypoint and current truth summary.
- `AI_AGENT_RULES.md`: current operating rules for AI/coding agents.
- `PROJECT_HANDOFF.md`: current handoff and guardrails.
- `docs/GSV_MASTER_SYSTEM_REFERENCE.md`: product, source, route, access, Firestore, feature, and debugging map.
- `docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md`: repository shape, audit, cleanup, and maintenance map.
- `docs/HISTORICAL_ARCHIVE_INDEX.md`: archive interpretation rules.
- `docs/PRODUCT_GUIDE.md`: organizer/product overview.
- `docs/ROUTE_MAP.md`: route and Working Event guide.
- `docs/QA_GUIDE.md`: current QA workflow.
- `docs/DEPLOYMENT_GUIDE.md`: release/deployment workflow.
- `docs/KNOWN_LIMITATIONS.md`: current limitations.

Specialized standards remain active when they define a current invariant, product boundary, workflow contract, or test-backed standard. Historical phase files belong under `docs/archive/`.

## Source Map For Maintenance

Start debugging from these anchors:

- `src/App.jsx`: route tree.
- `src/layout/AppShell.jsx`: organizer shell, grouped desktop sidebar, collapsed-sidebar tooltips, and mobile drawer rendering.
- `src/utils/navigation.js`: primary mobile navigation definitions.
- `src/utils/accessRoles.js`: route-access roles.
- `src/auth/AuthProvider.jsx`: Firebase Auth and organizer approval.
- `src/config/protectedOwner.js`: Protected Owner constants.
- `src/events/ActiveEventProvider.jsx`: Working Event state.
- `src/lib/firebase.js`: Firebase client initialization.
- `firestore.rules`: active Firestore security policy.
- `firebase.json`: Hosting, rules/index paths, emulator config.
- `.firebaserc`: default Firebase project.
- `package.json`: scripts and dependency contract.

## Generated Audit Artifacts

Regenerate repository inventories with:

```bash
node scripts/audit/generateRepositoryAudit.mjs
```

Generated files:

- `audit/gsv-file-inventory.json`: file inventory, classifications, sizes, cleanup candidates, and Git metadata.
- `audit/gsv-document-registry.json`: documentation registry, active/archive classification, references, stale facts, and contradictions.
- `audit/gsv-external-related-files.json`: broad external related-file inventory.
- `audit/gsv-cleanup-log.json`: cleanup log, retained even when no cleanup is performed.

Maintenance-review artifacts produced by the final hardening run:

- `audit/gsv-credential-security-review.json`: redacted service-account file review. It must not contain private keys.
- `audit/gsv-external-groups.json`: grouped external related files with risk flags.
- `audit/gsv-output-evidence-review.json`: `output/` classification and cleanup recommendation.
- `audit/gsv-active-doc-rationalization.json`: current active-document retention/merge/archive rationale when generated.

Inventory Git metadata is informational. Embedding the commit hash of the commit that contains the inventory would create infinite churn; use `git rev-parse HEAD` and the final report for the authoritative final commit.

## Documentation QA

Run:

```bash
npm run product:docs
```

The documentation check should confirm:

- canonical current docs exist;
- active docs do not present retired `CODEX_TEST` as the current QA workflow;
- active docs do not preserve CPB-specific write locks, read-only rules, zero-write gates, or special protection warnings as current instructions;
- Message Builder remains copy-only;
- Protected Owner documentation remains present;
- CODEX_DEMO is the current synthetic QA/training event;
- CPB is a normal completed real event;
- route paths in active docs are current;
- historical contradictions are quarantined under archive interpretation rules.

## Cleanup Policy

Safe automatic cleanup may remove only generated/recreatable local output after validation, such as stale `dist/`, `test-results/`, `.firebase/`, `coverage/`, and `firestore-debug.log`.

Do not automatically delete:

- `.git`;
- tracked source, tests, docs, configs, or public assets;
- `.env`, `.env.local`, or any credential-like file;
- `node_modules`;
- external backups or evidence;
- `output/` folders that may contain unique acceptance/debug evidence;
- private spreadsheets or production evidence files;
- old repository archives that contain credential indicators;
- Firebase service-account JSON files.

Any manual-delete candidate must be staged outside the repository in:

`C:\Users\Jaylan\Desktop\GSV_DELETE_REVIEW_DO_NOT_DELETE_UNTIL_CHECKED`

The folder name is deliberate: it is a review queue, not a deletion instruction. If risk is unclear, stage nothing and explain why.

## External Related Files

External Gather & Savor matches are inventoried in `audit/gsv-external-related-files.json` and grouped in `audit/gsv-external-groups.json`.

Current grouping policy:

- current repository is authoritative;
- old repository archives are manual-review only;
- Desktop evidence folders are manual-review only;
- Downloads credential files are security-review only;
- private spreadsheets are never auto-deleted or committed;
- any group with credential indicators is excluded from safe deletion.

## Credential Policy

Known sensitive file reviewed outside the repository:

`C:\Users\Jaylan\Downloads\gathervibeshub-firebase-adminsdk-fbsvc-7667cf534c.json`

The review artifact must record only redacted metadata. Do not print the private key, copy it into docs, commit it, move it to a delete-review folder, or delete it. Cloud/IAM status cannot be inferred from local file presence; if the key is not needed, rotate/revoke it in Firebase/Google Cloud after separate owner approval.

The current application does not require a local Firebase Admin service-account JSON for normal frontend runtime. Some test/e2e tooling uses `firebase-admin` as a dev dependency.

## Output Evidence Policy

`output/` is not automatically disposable. It may contain unique browser, visual, acceptance, or debugging evidence. Classify it and report it, but keep it unless a human confirms it is obsolete.

Current output review artifact:

- `audit/gsv-output-evidence-review.json`.

## Archive Policy

Historical phase reports, result reports, release notes, dry runs, acceptance reports, audits, and legacy handoffs belong under `docs/archive/` unless an exact path is still operationally required.

Active docs must not present historical facts as current instructions. Archive docs may mention retired fixtures, obsolete phase names, CPB-specific gates, or old deployment states only when `docs/HISTORICAL_ARCHIVE_INDEX.md` explains how to interpret them.

## Dependency Policy

- Use `npm ci` for clean install validation.
- Do not broadly upgrade dependencies during maintenance.
- `xlsx` must remain absent.
- `read-excel-file` must remain present.
- Production audit command: `npm audit --omit=dev`.
- React Doctor is advisory and pinned at `react-doctor@0.8.3`.

## Git Policy

- Do not use destructive reset/checkout commands unless explicitly approved.
- Do not stage broad unrelated files with `git add .` or `git add -A`.
- Keep unrelated untracked private evidence untouched.
- Merge finished maintenance through normal Git history.
- Push `main` normally; never force-push for this maintenance.
- Do not deploy unless runtime source or Firebase target changed and deployment is explicitly required.

## Release And Deployment Policy

Use Hosting-only deployment for app-source changes:

```bash
npx firebase-tools deploy --only hosting --project gathervibeshub
```

Do not deploy Firestore rules unless `firestore.rules` intentionally changed and rules tests/emulator checks pass.

Do not deploy Firestore indexes unless `firestore.indexes.json` intentionally changed.

Do not deploy Functions, Storage, or Auth configuration from this repository unless a future approved scope adds that target.

## Validation Checklist

Standard closeout validation:

```bash
npm ci
npm run lint
npm test
npm run build
npm run product:routes
npm run product:qa
npm run product:docs
npm run e2e:smoke
npm run e2e:full
npm audit --omit=dev
npm run doctor:json
npm ls xlsx
npm ls read-excel-file
git diff --check
git status --short
git fsck
```

`npm ls xlsx` should confirm absence; depending on npm behavior, absence may exit non-zero. Report the package as absent rather than treating that alone as a dependency regression.

## Desktop Reference Package

The current reference package belongs at:

`C:\Users\Jaylan\Desktop\GSV_CURRENT_PROJECT_REFERENCE`

It should include a concise index, current canonical docs, selected high-value standards, audit summaries, and a security-action note when sensitive local credential files are found. It must not include private keys, private spreadsheets, cookies, tokens, or screenshots exposing private data.

## Troubleshooting

- If auth succeeds but writes fail, inspect UID/access state, event scope, service write shape, audit batch, then Firestore rules.
- If the Protected Owner can read a record but cannot update it, compare immutable stored creator fields against current-writer validation. Updates should preserve legitimate historical `createdBy` values while validating `updatedBy` as the current authenticated user.
- If Protected Owner access fails, inspect `src/config/protectedOwner.js`, `src/auth/AuthProvider.jsx`, `firestore.rules`, and System QA.
- If CODEX_DEMO is missing from QA flows, inspect `src/utils/demoEvent.js`, `src/utils/qaHelper.js`, event classification fields, and event-list filtering.
- If CPB is read-only, search for CPB-specific locks or status-based edit blocks; CPB should be a normal completed real event.
- If scanner access expands, inspect `src/utils/accessRoles.js`, `src/components/AssignedEventGate.jsx`, scanner page controls, and staff assignment rules.
- If QR scanning breaks, confirm `src/utils/qrTicketUtils.js` still emits `GSV:TICKET:{ticketCode}`.
- If import parsing breaks, inspect `src/utils/xlsxImport.js`, `src/utils/importUtils.js`, and `read-excel-file` dependency state.
- If product QA fails immediately, inspect `scripts/product/documentationCheck.mjs`, route definitions, missing docs, and malformed JSON before assuming runtime behavior failed.
- If emulator ports are occupied, identify the exact process before stopping it.
- If `git fsck` reports dangling objects but exits 0, report it as non-blocking repository garbage rather than a product defect.
