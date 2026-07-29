# Current State Application Map Evidence Manifest

Date: 2026-07-29
Branch: `codex/full-current-state-application-map`
Base commit inspected: `a89e60b88068c350ebbf63735754e24577a40b58`

## Evidence Created In This Branch

- `docs/FULL_APPLICATION_CURRENT_STATE_MAP_2026-07.md`
- `docs/PAGE_BY_PAGE_LAYOUT_AND_CODE_MAP_2026-07.md`
- `docs/DATA_MODEL_SECURITY_AND_INTEGRATION_MAP_2026-07.md`
- `docs/EVENT_AGNOSTIC_ARCHITECTURE_ASSESSMENT_2026-07.md`
- `docs/KNOWN_PRODUCT_AND_DATA_DISCREPANCIES_2026-07.md`

## Validation Results

- `npm run product:routes`: passed, 15 routes and 12 navigation labels.
- `npm run lint`: passed.
- `npm test`: passed, 477 total, 434 passed, 43 skipped, 0 failed.
- `npm run build`: passed.
- `npm ls xlsx`: absent.
- `npm ls read-excel-file`: `read-excel-file@9.2.0`.
- `git diff --check`: passed before validation.
- `npm run doctor:json`: exited successfully; React Doctor reported `ok: true`, 161 diagnostics, 1 error-class diagnostic, and 160 warnings.
- `npm run product:qa`: failed at final `npm audit --omit=dev` step after lint/test/build/e2e smoke passed.
- `npm audit --omit=dev`: failed with 2 high-severity vulnerabilities from `react-router@7.18.2` via `react-router-dom@7.18.2`; advisory range reported by npm audit is `react-router 7.12.0 - 8.2.0`.

The audit failure was not fixed in this branch because the branch scope is documentation and evidence only. A separate dependency/security branch should resolve it with a targeted package update and full validation.

## Screenshot Status

No new screenshots were captured in this documentation-only pass.

Reason: this pass is constrained to repository/source inspection and validation artifacts. It does not perform production writes or modify app behavior. Prior authenticated production and responsive screenshot evidence is documented in `docs/FULL_STACK_PRODUCT_REALITY_AUDIT_2026-07.md` under `output/phase23u-production-acceptance/`.

If a fresh screenshot matrix is required, run it as a separate authenticated-browser QA task against `CODEX_TEST Live Verification Event` and keep CPB unselected.

## Production Data Status

No production data was read for modification or changed by this task.

CPB was not selected, edited, imported into, checked in, reconciled, or otherwise modified.
