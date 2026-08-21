# Appendix B. Command Safety Reference

Use this appendix before running any script that touches Firebase, emulator data, or owner-managed records.

| Command | Purpose | Safety class | Data target | Prerequisites | Expected result | Common failure |
| --- | --- | --- | --- | --- | --- | --- |
| `npm run docs:generate` | Render HTML and PDF manual outputs. | `LOCAL FILE WRITE` | `docs/generated`, owner-copy PDF folder | Node, Python PDF helper path, repo source docs | New HTML/PDF generated | Markdown/diagram/PDF helper failure |
| `npm run docs:validate` | Validate required docs source and generated artifacts. | `READ-ONLY` | Repository files | Generated docs exist | Pass message with file count | Missing appendix/runbook/manual file |
| `npm run docs:pdf-check` | Inspect PDF structure and render validation images. | `LOCAL FILE WRITE` | `output/pdf-validation/phase-3b` | Generated PDF, `pypdf`, `pypdfium2` | Bookmark/text/render checks pass and page PNGs exist | Missing helper dependency, raw syntax still visible |
| `npm run lint` | Static quality checks. | `READ-ONLY` | Repository source | Dependencies installed | Exit code 0 | ESLint violation |
| `npm test` | Unit/source-contract regression checks. | `READ-ONLY` | Local code only | Dependencies installed | All expected tests pass/skip | Source regression, date-sensitive failure |
| `npm run build` | Production bundle build. | `LOCAL BUILD OUTPUT` | `dist/` | Dependencies installed | Bundle generated | Vite import/config failure |
| `npm run product:routes` | Route inventory contract check. | `READ-ONLY` | Local code only | Node deps installed | Route count and labels pass | Route mismatch |
| `npm run product:docs` | Product documentation guardrails. | `READ-ONLY` | Local docs only | Docs current | Docs check passes | Stale language or missing docs |
| `npm run product:qa` | Full local QA wrapper including emulators and smoke. | `EMULATOR WRITE` | Local auth/firestore emulators only | Java runtime, free ports 8080/9099, installed browsers | All QA phases pass | Port collision, emulator startup failure, smoke E2E failure |
| `npm run doctor:changed` | Changed-scope React Doctor review. | `READ-ONLY` | Local code only | Clean Git base and installed deps | No issues found | Changed-scope React issue |
| `npm run e2e:smoke` | Chromium smoke test under emulators. | `EMULATOR WRITE` | Local emulators only | Free ports, Playwright browsers | Smoke route pass | Emulator startup or navigation failure |
| `npm run e2e:full` | Full Chromium E2E suite under emulators. | `EMULATOR WRITE` | Local emulators only | Same as smoke plus stable local runner | All E2E tests pass | Runner EPIPE, lingering ports, feature regression |
| `npm run admin:verify-production-fixtures` | Read-only confirmation that expected production fixtures exist. | `PRODUCTION READ` | Production Firestore | Safe credentials/session and explicit reason | Fixture report only | ADC or permission issue |
| `npm run admin:verify-production-counts` | Read-only production record counting. | `PRODUCTION READ` | Production Firestore | Same as above | Count report only | Wrong project, auth failure |
| `npm run admin:ensure-access` | Administrative access-control maintenance helper. | `ADMINISTRATIVE - VERIFY BEFORE RUNNING` | Production `settings/accessControl` unless redirected | Explicit approval and backup evidence | Access-control write completes | Wrong target project, protected owner risk |
| `npm run admin:replace-codex-test-with-demo` | Historical admin maintenance helper for demo-event migration. | `ADMINISTRATIVE - VERIFY BEFORE RUNNING` | Firestore records | Exact dry-run understanding | Intended migration only | Wrong event scope |
| `npm run firebase:deploy-hosting` | Deploy Hosting only. | `PRODUCTION DEPLOYMENT` | Production Hosting | Built app, approved release plan | Hosting release completes | Wrong project, stale assets, broken build |
| `npm run firebase:deploy-rules` | Deploy Firestore Rules and indexes. | `PRODUCTION DEPLOYMENT` | Production Firestore Rules/indexes | Emulator rule tests, approval, exact diff review | Rules/index deployment completes | Authorization regression or wrong project |
| `npm run firebase:deploy-all` | Deploy Hosting plus Rules/indexes. | `PRODUCTION DEPLOYMENT` | Multiple production Firebase targets | Strong approval and validated all targets | All targets deploy cleanly | Mixed-target regression |

## Quick Safety Rules

- `READ-ONLY`: safe to run against the repository or production only when the command itself does not mutate state.
- `LOCAL FILE WRITE`: changes files in the working tree or generated artifact folders only.
- `LOCAL BUILD OUTPUT`: writes generated app assets only.
- `EMULATOR WRITE`: can seed, mutate, or clear local emulator data; never production.
- `PRODUCTION READ`: reads live Firebase state without mutating it.
- `ADMINISTRATIVE - VERIFY BEFORE RUNNING`: potentially mutates owner-managed settings or maintenance records and requires narrow intent.
- `PRODUCTION DEPLOYMENT`: deploys live infrastructure. Never run casually.
