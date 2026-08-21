# Runbook 8. Documentation Generation and PDF Repair

## Purpose

Repair failures in the technical-manual pipeline itself, including HTML rendering, diagram rendering, bookmark generation, and PDF quality validation.

## Symptoms

- Documentation generation fails.
- Raw Markdown appears in HTML or PDF.
- Mermaid appears as source text.
- PDF bookmarks are missing.
- TOC or internal links are broken.

## Severity

Medium for local docs work, High when the owner manual is the intended release artifact.

## Possible causes

- Missing docs dependencies.
- Markdown parser regression.
- Mermaid render failure.
- Bookmark post-processing failure.
- PDF helper dependency missing.

## Safety warnings

- Do not patch the generated PDF by hand.
- Fix the generator or source docs, then regenerate.

## Evidence to collect

- Failing docs command.
- Generated HTML excerpt showing bad output.
- PDF inspection metrics from `docs:pdf-check`.
- Rendered page PNGs and contact sheet.

## First checks

1. Run `npm run docs:generate`.
2. Run `npm run docs:validate`.
3. Run `npm run docs:pdf-check`.
4. Inspect the generated HTML and first few PDF pages.

## Files to inspect

- `scripts/docs/generateTechnicalManual.mjs`
- `scripts/docs/validateTechnicalDocs.mjs`
- `scripts/docs/pdfCheck.mjs`
- `scripts/docs/pdfTools.py`
- `docs/manual/*`
- `docs/runbooks/*`
- `docs/appendices/*`

## Commands to run

- `npm run docs:generate`
- `npm run docs:validate`
- `npm run docs:pdf-check`

## Step-by-step diagnosis

1. Confirm the source Markdown itself is correct and free of accidental raw HTML comments.
2. Confirm the Markdown parser is creating real table and heading HTML.
3. Confirm each Mermaid source file rendered to a real SVG before PDF generation.
4. Confirm the PDF helper can inspect text, add bookmarks, and render page PNGs.
5. Confirm the final PDF has no near-empty accidental pages.

## Repair options

- Restore or reinstall missing docs dependencies.
- Fix the Markdown/diagram transformation step.
- Update appendix or runbook source content if the generator is behaving correctly.

## Verification

- `docs:generate`, `docs:validate`, and `docs:pdf-check` all pass.
- First page is a real cover and no raw source markers remain.

## Rollback

- Revert the generator or source-doc commit that introduced the rendering regression.

## Escalation conditions

- PDF bookmarks cannot be generated with the selected local pipeline.
- Required screenshots or diagrams cannot be rendered readably after reasonable correction.

## Search keywords

- documentation generation failure
- raw Markdown in PDF
- Mermaid not rendered
- bookmark missing
- PDF quality validation failed

## Related tests

- `npm run docs:validate`
- `npm run docs:pdf-check`

## Related manual sections

- Documentation Maintenance Procedure
- Build, Deployment, and Recovery
