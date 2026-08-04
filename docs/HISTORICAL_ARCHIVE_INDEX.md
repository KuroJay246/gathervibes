# Historical Archive Index

This repository keeps historical evidence, but historical files are not current operating instructions. Current behavior is documented in:

- [GSV_MASTER_SYSTEM_REFERENCE.md](./GSV_MASTER_SYSTEM_REFERENCE.md)
- [GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md](./GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md)
- [PRODUCT_GUIDE.md](./PRODUCT_GUIDE.md)
- [ROUTE_MAP.md](./ROUTE_MAP.md)
- [PROTOTYPE_DEMO_GUIDE.md](./PROTOTYPE_DEMO_GUIDE.md)

## Archive Structure

- `docs/archive/phases/`: phase plans, phase results, release-alignment notes, and implementation history.
- `docs/archive/releases/`: release results, refinement results, hotfix results, and completed feature-result documents.
- `docs/archive/audits/`: audits, dry runs, acceptance evidence, compatibility reviews, root-cause reports, and QA reports.
- `docs/archive/legacy/`: previous root-level entrypoints that were preserved before being shortened.

## Interpretation Rules

- Historical files may mention retired `CODEX_TEST`, old phase names, obsolete deploy states, CPB-specific gates, or old workflow names.
- Those mentions are preserved for evidence only.
- Current synthetic QA uses `CODEX_DEMO - Full System Walkthrough`.
- CPB is a normal completed real event and must not receive synthetic QA writes.
- If a historical file conflicts with current docs, current docs win.

## Root Files Kept Active

- `README.md`: concise repository entrypoint.
- `AI_AGENT_RULES.md`: operational AI-agent rules.
- `PROJECT_HANDOFF.md`: concise current handoff.

## Preserved Legacy Root Content

- [legacy README](./archive/legacy/README_HISTORICAL_2026-08.md)
- [legacy PROJECT_HANDOFF](./archive/legacy/PROJECT_HANDOFF_HISTORICAL_2026-08.md)
