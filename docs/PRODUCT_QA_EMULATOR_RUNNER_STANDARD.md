# Product QA Emulator Runner Standard

## Root cause
- `product:qa` previously started one Firestore emulator session for rules tests and then immediately started a second nested emulator session through `npm run e2e:smoke`.
- On Windows this created an intermittent fixed-port restart race around Firestore `127.0.0.1:8080`.

## Standard
- `product:qa` owns one emulator lifecycle for all emulator-backed checks inside that run.
- Standalone `e2e:smoke` and `e2e:full` commands keep their own emulator lifecycle for independent use.
- Emulator-backed child commands must reuse the parent emulator session rather than starting another nested `emulators:exec`.

## Verification
- `product:qa` passed from a clean branch.
- `product:qa` passed twice sequentially.
- Standalone `e2e:smoke` passed after `product:qa`.
- `product:qa` passed again after standalone `e2e:smoke`.
- A temporary failing emulator-backed test returned a non-zero exit code and still shut down the emulator cleanly.

## Operational limits
- Do not rely on manual port cleanup.
- Do not kill unrelated Java or Node processes.
- Do not weaken emulator-backed rules or E2E coverage to avoid the port race.
