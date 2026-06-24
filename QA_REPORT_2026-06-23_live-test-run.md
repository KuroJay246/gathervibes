# Gather & Savor Event Hub Live QA Test Run

Date: 2026-06-23
Project: `gathervibeshub`
Live target: `https://gathervibeshub.web.app/login`
Repo: `C:\Users\Jaylan\Documents\gathetr`

## Summary

Phase 8.2 appears present in the repo. The tracked file `tests/phase82-admin-polish.test.js` exists, the matching admin polish source files are present, and `node --test tests/phase82-admin-polish.test.js` passed all 7 tests.

Live QA could not complete because the live `/security` route did not return the app in Chrome. The browser showed `Error 503 first byte timeout` / `Error 54113` from a Varnish cache server after attempting to load `https://gathervibeshub.web.app/security`. The root route `/` returned HTTP 200 from `curl`, but Chrome also remained in a blank loading state for the root route during this run.

No app writes were performed.

## Evidence

- Chrome existing session was available and signed into Firebase console as the existing Google account.
- `https://gathervibeshub.web.app/security` in Chrome resolved to `Error 503 first byte timeout`.
- `curl -I -L --max-time 45 https://gathervibeshub.web.app/security` timed out with 0 bytes received.
- `curl -I -L --max-time 45 https://gathervibeshub.web.app/` returned `HTTP/1.1 200 OK`, `Content-Length: 1473`, `Last-Modified: Tue, 23 Jun 2026 19:01:37 GMT`.
- `Test-NetConnection gathervibeshub.web.app -Port 443` succeeded.
- Read-only Firebase admin verification scripts could not run because application default credentials were unavailable in this environment.

## Page Results

| Area | Result | Notes |
| --- | --- | --- |
| Login | Blocked / fail | App did not load from live browser route, so login could not be verified. No credentials were requested or created. |
| Dashboard | Blocked / fail | Not reachable because live app did not load. |
| Events | Blocked / fail | Not reachable because live app did not load. |
| Working event selection | Blocked / fail | Not reachable because live app did not load. |
| Registrations counts/filters | Blocked / fail | Not reachable live. Phase 8.2 local test confirms count bars and current-event bulk-action source coverage. |
| Import Center opens | Blocked / fail | Not reachable live. Phase 8.2 local test confirms editable preview, bulk actions, and ticket handling before confirm. |
| Tickets | Blocked / fail | Not reachable live. |
| QR privacy ticket-code only | Live blocked; local pass | Live QR UI was not reachable. Local tests/source confirm QR output remains ticket-code only and does not include personal contact details. |
| Check-in search | Blocked / fail | Not reachable live. |
| Communications | Blocked / fail | Not reachable live. Phase 8.2 local test confirms practical Communications admin polish. |
| QA Center | Blocked / fail | Not reachable live. Phase 8.2 local test confirms Run QA checks, Copy QA report, and QR payload privacy source text. |
| Settings/admin profile | Blocked / fail | Not reachable live. Phase 8.2 local test confirms My Admin Profile, photoURL, allowlist, and Danger Zone source text. |
| Old phase labels removed | Pass locally; live blocked | `rg "Phase [0-9]|AI Writing|Door List"` over active UI source files returned no matches, and the Phase 8.2 test passed this assertion. |

## Warnings

- Live `/security` appears unhealthy from this environment: browser produced `503 first byte timeout`, and command-line fetch timed out.
- Root `/` returned the app shell with `curl`, so the failure may be route/cache/browser-path specific rather than total Hosting outage.
- The read-only production fixture/count scripts require ADC and could not verify CODEX_TEST/CPB directly.

## Broken Buttons

No live app buttons could be tested because the app did not load. No broken buttons were identified from live interaction.

## CODEX_TEST Safety

CODEX_TEST was not modified. No test writes were made. CODEX_TEST appears safe from this run because it was untouched, but its live production state was not verified due to missing ADC and the live app load failure.

## CPB Status

CPB remained unchanged by this run because no app writes were performed and no destructive actions were attempted. Direct CPB fixture verification did not run because Firebase admin credentials were unavailable.

## Recommendation

Codex recommends a fix prompt:

Investigate Firebase Hosting live route health for `gathervibeshub.web.app/security`: reproduce the `503 first byte timeout`, verify Hosting rewrite behavior for SPA deep links, compare `/` versus `/security` cache behavior, and confirm the latest deployed build can load the authenticated admin app before rerunning live QA.
