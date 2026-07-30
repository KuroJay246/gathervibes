# Full Repository Audit Evidence Manifest

Generated for Audit Pass 1 on 2026-07-30T16:16:59.942Z.
Updated for Audit Pass 2 on 2026-07-30.

## Git State
- Branch: `codex/full-repository-product-audit-2026-07`
- Base commit: `f65aeba9bcf5f44372f7a49816386cef547ebb46`
- Main/origin main expected: `f65aeba9bcf5f44372f7a49816386cef547ebb46`

## Structured Evidence
- `output/full-repository-audit/file-inventory.csv`: tracked-file inventory for 284 files.
- `output/full-repository-audit/file-review-status.json`: categorized file review status and counts.
- `output/full-repository-audit/test-results.json`: command results and output references.
- `output/full-repository-audit/dependency-results.json`: environment, direct dependency, outdated, audit, and React Doctor summary.
- `output/full-repository-audit/firestore-paths.json`: static Firestore path references.
- `output/full-repository-audit/risky-scan.json`: preliminary risky/dead-code keyword scan.
- `output/full-repository-audit/test-inventory.json`: test file inventory and static test-count metadata.
- `output/full-repository-audit/findings-pass1.json`: Pass 1 findings register.
- `output/full-repository-audit/route-matrix.json`: Pass 2 production route matrix.
- `output/full-repository-audit/browser-results.json`: Pass 2 authenticated production route-state probe for desktop and mobile boundary viewports.
- `output/full-repository-audit/console-network-results.json`: Pass 2 browser console classification and network-capture limitation.
- `output/full-repository-audit/tutorial-step-matrix.json`: Tutorial V3 source/E2E step matrix.
- `output/full-repository-audit/working-event-results.json`: CPB, CODEX_TEST, and no-selected Working Event browser checks.
- `output/full-repository-audit/findings.json`: Consolidated Pass 1 and Pass 2 findings register.

## Command Output Evidence
- `*.out.txt` and `*.err.txt` files in this folder contain saved stdout/stderr from each required validation command.
- E2E full failure context is also in Playwright's `test-results/` directory; that directory is not committed unless already tracked.
- `output/full-repository-audit/e2e-failure/direct-accessibility.out.txt`: direct emulator accessibility rerun, `2 passed`.
- `output/full-repository-audit/e2e-failure/direct-full-suite.out.txt`: direct emulator full E2E rerun, `10 passed`.

## Screenshot Evidence
- `output/full-repository-audit/screenshots/pass-2/`: 162 authenticated production screenshots across 18 routes and desktop/tablet/mobile viewport groups.

## Scope Notes
- Browser/visual/route-by-route product workflow inspection was intentionally excluded from Pass 1.
- Browser/visual/route-by-route product workflow inspection was added in Pass 2.
- No production records were modified by this pass.
- No application behavior files were intentionally changed; only docs and audit evidence were created.
