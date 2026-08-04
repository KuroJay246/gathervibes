# Phase 23J - CPB Production Apply

Date: 2026-07-21
Project: `gathervibeshub`
Database: Firestore Native `(default)`
Event: `CPB`
Event ID: `zhaPxi31cpqLAW0cuS20`

## Authorization

Accepted exact phrase:

`I APPROVE CPB MANIFEST D690D6B84A272F5189098F57E4643FAF6F5E628F98519B74369593ED31DE0828 FOR PHASE 23J FINAL APPLY PACKAGE AND SEPARATE CPB PRODUCTION APPLY AUTHORIZATION`

Manifest SHA256:

`D690D6B84A272F5189098F57E4643FAF6F5E628F98519B74369593ED31DE0828`

Workbook SHA256:

`77AF3050F82D97D12067728FC1314E51CA734F73B798AAD8D63C263421029D96`

## Scope Applied

Applied 65 CPB registration-finance proposals.

Field changes:

- `amountDue`: 65
- `amountPaid`: 58
- `balanceDue`: 58
- `paymentStatus`: 65
- `priceTier`: 65
- `ticketPrice`: 65
- `paymentMethod`: 9

Total field changes: 385

## Pre-Apply Gates

The production apply script required:

- Exact Phase 23J approval phrase.
- Manifest hash match.
- CPB event id match.
- Exactly 65 proposals.
- Supported fields only.
- Raw-audit artifact hash match.
- Every changed field covered by the raw-audit artifact.
- Live production raw values matching the final raw-value audit artifact.
- Backup written outside Git before write execution.

Dry-run result:

- Run ID: `PH23J_CPB_PRODUCTION_APPLY_20260721203622`
- Production drift detected: `false`
- Registration updates planned: 65
- Audit logs planned: 65
- Operations writes planned: 0
- Ticket writes planned: 0
- Check-in writes planned: 0
- Registration deletes planned: 0

Dry-run artifact:

`C:\Users\Jaylan\Desktop\GSV_CPB_Production_Apply\PH23J_CPB_PRODUCTION_APPLY_20260721203622\dry_run_result_masked.json`

## Production Apply Result

Apply run ID:

`PH23J_CPB_PRODUCTION_APPLY_20260721203643`

Output directory:

`C:\Users\Jaylan\Desktop\GSV_CPB_Production_Apply\PH23J_CPB_PRODUCTION_APPLY_20260721203643`

Writes performed:

- Registration updates: 65
- Audit logs created: 65
- Operations writes: 0
- Ticket writes: 0
- Check-in writes: 0
- Registration deletes: 0

Commit batches: 2

Script verification passed: `true`

Apply artifact:

`C:\Users\Jaylan\Desktop\GSV_CPB_Production_Apply\PH23J_CPB_PRODUCTION_APPLY_20260721203643\apply_result_masked.json`

Private backup artifact:

`C:\Users\Jaylan\Desktop\GSV_CPB_Production_Apply\PH23J_CPB_PRODUCTION_APPLY_20260721203643\backup_private.json`

## Independent Post-Apply Check

Read-only production verification after apply confirmed:

- Proposal count checked: 65
- Registration field verification failures: 0
- Audit logs expected: 65
- Audit logs missing: 0

## Guardrails Preserved

- No CPB registration was created.
- No CPB registration was deleted.
- No Operations Ledger document was written.
- No ticket assignment was changed.
- No check-in field was changed.
- No Firestore rules were changed.
- No Hosting deploy was performed.
- No private workbook or manifest content was committed to Git.

## Notes

The production apply used privileged Firebase CLI credentials through Firestore REST. Firestore Security Rules do not constrain privileged IAM writes, so this phase relies on the script locks, raw-audit validation, exact approval phrase, backups, and post-apply verification.

## Phase 23J-C Closeout - 2026-07-21

Closeout result: `CPB PRODUCTION APPLY CLOSED WITH OBSERVATIONS`

Final status: `APPLIED — VERIFIED — CLOSED`

Read-only production verification confirmed the completed apply batch `PH23J_CPB_PRODUCTION_APPLY_20260721203643` remains scoped to CPB event `zhaPxi31cpqLAW0cuS20` and manifest `D690D6B84A272F5189098F57E4643FAF6F5E628F98519B74369593ED31DE0828`.

Final registration verification:

- Exact matches: 65
- Mismatches: 0
- Missing registrations: 0
- Unexpected field changes: 0
- Registration creates: 0
- Registration deletes: 0
- Ticket/check-in protected fields unchanged for the affected registrations.

Final audit verification:

