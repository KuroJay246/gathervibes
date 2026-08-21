# Testing and Quality Assurance

## Command Reference

| Command | Purpose | Actual script | When to run | Expected result |
| --- | --- | --- | --- | --- |
| npm run dev | Local validation/development command | vite | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run build | Local validation/development command | vite build | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run preview | Local validation/development command | vite preview | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run docs:generate | Local validation/development command | node scripts/docs/generateTechnicalManual.mjs | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run docs:validate | Local validation/development command | node scripts/docs/validateTechnicalDocs.mjs | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run lint | Local validation/development command | eslint src tests scripts e2e eslint.config.js vite.config.js playwright.config.js | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run test | Local validation/development command | node --test tests/*.test.js | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run doctor | Local validation/development command | react-doctor . --project . --scope full --blocking none --no-telemetry | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run doctor:changed | Local validation/development command | react-doctor . --project . --scope changed --base main --blocking error --no-telemetry | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run doctor:json | Local validation/development command | react-doctor . --project . --scope full --blocking none --json --json-compact --no-telemetry | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run product:copy-scan | Local validation/development command | node scripts/product/copyScan.mjs | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run product:routes | Local validation/development command | node scripts/product/routeInventory.mjs | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run product:bundle | Local validation/development command | node scripts/product/bundleSummary.mjs | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run product:docs | Local validation/development command | node scripts/product/documentationCheck.mjs | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run product:legacy | Local validation/development command | node scripts/product/legacyControlCheck.mjs | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run product:qa | Local validation/development command | node scripts/product/runProductCommand.mjs qa | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run product:audit | Local validation/development command | node scripts/product/runProductCommand.mjs audit | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run product:qa:emulator-checks | Local validation/development command | node --test tests/firestore-checkin-rules.test.js tests/task-workflow-rules.test.js tests/document-contact-rules.test.js tests/run-of-show-resource-rules.test.js && npm run e2e:smoke:inner | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run e2e:smoke | Local validation/development command | npx -y firebase-tools@14.19.0 emulators:exec --only auth,firestore --project gathervibeshub "npm run e2e:smoke:inner" | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run e2e:smoke:inner | Local validation/development command | playwright test --project=chromium e2e/navigation.spec.js | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run e2e:full | Local validation/development command | npx -y firebase-tools@14.19.0 emulators:exec --only auth,firestore --project gathervibeshub "playwright test --project=chromium" | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run e2e:firefox | Local validation/development command | npx -y firebase-tools@14.19.0 emulators:exec --only auth,firestore --project gathervibeshub "playwright test --project=firefox" | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run e2e:webkit | Local validation/development command | npx -y firebase-tools@14.19.0 emulators:exec --only auth,firestore --project gathervibeshub "playwright test --project=webkit" | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run admin:ensure-access | Local validation/development command | node scripts/admin/ensureAccessControl.mjs | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run admin:verify-firebase | Local validation/development command | node scripts/admin/verifyFirebaseSetup.mjs | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run admin:replace-codex-test-with-demo | Local validation/development command | node scripts/admin/replaceCodexTestWithDemoEvent.mjs | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run admin:verify-production-fixtures | Local validation/development command | node scripts/admin/verifyProductionFixtures.mjs | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run admin:verify-production-counts | Local validation/development command | node scripts/admin/verifyProductionCounts.mjs | During development, QA, or documentation validation | Exit code 0; command-specific pass message |
| npm run firebase:deploy-rules | PRODUCTION-IMPACTING COMMAND where noted | npx firebase-tools deploy --only firestore:rules,firestore:indexes --project gathervibeshub | Only after explicit approval and validation | Exit code 0; command-specific pass message |
| npm run firebase:deploy-hosting | PRODUCTION-IMPACTING COMMAND where noted | npx firebase-tools deploy --only hosting --project gathervibeshub | Only after explicit approval and validation | Exit code 0; command-specific pass message |
| npm run firebase:deploy-all | PRODUCTION-IMPACTING COMMAND where noted | npx firebase-tools deploy --only firestore:rules,firestore:indexes,hosting --project gathervibeshub | Only after explicit approval and validation | Exit code 0; command-specific pass message |

## Testing Layers

- Unit and source contract tests: `tests/*.test.js`.
- Firestore Rules tests: rules-specific test files run against emulators.
- E2E smoke: `e2e/navigation.spec.js`.
- Accessibility and responsive E2E: `e2e/accessibility.spec.js`, `e2e/responsive.spec.js`.
- Product QA wrapper: `npm run product:qa`.
- React Doctor: `npm run doctor:json` or `npm run doctor:changed`.

## Date-Sensitive Test Policy

Phase 2 found `tests/document-contact-foundation.test.js` used `2026-08-20` as an expiring-soon fixture. On 2026-08-21 that fixture became expired for helpers using the current clock. It was updated to `2026-08-30` to preserve the intended behavior.

Future date-sensitive tests should either inject an explicit clock into every helper under test or choose dates far enough away to avoid silent expiry.
