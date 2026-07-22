# Phase 23N Subsets 1-4 Production Apply

## Result

CPB Phase 23N Subsets 1-4 were applied with observations on 2026-07-22.

- Firebase project: `gathervibeshub`
- Event ID: `zhaPxi31cpqLAW0cuS20`
- Apply batch ID: `PH23N_SUBSETS_1_4_PRODUCTION_APPLY_2026-07-22T043009926Z`
- Manifest SHA256: `A85D7F883436B75F991A5B8E06E5724B82497237F4C4D19C88D562642F32E179`
- Manifest raw file SHA256 observed at apply: `1CDE1E6B7B55341143C4528FBCE680EF755AD7855D77B435159A81D1F67C71C7`
- Workbook SHA256: `F0768C15954807F1EA4B3E38B24E67FB60ACC16D8A88FB5F16659E287B59C321`
- Scoped authorization path: `C:\Users\Jaylan\Desktop\GSV_CPB_Phase23N_Reconciliation\PHASE_23N_SUBSETS_1_4_PRODUCTION_APPLY_AUTHORIZATION.json`
- Private backup path: `C:\Users\Jaylan\Desktop\GSV_CPB_Phase23N_Production_Apply\PH23N_SUBSETS_1_4_2026-07-22T043009926Z`
- Private backup SHA256: `1AC638E5C18FE8F4D812202F77CF64338D5EA19D227B8537D6F9E30E181716AF`

## Approval Scope

Approved subsets:

- Subset 1: Verified Operations
- Subset 2: Organizer-Reported Operations
- Subset 3: In-Kind Sponsorship
- Subset 4: Event Audit and Corrective Actions

Excluded subsets:

- Subset 5: Registration Evidence Metadata
- Subset 6: Registration/Attendance Corrections

No production write was made to registrations, guests, registration-finance fields, tickets, check-ins, Christina Morris, Paula Gittens, Rossy Donawa, or any other blocked identity record.

## Applied Proposals

- Approved proposal count: 21
- Applied proposal count: 21
- Skipped proposal count: 1
- Blocked proposal count: 3 identity records remain locked
- Failed proposal count: 0
- New Phase 23N apply audit logs expected: 21
- New Phase 23N apply audit logs present: 21
- Audit duplicates: 0

Applied proposal IDs:

- `P23N-OP-LESC-VENUE`
- `P23N-OP-BAKER-PAID-SCHEDULE`
- `P23N-OP-BAKER-OUTSTANDING-SCHEDULE`
- `P23N-SPONSOR-01`
- `P23N-SPONSOR-02`
- `P23N-SPONSOR-03`
- `P23N-EVENT-AUDIT-SUMMARY`
- `P23N-ATTENDANCE-OBSERVATION`
- `P23N-ACTION-01` through `P23N-ACTION-13`

Skipped proposal:

- `P23N-OP-CAKE-BOXES-PRINTING`: not written as an Operations ledger expense. The cake-box/printing issue remains represented as an open corrective evidence task so the approved BBD 1,050 outstanding-commitment total is preserved.

Blocked identity records:

- `EB-07`: Christina Morris
- `GA-09`: Paula Gittens
- `GA-11`: Rossy Donawa

## Operations Totals

Before apply:

- Operations income: BBD 0.00
- Paid expenses: BBD 0.00
- Outstanding commitments: BBD 0.00
- In-kind contribution records: 0

After apply:

- Operations income: BBD 0.00
- Paid expenses: BBD 2,452.88
- Outstanding commitments: BBD 1,050.00
- In-kind contribution records: 3
- Operations net cash position: BBD -2,452.88
- Final-profit status: Not Yet Determinable

Paid expenses:

- LESC venue and fifteen tables: BBD 1,227.88
- Organizer-reported baker paid schedule: BBD 1,225.00

Outstanding commitments:

- Organizer-reported baker outstanding schedule: BBD 1,050.00

In-kind sponsor records:

