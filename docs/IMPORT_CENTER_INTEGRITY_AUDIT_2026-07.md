# Import Center Integrity Audit

Audit pass: Pass 3
Date: 2026-07-30
Scope: `ImportsPage`, import components, `importService`, `importUtils`, `xlsxImport`, import tests, and Firestore rules.

## Result

Import Center is preview-first and selected-event scoped. CSV, pasted rows, and XLSX import paths require mapping, validation, duplicate review, final preview, and explicit confirmation before writes.

## Verified Behavior

- No import writes occur before `commitImport`.
- Import state resets when Working Event changes.
- Existing registrations are loaded for selected-event duplicate checks before preview.
- Invalid rows and duplicate rows are blocked or require review.
- XLSX processing uses `read-excel-file`; `xlsx` remains absent.
- Spreadsheet formulas are not executed by application code.
- Import errors expose safe diagnostics without guest row values.
- Imported rows write registration plus audit log pairs.
- Completed-event imports are not CPB-special; they use normal selected-event safeguards.

## Findings

| ID | Priority | Finding |
| --- | --- | --- |
| PASS3-IMP-P2-001 | P2 | Import commit is chunked at 50 registrations/100 writes. A later chunk failure leaves earlier chunks committed, so recovery guidance must account for partial import state. |
| PASS3-IMP-P3-001 | P3 | Import preview can generate simple `IMP-###` ticket codes; this is safe within the checked batch but less descriptive than event-prefix generation. |
