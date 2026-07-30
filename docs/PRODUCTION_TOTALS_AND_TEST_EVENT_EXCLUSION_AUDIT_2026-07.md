# Production Totals and Test Event Exclusion Audit - 2026-07

Read-only production aggregate verification for CPB and CODEX_TEST. No production writes, edits, deletes, imports, reconciliations, or check-ins were performed.

## CPB Raw Aggregate Result

Event: CPB (`zhaPxi31cpqLAW0cuS20`)

- Status: completed.
- Test event: false.
- Registration records: 69.
- Guest count from `personsAttending`: 73.
- Amount due: BBD 6,530.00.
- Amount paid: BBD 6,530.00.
- Balance due: BBD 0.00.
- Fully paid status count: 59.
- Door status count: 6.
- Complimentary count: 4.
- Partially paid count: 0.
- Unpaid/pending/unknown count: 0.
- Assigned-ticket count: 68.
- Live checked-in count: 0.
- Historical-attendance count: 0.

## CPB Operations Aggregate

- Operations entries: 6.
- Operations income: BBD 0.00.
- Operations expenses: BBD 3,502.88.
- Paid expenses: BBD 2,452.88.
- Outstanding commitments: BBD 1,050.00.
- In-kind contributions: 3.
- Operations cash position: BBD -2,452.88.

Dashboard and Payments showed the core CPB totals: 69 registrations, 73 guests, and BBD 6,530 received. Reports showed registration/guest counts and no error boundary. Operations showed the separate Operations ledger totals and no error boundary.

CODEX_TEST (`xPfa0b3KZyLSDnAD2uGI`) exists and is classified as a test event. Production Events default mode hid CODEX_TEST and displayed `1 event shown - test events hidden`. `Show Test Events` revealed CODEX_TEST and changed the list to `2 events shown`.

Evidence:

- `output/full-repository-audit/pass-4/read-only-production-totals.json`
- `output/full-repository-audit/pass-4/ui-total-comparison-text.json`
- `output/full-repository-audit/pass-4/codex-test-visibility.json`