- Roberts Manufacturing: BBD 0.00 cash impact
- Bajan Pure/NPURE: BBD 0.00 cash impact
- Massey Distributions: BBD 0.00 cash impact

## Event Audit

The CPB event now includes the Phase 23N documentary financial evidence audit with:

- Audit date: July 21, 2026
- Audit status: Qualified / Incomplete Reconciliation
- App registrations: 71
- App guests: 71
- Approximate attendance: 70
- Gmail-supported ticket spaces: 57
- Attendance evidence gap: 13
- Directly verified ticket income: BBD 4,115.00
- Inferred ticket value: BBD 1,300.00
- Maximum Gmail-supported value: BBD 5,415.00
- App payments received: BBD 5,420.00
- Unresolved variance: BBD 5.00
- Venue paid: BBD 1,227.88
- Baker paid organizer-reported: BBD 1,225.00
- Baker outstanding organizer-reported: BBD 1,050.00
- Baker variance: BBD 25.00
- Final profit: Not Yet Determinable

The 13 corrective actions remain open evidence tasks and did not create paid transactions.

## Registration And Check-In Lock

Before and after apply:

- Registration count: 71 / 71
- Guest count: 71 / 71
- Expected total: BBD 6,290.00 / BBD 6,290.00
- Received total: BBD 5,420.00 / BBD 5,420.00
- Outstanding total: BBD 870.00 / BBD 870.00
- System check-ins: 0 / 0
- Registration document hash: unchanged
- Ticket documents: unchanged at 0 matching CPB ticket collection documents
- Check-in documents: unchanged at 0 matching CPB check-in collection documents

## UI Verification

Authenticated Chrome production verification confirmed:

- Overview shows unchanged registration finance totals and the documentary financial audit.
- Overview shows final profit as not yet determinable.
- Operations shows CPB Operations entries now: 6.
- Operations shows LESC BBD 1,227.88, baker BBD 1,225.00 paid / BBD 1,050.00 outstanding, and three in-kind sponsor records.
- Payments keeps registration totals separate at BBD 6,290.00 expected, BBD 5,420.00 received, and BBD 870.00 outstanding.
- Reports route `/event-review` shows registration and Operations boundaries, open Operations item, and audit/final-profit warnings.
- Check-In shows 0 checked-in registrations, 0 checked-in guests, approximate attendance only as an evidence reconciliation observation, and no historical check-ins created.
- Tickets shows 71 assigned registrations and no ticket-write evidence from this apply.

Console/network observation:

- No app Firestore permission error or failed production write was observed during the Chrome verification pass.
- Chrome dev logs contained one extension-style async response warning on `/tickets`; it was not a Firestore write failure.
- Computer Use initialized successfully, but the active Gather & Savor browser tab was not exposed as a targetable desktop window; Chrome plugin verification was used for page-level evidence.

## Idempotency

Read-only idempotency verification confirms that the same manifest SHA256, event ID, and proposal IDs now resolve to existing Operations ledger records, event audit data, and append-only audit logs. A future safe reapply check should return already applied, 0 safe new writes, no new batch, and no duplicate audit logs.

## Deployment And Source Control

- Firestore rules unchanged.
- Firestore indexes unchanged.
- Dependencies unchanged.
- Hosting not deployed because the tracked repository change is documentation only.
- No private workbook, manifest copy, authorization copy, backup JSON, or private financial artifact was committed to Git.

## Observations

- The approved manifest digest appears as the embedded `manifestSha256` in the manifest. The raw serialized file hash at apply time was `1CDE1E6B7B55341143C4528FBCE680EF755AD7855D77B435159A81D1F67C71C7`; this was preserved in private artifacts and audit details.
- `P23N-OP-CAKE-BOXES-PRINTING` was excluded from Operations ledger writes because the approved post-apply position requires BBD 1,050 outstanding commitments and explicitly prevents adding the BBD 175 cake-box item as a paid expense. The evidence gap remains tracked through the event audit and corrective actions.
