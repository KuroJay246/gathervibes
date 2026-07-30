# Mobile Auth and E2E Failure Investigation

Audit pass: Pass 2
Date: 2026-07-30
Branch: `codex/full-repository-product-audit-2026-07`

## Scope

This pass investigated the prior mobile accessibility E2E failure where the test remained on `/login` after emulator sign-in. The investigation was audit-only. No app source, Firebase rules, Firebase indexes, production data, or authentication configuration were changed.

## Evidence

- Prior captured wrapper reruns failed before useful Playwright evidence was produced. Attempts using `--trace=on` and `--trace on` failed with Playwright option parsing errors in the emulator wrapper.
- Wrapper reruns without trace exited quickly with empty redirected stdout/stderr, so they are not reliable proof of an app defect.
- Direct emulator accessibility run passed: `2 passed`.
- Direct full E2E suite passed: `10 passed`.

Saved evidence:

- `output/full-repository-audit/e2e-failure/e2e-failure-runs.json`
- `output/full-repository-audit/e2e-failure/direct-accessibility-result.json`
- `output/full-repository-audit/e2e-failure/direct-accessibility.out.txt`
- `output/full-repository-audit/e2e-failure/direct-full-suite-result.json`
- `output/full-repository-audit/e2e-failure/direct-full-suite.out.txt`

## Classification

The original failure is classified as an E2E runner/tooling/auth-fixture flake, not a confirmed production authentication regression.

The current direct evidence shows:

- desktop accessibility E2E passed;
- mobile accessibility E2E passed;
- navigation E2E passed;
- responsive E2E passed;
- Tutorial V3 E2E passed;
- workflow E2E passed.

## Remaining Risk

Java 17 is still present and Firebase emulator output warns that `firebase-tools@15` will require Java 21. The scripts currently use `firebase-tools@14.19.0`, so this is a future environment risk rather than a current app failure.

## Recommendation

Keep the E2E command path direct and avoid adding unsupported Playwright flags inside the Firebase emulator command string. Plan a Java 21 migration before removing the Firebase CLI pin.
