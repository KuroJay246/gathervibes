# Runbook 4. Import and Data Repair

## Purpose

Repair import failures, invalid mapping, duplicate registration detection, ticket collisions, and legacy record shape issues.

## Symptoms

- Registration import fails before confirm or during chunked write.
- Spreadsheet mapping is invalid.
- Duplicate registration import warnings block progress.
- Ticket-code collision occurs.
- Old Firestore record is missing ownership or permission fields.

## Severity

Medium to High depending on whether live registration intake is blocked.

## Possible causes

- Unsupported sheet/header shape.
- Missing event price or finance data.
- Duplicate `sourceRowId`, ticket code, or strong contact match.
- Legacy records missing modern optional fields.
- Import preview data not normalized before write.

## Safety warnings

- Never bypass preview and validation to force-import data.
- Never bulk-write to production while the duplicate or ticket-collision root cause is unknown.

## Evidence to collect

- Source type and selected sheet.
- Header mapping status.
- Preview row classifications.
- Exact blocking row ids and ticket codes.
- Existing registration ids involved in collisions.

## First checks

1. Confirm the selected source type matches the file or pasted data.
2. Confirm the sheet selection step completed for XLSX sources.
3. Confirm duplicate warnings are event-scoped, not cross-event assumptions.
4. Confirm ticket codes are unique within the active event.

## Files to inspect

- `src/pages/ImportsPage.jsx`
- `src/services/importService.js`
- `src/utils/importUtils.js`
- `src/utils/xlsxImport.js`
- `src/utils/validators.js`
- `src/utils/qrTicketUtils.js`

## Commands to run

- `npm test -- tests/import-center.test.js`
- `npm test -- tests/import-center-workflow-upgrade.test.js`
- `npm test -- tests/xlsx*.test.js`

## Step-by-step diagnosis

1. Reproduce with a local copy of the source file and confirm where the workflow stops: source, mapping, validation, review, confirm, or result.
2. Compare incoming headers to the source-type expectations already defined in the app.
3. Inspect duplicate classification: soft warning, needs review, or hard block.
4. For ticket collisions, compare imported ticket codes to existing event registrations and earlier rows in the same batch.
5. For old records, normalize on edit rather than mutating historical production data in bulk without approval.

## Repair options

- Add or correct header mapping support.
- Improve preview normalization or safe defaults.
- Fix duplicate logic if it over-classifies across unrelated event rows.
- Remove or regenerate conflicting ticket codes in the proper ticket flow.

## Verification

- Import preview reaches final confirm without hidden writes.
- Confirmed import writes only valid event-scoped registration rows.
- Duplicate and ticket-collision protections remain active.

## Rollback

- Revert the import parser or mapping change and preserve the failing sample for future repair.

## Escalation conditions

- A fix would require rewriting historical production records without review.
- The imported source contains private or inconsistent data that cannot be normalized safely.

## Search keywords

- import failure
- spreadsheet mapping invalid
- duplicate registration
- ticket collision
- legacy record missing fields

## Related tests

- Import Center test suite
- finance and QR privacy tests

## Related manual sections

- Imports, Exports, and QR Systems
- Field-Level Firestore Dictionary
