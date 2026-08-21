# Appendix E. Documentation Maintenance Procedure

## When this manual must be updated

- Any meaningful runtime change that affects routes, workflows, permissions, settings, schemas, statuses, calculations, imports, reports, or repair procedures.
- Any change to Firestore Rules, indexes, or admin service write shapes.
- Any UI reorganization that changes where operators find key controls.
- Any change that invalidates a screenshot, diagram, command reference, or runbook.

## Required maintenance actions

1. Update the affected source Markdown files first.
2. Regenerate diagrams if any flow, route, or permission relationship changed.
3. Replace screenshots when the visible interface, labels, or workflow steps changed.
4. Regenerate HTML and PDF:
   `npm run docs:generate`
5. Validate sources and final PDF:
   `npm run docs:validate`
   `npm run docs:pdf-check`
6. Run repository safety checks appropriate to the change:
   `npm run lint`
   `npm test`
   `npm run build`
   `npm run product:routes`
   `npm run product:docs`
7. When docs tooling changes, also run:
   `npm run product:qa`
   `npm run doctor:changed`
8. Replace the owner copy only after the final PDF passes visual and structural validation.

## Screenshot replacement rule

- Replace screenshots when labels, layout, tabs, buttons, or critical data panels changed.
- Prefer `CODEX_DEMO`, local emulator data, or other non-sensitive synthetic records.
- Do not include passwords, tokens, private guest data, or `.env.local` values.
- Record filename, route, date captured, and redaction status in the screenshot catalogue.

## Diagram regeneration rule

- Regenerate diagrams whenever routes, auth flow, permissions, deployment workflow, import flow, QR flow, or troubleshooting flow changes.
- Keep editable Mermaid source under `docs/diagrams/`.
- Confirm the rendered SVG/PNG is readable at normal PDF zoom.

## Bookmark and link validation rule

- Every regenerated manual must have a non-zero bookmark count.
- TOC entries and major internal links must be checked during `docs:pdf-check`.
- If bookmarks disappear, treat the PDF as not releasable.

## Changelog rule

- Add a documentation changelog entry whenever the manual structure, rendering pipeline, appendices, screenshots, or runbooks change materially.
- State whether runtime app behavior changed. For documentation-only work, state that it did not.
