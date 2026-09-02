# Gather & Savor Current Project Handoff

Last updated: 2026-08-26.

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

## Mobile And Cross-App Boundary

- Gather & Savor mobile is `com.gathervibeshub.staff` in Firebase project `gathervibeshub`; it is not Couple Book and must not share package IDs, emulator state, fixtures, credentials, or deployment assumptions with Couple Book.
- Android staff QA requires a dedicated clean GSV AVD with explicit device and AVD-name guard variables. The Couple Book `medium_phone` AVD is prohibited for this work.
- Web and mobile emulator runs use separate, application-scoped ports and `CODEX_DEMO` fixtures. Never create synthetic writes in CPB or any other real event.
- Provider integration source foundations may be present while OAuth consent, external registrations, secrets, and production webhooks remain owner-controlled. Do not report an integration as live until an authenticated end-to-end receipt is evidenced.
- Registration payments remain internal ledger/reconciliation records. No online payment gateway is in scope.

## Current Release Evidence

- Dedicated Android E2E: passed all 11 custom ADB/UIAutomator flows on the clean GSV AVD on 2026-08-26.
- Root product QA: passed on 2026-08-26, including lint, emulator-backed tests, browser smoke, production build, audit, route/docs checks, and advisory React Doctor.
- Firebase Hosting deployment was completed on 2026-08-26 for the web build only. The live response was verified with HTTP 200 and the explicit CSP/security headers. Firestore rules, indexes, functions, storage, and Auth were not deployed in that operation.
- Mozilla HTTP Observatory was rerun against the deployed host and returned A+ / 115 with 10 passed and 0 failed checks.
- Web App Check support is implemented in `src/lib/firebase.js`; the production web app is registered with reCAPTCHA Enterprise and the public site-key configuration is deployed. Authenticated production runtime reports initialized monitoring-mode App Check with no console errors. Enforcement remains disabled pending separate owner approval.
- The complete evidence ledger and visual/PDF package are in `output/web-production-completion/`. Authenticated owner verification, live provider OAuth/webhook verification, monitoring, backup/recovery, billing controls, iOS acceptance, and merge/push remain separately evidenced owner/release actions.
- Live owner-session acceptance was partially completed on 2026-08-26: Protected Owner was recognized by the live UID-backed app, CODEX_DEMO was selected, Settings/Staff/Integrations loaded, System QA reported 84/84 non-blocking checks, and captured live pages had no console errors. No production writes were submitted.
- Google Cloud inspection found the Firebase Browser and Android auto-created keys have empty application restrictions. Their API-target lists are broad Firebase service lists; owner action is required to add HTTP-referrer/package-plus-signing restrictions and then verify Auth/Firestore. No key rotation was performed.
- Firebase Console MFA was completed on 2026-08-26 for the signed-in owner account `jaylanspencer99@gmail.com`, restoring access to project `gathervibeshub`. The production web app is registered for reCAPTCHA Enterprise and the public site-key configuration is deployed; live authenticated initialization is verified in monitoring mode. The Android app `com.gathervibeshub.staff` is registered for App Check with Play Integrity. Enforcement is still off, API-key restrictions are not yet applied, and billing, backup/restore, monitoring receipt, and provider receipts remain unverified.
- Current provider statuses remain truthful in the live Settings surface: Google Forms receiver packaged but not deployed, Google Sheets manual CSV/Excel workflow, Gmail disconnected, Outlook authorization required, and Message Builder copy-only.
- Native preparation is present for bundle ID `com.gathervibeshub.staff`, Firebase iOS/Android configs, camera permission text, secure storage, Crashlytics, deep link `gsvstaff`, EAS profiles, and native App Check initialization. Current Android App Check provider selection is `debug` for emulator/development and `playIntegrity` for production. Physical iOS signing/device acceptance, debug-token registration, and web App Check remain owner actions.
- The Android owner-closeout run exposed a stale sign-in error banner that survived sign-out. The fix now clears provider and local sign-in errors on signed-out state; the release-like APK was rebuilt from current source and the guarded emulator regression passed 11/11 with an explicit stale-error assertion.
- Current Android native signing remains a release boundary: `apps/mobile/android/app/build.gradle` still maps the `release` build type to the debug keystore, so the active SHA-1/SHA-256 for both current debug and release-like local APKs are the Android debug certificate. Do not present this as final production signing.
- Final closeout PDF: `output/web-production-completion/reports/GSV_Final_Production_Closeout_and_Owner_Acceptance_Report.pdf`.
