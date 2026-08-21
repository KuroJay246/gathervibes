# Runbook 5. Development, Build, and Test Failures

## Purpose

Repair local dependency, build, emulator, unit-test, Firestore Rules test, Playwright, and React Doctor failures.

## Symptoms

- Dependency install fails.
- Build fails.
- Emulator port collision.
- Unit tests fail.
- Firestore Rules tests fail.
- Playwright/E2E fails.
- React Doctor warning requires review.

## Severity

Medium for local-only work, High when blocking release validation.

## Possible causes

- Node dependency mismatch.
- Vite import failure or unresolved module.
- Java or emulator process conflict.
- Stale fixture assumptions.
- Rule/test contract drift.
- Local browser runner instability.

## Safety warnings

- Do not treat an emulator-only failure as proof of production failure without corroboration.
- Do not ignore React Doctor blocking findings on changed code.

## Evidence to collect

- Exact failing command.
- Exit code and first actionable stack line.
- Occupied ports.
- Last passing commit if known.

## First checks

1. Confirm clean install state with current lockfile.
2. Confirm ports 8080 and 9099 are free before emulator runs.
3. Confirm the failing test is not using an expired date-sensitive fixture.

## Files to inspect

- `package.json`
- `package-lock.json`
- `vite.config.js`
- `playwright.config.js`
- `firestore.rules`
- The failing test file and nearest helper

## Commands to run

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run product:qa`
- `npm run doctor:changed`

## Step-by-step diagnosis

1. Re-run the narrow failing command first.
2. If the failure is emulator startup, stop the stale process rather than changing tests immediately.
3. If the failure is build-time import resolution, inspect the exact file path and package classification.
4. If the failure is rules-related, compare the intended write shape against the rule validator and existing rule tests.
5. If Playwright fails, isolate whether the problem is app state, test selector drift, or browser infrastructure.

## Repair options

- Correct dependency classification or lockfile.
- Fix date-sensitive test fixtures.
- Repair route selector or app contract drift.
- Adjust local QA wrapper only if it improves determinism without weakening checks.

## Verification

- Failing narrow command passes.
- Full repo validation set passes for the scoped change.

## Rollback

- Revert the failing tooling or test change, then restore the previous passing workflow.

## Escalation conditions

- The same failure reproduces across clean installs and multiple recent commits.
- QA tooling requires unsafe system changes.

## Search keywords

- dependency install failure
- build failed
- emulator port 8080 9099
- unit test failed
- Firestore Rules test failed
- Playwright failed
- React Doctor warning

## Related tests

- Entire project test and QA suite

## Related manual sections

- Testing and Quality Assurance
- Build, Deployment, and Recovery
