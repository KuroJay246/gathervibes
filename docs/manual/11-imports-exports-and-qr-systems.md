# Imports, Exports, and QR Systems

## Import Flow

```mermaid
flowchart TD
  Source[CSV, XLSX, pasted table] --> Parse[Parser and source type]
  Parse --> Mapping[Header mapping and sheet confirmation]
  Mapping --> Preview[Preview rows: valid, warning, needs review, blocked]
  Preview --> Duplicate[Duplicate and ticket code checks]
  Duplicate --> Confirm[Explicit final confirmation]
  Confirm --> Batch[Chunked Firestore writes + audit logs]
  Batch --> Review[Registration records and follow-up]
```

Supported sources: CSV, XLSX through `read-excel-file`, and pasted table rows. The app uses preview-first validation, explicit sheet confirmation, duplicate detection, ticket-code collision checks, and chunked writes with audits.

Exports are client-side generated files from `src/utils/exportUtils.js` and related finance/reconciliation helpers. Audit log and access-control collections are not included in ordinary organizer exports.
