# Test Inventory And Coverage Map - 2026-07

## Summary
- Test/E2E files inventoried: 67
- Static `test(...)` declarations counted: 518
- Node test runner result: 505 total, 462 passed, 43 skipped, 0 failed.
- E2E smoke: passed.
- E2E full: failed one mobile accessibility/auth setup path after 9 tests passed.

## Coverage By Area
| Area | File Count |
| authentication | 1 |
| check-in | 3 |
| finance | 6 |
| google forms | 1 |
| imports | 2 |
| message builder | 2 |
| operations | 1 |
| registrations | 3 |
| scanner | 1 |
| system qa | 1 |
| test | 41 |
| tickets | 2 |
| tutorial | 3 |

## E2E Coverage
- `e2e/navigation.spec.js`: approved emulator organizer route access.
- `e2e/responsive.spec.js`: route reachability and overflow across required viewports.
- `e2e/accessibility.spec.js`: automated axe WCAG checks across organizer routes on desktop/mobile; mobile run failed before route audit due sign-in URL not advancing.
- `e2e/tutorial.spec.js`: tutorial replay, navigation, mobile retracing, completion.
- `e2e/workflows.spec.js`: planner event, registration/ticket/check-in finance journey, Operations, pasted import cleanup.

## Unit/Static Coverage Areas
- Authentication and return-path reliability.
- Route labels, route inventory, mobile navigation, scanner isolation.
- Event lifecycle, event categories, capabilities, completed-event behavior, CODEX_TEST handling.
- Tutorial V3 state machine, target registry, onboarding persistence, and rules boundaries.
- Registrations, buyer/attendee names, import mapping, duplicate detection, payment statuses, finance classifications.
- Tickets, QR payload, QR parsing, assignment/unassignment, check-in flows, scanner boundaries.
- Operations ledger, operations reports, financial boundary separation, in-kind support, commitments.
- Message Builder copy-only behavior, no OAuth/send/AI claims.
- Google Forms inbox/source packaging, signed receiver contract, HMAC/timestamp/idempotency checks.
- Firestore Rules static tests and emulator-backed permission tests.
- Product QA, production fixture verification scripts, private indexing, hosting headers.

## Skipped Tests
Skipped tests are mostly Firestore emulator conditional tests or onboarding rules when the emulator is not running in plain `npm test`. They execute under emulator-backed product QA/e2e where configured. Static skipped-count by file is in `output/full-repository-audit/test-inventory.json`.

## Coverage Risks
- Full E2E can still fail while unit/static tests pass; current failure is emulator auth setup in mobile accessibility path.
- Many tests are source/static assertions; they prove contracts are present, not that every production workflow was manually usable.
- Production writes are mostly protected by services and rules tests, but destructive event/registration deletes require deeper browser/workflow audit.
- Google Forms integration is packaged and tested, but live deployment/form access is not proven by Pass 1.
- Role coverage exists for scanner/viewer/operations helper, but production-role browser verification is Pass 2 scope.
- Some fixtures remain CPB-named for historical parser/reconciliation tests; this is not necessarily product coupling but requires continued separation from real production writes.
