# Runbook 6. Deployment, Firebase, and Project Targeting

## Purpose

Repair problems caused by the wrong Firebase project, invalid environment configuration, production Hosting regression, or incorrect Rules deployment.

## Symptoms

- Wrong Firebase project selected.
- Production Hosting regression.
- Missing or invalid environment configuration.
- Incorrect Firestore Rules deployment.

## Severity

High.

## Possible causes

- Wrong `gathervibeshub` project selection.
- Build artifact mismatch.
- Missing `VITE_FIREBASE_*` values locally.
- Rules deployed without matching tests or diff review.

## Safety warnings

- Never deploy during diagnosis without explicit scope approval.
- Never use a broad deploy when only one target changed.

## Evidence to collect

- Current branch and commit.
- Active Firebase project.
- Build artifact version/commit.
- Exact production symptom and console/network evidence.

## First checks

1. Confirm `.firebaserc` target and deploy command arguments.
2. Confirm whether the issue is Hosting-only, Rules-only, or both.
3. Confirm the current build passes locally before any deployment thinking.

## Files to inspect

- `.firebaserc`
- `firebase.json`
- `src/lib/firebase.js`
- `firestore.rules`
- `dist/`

## Commands to run

- `npm run build`
- `npm run product:qa`
- `npm run admin:verify-firebase`
- Do not run `firebase:deploy-*` unless explicitly approved

## Step-by-step diagnosis

1. Confirm the project id is `gathervibeshub` and that the symptom is not local-environment-only.
2. If Hosting regressed, compare the built asset names and current app chunk requests.
3. If Rules regressed, inspect the changed rule block and the matching emulator tests.
4. If environment values are missing locally, fix the local configuration rather than changing production behavior.

## Repair options

- Correct local project targeting.
- Rebuild and verify the exact artifact intended for Hosting.
- Revert or narrow the Rules change in a later approved phase.

## Verification

- Local build and QA pass.
- Safe production-read checks align with expected Firebase target.

## Rollback

- Restore the previous validated Hosting release or Rules version.

## Escalation conditions

- Production behavior is broken but local source cannot reproduce.
- A deploy is requested without clear target isolation.

## Search keywords

- wrong Firebase project
- hosting regression
- invalid environment config
- incorrect Rules deployment

## Related tests

- `npm run product:qa`
- relevant emulator Rules suites

## Related manual sections

- Firebase Authentication
- Build, Deployment, and Recovery
