# Gather & Savor Full-Stack Product Reality Audit

Date: 2026-07-23  
Branch: `codex/phase-23u-full-stack-reality-audit`  
Base commit: `bbc5f27f1cae92acdccdc538c607c9ec0b3d40a9`  
Firebase project: `gathervibeshub`

## Result

**FULL-STACK PRODUCT HOLD**

The established production-readiness gates pass for Chromium and Firefox after a Phase 23U test-environment repair. The release is held because authenticated production Chrome smoke, Hosting deployment, and final production acceptance were not completed in this pass. WebKit remains an emulator-lab limitation: Playwright WebKit on Windows still reports Firestore emulator transport/access-check instability on mobile and during route churn. This was not reproduced in Chromium or Firefox and was not treated as evidence of a production Safari regression without a real Safari device check.

No CPB production data was read for modification or changed. No Firestore rules, indexes, Functions, Storage, Auth configuration, scanner permissions, QR payload, access workflow, or CPB finance totals were changed.

## Product Reality Findings

### Fixed

- The Playwright E2E setup had no named browser projects, so required `--project=firefox` and `--project=webkit` commands were not real gates.
- Emulator browser tests used the same persistent Firestore cache path as normal browser sessions, which made emulator behavior more fragile across browsers.
- System QA wording only described persistence as disabled in test mode; it now also identifies emulator mode.

### Current Limitations

- Full `npm audit` reports dev-only transitive vulnerabilities from `firebase-admin@14.2.0` optional Google Cloud dependencies: `fast-xml-parser` and `uuid` paths. Production audit with `--omit=dev` is clean.
- React Doctor full scan reports 150 existing warnings and 0 errors. The changed-file React Doctor gate reports no issues.
- WebKit emulator E2E remains unstable after partial improvement. Chromium and Firefox pass the same route, accessibility, responsive, and workflow coverage.
- Firebase emulator tooling warns that Java 17 support will be dropped by future `firebase-tools@15`; the project currently uses pinned `firebase-tools@14.19.0` for emulator gates.

## Validation Evidence

| Gate | Result |
| --- | --- |
| `git branch --show-current` | `codex/phase-23u-full-stack-reality-audit` |
| Base `main` / `origin/main` | `bbc5f27f1cae92acdccdc538c607c9ec0b3d40a9` at audit start |
| Firestore database | Native `(default)` database verified for `gathervibeshub` |
| `npm run lint` | Passed |
| `npm test` | Passed: 434 total, 411 passed, 23 skipped, 0 failed |
| `npm run build` | Passed |
| `npm audit --omit=dev` | Passed: 0 vulnerabilities |
| `npm audit` | Fails on dev-only transitive `firebase-admin` optional dependencies |
| `npm ls xlsx` | Absent |
| `npm ls read-excel-file` | `read-excel-file@9.2.0` present |
| `npm run product:qa` | Passed |
| `npm run e2e:full` | Passed: Chromium 8/8 |
| `npm run e2e:firefox` | Passed: Firefox 8/8 |
| `npm run e2e:webkit` | Fails: Playwright WebKit emulator/mobile access-check instability |
| `npm run doctor:changed` | Passed: no issues found |
| `npm run product:routes` | Passed: 15 routes, 12 navigation labels |
| `npm run product:copy-scan` | Passed: 15 primary UI files |
| `git diff --check` | Passed before report creation; rerun required before final merge |

## Route And UX Coverage

Automated route coverage includes:

- `/dashboard`
- `/events`
- `/registrations`
- `/payments`
- `/payments/reconciliation`
- `/imports`
- `/tickets`
- `/check-in`
- `/operations`
- `/event-review`
- `/communications`
- `/settings`
- `/qa`

The Chromium and Firefox suites cover:

- Authenticated organizer route access.
- Desktop and mobile automated accessibility checks.
- Required viewport overflow checks.
- Event creation through the planner.
- Registration, ticket, and check-in workflow.
- Operations paid, outstanding, and in-kind workflow with cleanup.
- Pasted-table import preview, confirm, and cleanup.

## Visual Fit And Navigation

The automated responsive matrix found no page-level horizontal overflow in Chromium and Firefox. Tickets and Check-In remain first-class event-day routes. Message Builder, Reports, Payments, Settings, and System QA labels remain route-stable.

Authenticated Chrome Default-profile manual production review was not completed in this pass; the current acceptance status is based on automated local emulator browser coverage and source inspection. A production browser smoke should be run before any Hosting deployment decision.

## Data And Financial Boundaries

- CPB locked patron finance target remains the documented baseline: 69 registrations, 73 guests, BBD 6,530 expected, BBD 6,530 received, BBD 0 patron outstanding.
- No CPB production writes were performed.
- No CPB import, check-in, ticket, Operations, or audit-log mutation was performed.
- Registration payment calculations and Operations ledger calculations were not changed.
- Registration payments and Operations remain separate reporting surfaces.
- QR payload remains `GSV:TICKET:{ticketCode}`.

## Security And Access Guardrails

- `firestore.rules` unchanged.
- `firestore.indexes.json` unchanged.
- `approvedEmails` unchanged.
- Protected owner and secondary organizer boundary unchanged.
- Scanner remains assigned-event scoped by existing code/rules.
- Normal scanner Undo Check-In and Check Out were not enabled.
- Lead-scanner path was not activated.
- Access-request workflow remains disabled in organizer UI.
- Audit logs remain append-only by existing rules/tests.

## Files Changed

- `package.json`: preserves Chromium default E2E scripts and adds explicit Firefox/WebKit audit scripts.
- `playwright.config.js`: adds named Chromium, Firefox, and WebKit projects plus an explicit assertion timeout.
- `src/lib/firebase.js`: disables persistent cache for emulator browser sessions and uses long-polling transport against the Firestore emulator.
- `src/utils/runtimeHealth.js`: updates offline persistence wording for test and emulator modes.
- `tests/phase14-camera-checkin.test.js`: adds emulator persistence guard coverage.
- `docs/FULL_STACK_PRODUCT_REALITY_AUDIT_2026-07.md`: this audit artifact.

## Deployment Position

Do not deploy from this branch yet.

Reason: WebKit emulator limitation and authenticated production Chrome smoke remain unresolved observations. The changes are safe local/tooling/runtime-test improvements, but Phase 23U should either accept WebKit-on-Windows emulator instability as non-blocking or schedule a focused Safari/WebKit validation pass before merge/deploy.

## Recommended Next Action

Run authenticated production Chrome smoke on `https://gathervibeshub.web.app` against `CODEX_TEST Live Verification Event`, then decide whether to classify WebKit emulator instability as non-blocking or create a focused Phase 23U-B browser-transport follow-up.
