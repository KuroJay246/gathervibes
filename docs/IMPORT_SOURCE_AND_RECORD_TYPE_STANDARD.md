# Import Source And Record Type Standard

## Sources

- Google Forms CSV: manual CSV export from Forms or linked Sheets.
- Google Sheets Export: manual File > Download > CSV export; no live sync.
- Excel Workbook: local `.xlsx` workbook parsing with worksheet selection.
- Custom CSV: unusual headers, payment lists, references, and exports.
- Paste Table: copied rows from CSV or spreadsheets.
- Copy Rows From Spreadsheet: copied visible spreadsheet rows.
- PDF Table Downloaded From Email: fallback guidance only; no automatic extraction.
- Google Forms Response Inbox: manual response review queue.

## Record Types

Guest Registration is the only Import Center record type that can continue to a confirmed write. Payment Update, Ticket Assignment, Operations Entry, Staff List, Vendor Application, Sponsor Inquiry, Feedback, and Custom Review Record are review-only in this prototype.

## Product Truth

Manual imports are not sync. Review queues are not automatic approvals. Unsupported record types must not imply a hidden write path.
