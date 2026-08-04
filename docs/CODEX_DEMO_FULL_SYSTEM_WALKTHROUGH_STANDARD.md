# CODEX_DEMO Full System Walkthrough Standard

## Product Problem

`CODEX_TEST Live Verification Event` was an older QA fixture and was no longer clearly classified as the permanent training environment. Gather & Savor now uses one obvious synthetic event for demos, training, browser QA, import rehearsal, ticket checks, check-in rehearsal, Operations review, Run of Show, Resources, and Reports.

## Permanent Demo Event

- Event name: `CODEX_DEMO - Full System Walkthrough`
- Event ID: `codex_demo_full_system_walkthrough`
- Classification: Test Event
- Visibility: hidden from normal real-event lists by default, available through Show Test Events and System QA
- Data policy: synthetic `EXAMPLE -` records only

## Dataset Coverage

The demo event should include:

- event profile, date, venue, capacity, status, ticket tiers, capabilities, planning fields, readiness fields, and event-day notes
- registrations covering paid, pending, door payment, complimentary, ticket assigned, missing ticket, checked-in, and review-needed states
- ticket codes that preserve the QR payload contract `GSV:TICKET:{ticketCode}`
- Operations Ledger records covering income, expenses, reimbursements, pending commitments, and adjustments
- global synthetic contacts and organizations with `EXAMPLE -` names
- event-scoped contact links, tasks, documents, run-of-show items, and resources
- relationships among Run of Show, Resources, Contacts, Organizations, Tasks, Documents, Operations, and Commitments

## Real-Event Boundary

Real events, including Cake Piknik Barbados, are not used for synthetic QA. Real events remain editable by approved organizers through standard authentication, authorization, validation, confirmation, and append-only audit safeguards.

## Maintenance Rules

- Do not add real guest information to the demo event.
- Do not use CPB as the default QA event.
- Do not delete the permanent demo dataset during normal browser QA.
- Delete only accidental temporary demo records outside the approved dataset.
- Keep audit logs append-only.
- Update System QA, current docs, and tests when demo fixture identity changes.
- If an organizer cannot edit CODEX_DEMO, verify the account, Working Event selection, and System QA protected-owner status before changing source or rules.
- A reversible CODEX_DEMO write check must be restored to its original value before release closeout.

