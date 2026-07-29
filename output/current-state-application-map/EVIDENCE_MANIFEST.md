# Current State Application Map Evidence Manifest

Date: 2026-07-29
Branch: `codex/full-current-state-application-map`
Base commit inspected: `f61cb96d466975ca902e417025a1deff0445393c`

## Evidence Created In This Branch

- `docs/FULL_APPLICATION_CURRENT_STATE_MAP_2026-07.md`
- `docs/PAGE_BY_PAGE_LAYOUT_AND_CODE_MAP_2026-07.md`
- `docs/DATA_MODEL_SECURITY_AND_INTEGRATION_MAP_2026-07.md`
- `docs/EVENT_AGNOSTIC_ARCHITECTURE_ASSESSMENT_2026-07.md`
- `docs/KNOWN_PRODUCT_AND_DATA_DISCREPANCIES_2026-07.md`
- `output/current-state-application-map/screenshot-matrix.json`
- `output/current-state-application-map/key-screenshot-matrix.json`
- `output/current-state-application-map/screenshots/`

## Validation Results

- `npm run lint`: passed.
- `npm test`: passed, 477 total, 434 passed, 43 skipped, 0 failed.
- `npm run build`: passed.
- `npm audit --omit=dev`: passed with 0 vulnerabilities.
- `npm run product:routes`: passed, 15 routes and 12 navigation labels.
- `npm run doctor:json`: exited successfully after the React Doctor error fix on `main`.
- `npm run product:qa`: passed.
- `npm ls xlsx`: absent.
- `npm ls read-excel-file`: `read-excel-file@9.2.0`.
- `git diff --check`: passed.

## Screenshot Status

Fresh authenticated production screenshot evidence was captured using the existing Chrome profile.

Capture target:

- Production URL: `https://gathervibeshub.web.app`
- Selected event: `CODEX_TEST Live Verification Event`
- Capture mode: stable visible viewport
- Routes captured: 14
- Viewports captured: 7
- Total screenshots: 98
- Additional key-route verification matrix: 33 records across desktop, tablet, and mobile.

Routes:

- `/dashboard`
- `/events`
- `/registrations`
- `/payments`
- `/payments/reconciliation`
- `/imports`
- `/tickets`
- `/check-in`
- `/scanner`
- `/operations`
- `/communications`
- `/event-review`
- `/settings`
- `/qa`

Viewports:

- `1440 x 900`
- `1280 x 720`
- `834 x 1112`
- `768 x 1024`
- `430 x 932`
- `390 x 844`
- `360 x 800`

Matrix result:

- 0 loading-shell captures after final recapture.
- 0 missing `CODEX_TEST Live Verification Event` scope checks.
- 0 login fallbacks.
- 0 AppErrorBoundary fallbacks.
- 0 document-level horizontal overflow flags.
- Chrome/browser messaging noise was observed: `A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received`. This was classified as extension/browser noise, not a route-blocking app-originated failure.

## Production Data Status

No production data was read for modification or changed by this task.

CPB was not selected, edited, imported into, checked in, reconciled, or otherwise modified.