- Audit logs expected: 65
- Audit logs present: 65
- Audit duplicates: 0
- Append-only status: verified read-only; no cleanup, update, or delete was performed.
- Observation: the stored audit entries include the core event, target, actor, timestamp, manifest hash, approval hash, proposal id, changed fields, and raw-audit validation marker, but the audit entry detail payloads do not store every richer closeout field requested here (`batchId`, `workbookSha256`, `beforeValues`, `afterValues`, and explicit `success`). The private backup and apply artifacts preserve those values outside Git.

Final production UI acceptance:

- Overview displayed CPB with 71 registrations / 71 guests, BBD $5,420.00 registration payments recorded, and BBD $870.00 registration balance outstanding.
- Payments displayed 71 registration records / 71 guests, BBD $6,290.00 expected registration income, BBD $5,420.00 recorded registration payments, and BBD $870.00 outstanding registration balance.
- Guests & Registrations displayed BBD $6,290.00 expected registration income, BBD $5,420.00 recorded registration payments, BBD $870.00 outstanding balance, and BBD $770.00 to pay at door.
- Reports/Event Review agreed with Payments for 71 registration records / 71 guests, BBD $6,290.00 expected income, BBD $5,420.00 paid, and BBD $870.00 outstanding.
- Operations displayed registration-payment totals separately from the Operations Ledger, with Operations income, expenses, refunds, adjustments, and net position all at BBD $0.00.

Final status/filter acceptance:

- Paid: 56 total paid records, composed of 20 Fully Paid Early Bird, 34 Fully Paid General, and 2 Door Paid.
- Partial/pending: 2 partial-deposit records, each with BBD $50.00 paid and BBD $50.00 balance.
- Pending filter: 0 in Payments; Guests & Registrations shows the 2 pending/partial-deposit records under pending status.
- Door: 9 total door-method records in Payments, composed of 2 Door Paid and 7 To Pay at Door.
- To Pay at Door: 7 registrations / 7 guests, BBD $770.00.
- Outstanding Balance: 9 registrations / 9 guests, BBD $870.00 total, composed of BBD $770.00 To Pay at Door plus BBD $100.00 partial balances.
- Finance Review: 6 records, limited to non-proposal review rows after the manifest apply.
- Needs Follow-Up: 15 records in Payments, including finance-review, door-list, and partial follow-up rows.
- Registration search was verified with ticket code `CPB-054` and returned exactly one pending record with BBD $50.00 paid and BBD $50.00 balance.

Boundary verification:

- Operations Ledger entries for CPB: 0.
- Phase 23J Operations writes: 0.
- Ticket writes: 0.
- Check-in writes: 0.
- QR payload format remained `GSV:TICKET:{ticketCode}`.
- No Firestore rules, indexes, dependencies, or app-code changes were made for closeout.
- Workbook and applied manifest were not altered.

Responsive acceptance:

- Desktop `1440 x 1000`: passed for Overview, Guests & Registrations, Payments, and Reports; no document-level horizontal overflow.
- Tablet `834 x 1112`: passed with observation that the Payments data table remains an internally wide grid while the page itself does not horizontally overflow.
- Mobile `390 x 844`: passed with the same Payments table observation; totals and filters remained usable and document-level horizontal overflow was not present.

Console and Network:

- Chrome Default profile was used for authenticated organizer testing.
- Console errors/warnings during the read-only acceptance pass: 0 captured.
- Network inspection captured only expected document, script, Firebase Auth token/account lookup traffic for the read-only navigation pass; no Firestore Commit, BatchWrite, write stream, registration update, audit-log create, Operations write, ticket write, or check-in write request was observed.
- The in-app browser was available and authenticated but scoped to CODEX_TEST during probing, so Chrome was retained as the authoritative CPB acceptance browser.
- Computer Use was not available in the active tool list during closeout continuation; this limitation was recorded and acceptance continued with Chrome plus in-app browser availability checks.

Idempotency and package closeout:

- Duplicate apply was not executed.
- Static duplicate-apply verification confirmed current production no longer matches the raw pre-apply values, so the same manifest has 0 eligible safe writes without creating a new batch id.
- The local private apply package was marked `APPLIED — VERIFIED — CLOSED` at `C:\Users\Jaylan\Desktop\GSV_CPB_Production_Apply\PH23J_CPB_PRODUCTION_APPLY_20260721203643\closeout_status.json`.
- The local organizer approval package was marked consumed by the completed batch at `C:\Users\Jaylan\Desktop\GSV_New_CPB_Manifest_Approval\CPB_Phase23J_Approval_Consumed_By_Apply_Closeout.json`.
- Archive marker: `C:\Users\Jaylan\Desktop\GSV_CPB_Production_Apply\PH23J_CPB_CLOSEOUT_ARCHIVE_MARKER.json`.
- Private backup SHA256: `999709FC1E7E942D5002FB702FCB156798D2ACECD4EF0B9BCFCEC98967B76E63`.
