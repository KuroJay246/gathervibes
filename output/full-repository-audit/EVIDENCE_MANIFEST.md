# Full Repository Audit Evidence Manifest

Generated for Audit Pass 1 on 2026-07-30T16:16:59.942Z.

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

## Command Output Evidence
- `*.out.txt` and `*.err.txt` files in this folder contain saved stdout/stderr from each required validation command.
- E2E full failure context is also in Playwright's `test-results/` directory; that directory is not committed unless already tracked.

## Scope Notes
- Browser/visual/route-by-route product workflow inspection was intentionally excluded from Pass 1.
- No production records were read through browser interaction or modified by this pass.
- No application behavior files were intentionally changed; only docs and audit evidence were created.
