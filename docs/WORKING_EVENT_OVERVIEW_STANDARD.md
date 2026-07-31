# Working Event Overview Standard

Date: 2026-08

## Purpose

Overview is the organizer's first scan of the selected Working Event. It should answer:

- Which event is selected?
- When and where is it happening?
- What status is it in?
- What information is already recorded?
- What needs attention?
- What practical action should be opened next?

Overview is not a long-form report, idea generator, research assistant, or accounting system.

## Required Sections

1. Working Event context: event name, date, venue, status, and event-change action.
2. Current Snapshot: source-supported operational metrics.
3. Needs Attention: detected conditions with one relevant destination link.
4. Quick Actions: route-backed and permission-aware organizer actions.
5. Recent Activity: concise, safe summaries from existing records where timestamps are available.
6. Secondary details: event setup, financial snapshot, planning progress, and upcoming events behind disclosure where practical.

## Supported Snapshot Metrics

- Registration records
- Guests
- Registration Payments Received
- Registration Payments Outstanding
- Tickets Issued
- Check-Ins
- Operations Expenses Recorded
- Outstanding Commitments

## Financial Boundaries

Overview must not merge:

- planned figures;
- Registration Payments;
- Operations entries.

Overview must not label values as:

- profit;
- net income;
- cash position.

Registration payment totals and Operations ledger totals remain separate concepts.

## Empty States

Empty states should say what is unavailable and what the organizer can do next:

- No Working Event: open Events and choose or create one.
- No registrations: add a registration or use Import Center.
- No payment evidence: open Registration Payments.
- No Operations entries: open Operations.
- Test Event selected: treat it as QA data, not real totals.
- Completed Event selected: allow audited corrections through normal workflows.

## Guardrails

- No new collections for Overview activity.
- No production writes during review.
- No CPB-specific behavior.
- CODEX_TEST remains the special QA/test event.
- QR payload remains `GSV:TICKET:{ticketCode}`.
