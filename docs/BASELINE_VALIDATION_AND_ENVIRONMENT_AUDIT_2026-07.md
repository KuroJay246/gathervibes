# Baseline Validation And Environment Audit - 2026-07

## Environment
- Node: `v24.16.0`
- npm: `11.13.0`
- Java: `openjdk version "17.0.19" 2026-04-21 LTS; OpenJDK Runtime Environment Microsoft-13877129 (build 17.0.19+10-LTS); OpenJDK 64-Bit Server VM Microsoft-13877129 (build 17.0.19+10-LTS, mixed mode, sharing)`
- Firebase Tools from `npx firebase-tools --version`: `15.22.2`
- React: package range `^19.2.0`
- React DOM: package range `^19.2.0`
- Vite: package range `^7.2.4`
- Firebase SDK: package range `^12.6.0`
- React Router: package range `^8.3.0`
- Playwright: package range `^1.61.1`

## Command Results
| Command | Exit | Result |
| `npm ci` | 0 | Passed, but full dev audit notice reports 16 vulnerabilities and deprecated packages. |
| `npm run lint` | 0 | Passed |
| `npm test` | 0 | Passed: 505 total, 462 passed, 43 skipped, 0 failed |
| `npm run build` | 0 | Passed |
| `npm run product:routes` | 0 | Passed: 15 routes, 12 navigation labels |
| `npm run product:qa` | 0 | Passed |
| `npm run e2e:smoke` | 0 | Passed: 1 Chromium navigation test |
| `npm run e2e:full` | 1 | Failed: 9 passed, 1 mobile accessibility sign-in flow failed before axe route audit |
| `npm audit --omit=dev` | 0 | Passed: 0 production vulnerabilities |
| `npm outdated` | 1 | Non-zero because outdated dependencies exist |
| `npm ls xlsx` | 1 | Exit 1 with empty tree: xlsx absent as intended |
| `npm ls read-excel-file` | 0 | Passed: read-excel-file@9.2.0 |
| `npm run doctor:json` | 0 | Passed: React Doctor ok, 0 errors, 165 warnings |
| `git diff --check` | 0 | Passed |

## Test Totals
- Unit/static test runner: 505 total, 462 passed, 43 skipped, 0 failed.
- E2E smoke: 1 passed.
- E2E full: 9 passed, 1 failed. Failure evidence: `output/full-repository-audit/e2e-full.out.txt` and `test-results/accessibility-organizer-ro-8b402--or-AA-violations-on-mobile-chromium/error-context.md`.
- Focused rerun: exit 1 with no stdout/stderr in saved rerun files; treated as reproducible limitation for Pass 1.

## Dependency Audit
Production dependency audit is clean. `npm ci` still reports dev/tooling vulnerabilities because it audits the complete install graph. Outdated direct dependencies from `npm outdated`:

```text
Package                      Current   Wanted   Latest  Location                                  Depended by
@eslint/js                    9.39.4   9.39.5   10.0.1  node_modules/@eslint/js                   gathetr
@playwright/test              1.61.1   1.62.0   1.62.0  node_modules/@playwright/test             gathetr
@sentry/react                10.67.0  10.69.0  10.69.0  node_modules/@sentry/react                gathetr
@tailwindcss/vite              4.3.1    4.3.3    4.3.3  node_modules/@tailwindcss/vite            gathetr
@vitejs/plugin-react           5.2.0    5.2.0    6.0.5  node_modules/@vitejs/plugin-react         gathetr
eslint                        9.39.4   9.39.5   10.8.0  node_modules/eslint                       gathetr
eslint-plugin-react-refresh   0.4.26   0.4.26    0.5.3  node_modules/eslint-plugin-react-refresh  gathetr
firebase                     12.15.0  12.16.0  12.16.0  node_modules/firebase                     gathetr
globals                       16.5.0   16.5.0   17.8.0  node_modules/globals                      gathetr
lucide-react                 0.468.0  0.468.0   1.28.0  node_modules/lucide-react                 gathetr
react                         19.2.7   19.2.8   19.2.8  node_modules/react                        gathetr
react-doctor                   0.8.3    0.8.3    0.9.2  node_modules/react-doctor                 gathetr
react-dom                     19.2.7   19.2.8   19.2.8  node_modules/react-dom                    gathetr
read-excel-file                9.2.0    9.3.5    9.3.5  node_modules/read-excel-file              gathetr
tailwindcss                    4.3.1    4.3.3    4.3.3  node_modules/tailwindcss                  gathetr
vite                           7.3.5    7.3.6    8.2.0  node_modules/vite                         gathetr
```

## React Doctor
- Version: 0.8.3
- Result: `ok: true`
- Errors: 0
- Warnings: 165
- Affected files: 57

## Classifications
- Blocker: `npm run e2e:full` did not pass in this audit pass.
- Upgrade soon: Java 21 migration for Firebase emulator compatibility; outdated Firebase/React/Playwright/Vite ecosystem packages.
- Monitor: React Doctor warnings and development dependency vulnerabilities.
- No action: `xlsx` absence is expected and desired; `read-excel-file@9.2.0` remains active.
