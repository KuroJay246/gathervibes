# Final Accessibility and Responsive Acceptance

## Automated Coverage

The release gate uses lint, unit tests, product route inventory, product QA, smoke E2E, full E2E, and React Doctor. Full E2E includes organizer route navigation, responsive overflow checks, desktop accessibility checks, mobile accessibility checks, tutorial replay, and representative write-safe workflows against emulators.

## Routes Covered by E2E

- Overview
- Events
- Tasks
- Guests & Registrations
- Registration Payments
- Reconciliation Preview
- Tickets
- Check-In
- Operations
- Message Builder
- Reports
- Import Center
- Settings
- System QA
- Scanner

## Manual Limitations

Automation approximates responsive reflow through viewports. True Chrome 200 percent browser zoom and final authenticated production visual acceptance still require human browser control when unavailable to Codex.

## Required Guardrails

- No document-level horizontal overflow.
- Working Event context remains visible.
- Tables use contained scrolling where needed.
- Tutorial controls remain reachable.
- Dialogs and forms remain keyboard reachable.
- Status is not conveyed by color alone.
