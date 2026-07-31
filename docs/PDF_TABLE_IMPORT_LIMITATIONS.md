# PDF Table Import Limitations

## Current Limitation

Import Center does not extract table data directly from PDFs. PDF files often contain layout text, scanned images, merged cells, or hidden ordering that can corrupt guest, payment, ticket, or Operations data.

## Safe Fallback

Use one of these options:

- Export the original spreadsheet as CSV.
- Save the original workbook as `.xlsx`.
- Copy visible table rows from the source and use Paste Table.
- Manually clean the data in a spreadsheet before importing.

## Deferred Work

Reliable PDF extraction would require a dedicated parser, review evidence, validation cases, and privacy controls. It is intentionally deferred and is not part of this prototype write path.
