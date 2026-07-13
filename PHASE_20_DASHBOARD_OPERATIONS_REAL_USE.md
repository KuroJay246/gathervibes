# Phase 20 Dashboard + Operations Real Use

This guide is for day-to-day admin use inside the private Gather & Savor Event Hub.

## What is ready now

- Dashboard is live for private admin use.
- Events is live for creating, editing, deleting, and selecting the Working Event.
- Registrations is live for guest records and finance review.
- Import Center is live for CSV, pasted rows, and XLSX preview-first imports.
- Tickets is live for ticket-code assignment and QR generation.
- Operations is live for sponsor income, expenses, refunds, and adjustments.
- Check-In and Scanner still exist, but they are not the main focus for regular admin work.

## How to choose a Working Event

1. Open `Events`.
2. Find the event you want to work on now.
3. Use `Select`.

The Working Event controls Registrations, Import Center, Tickets, Check-In, and Operations. It is a workspace selection only. It does not change the event status.

## How to use Dashboard

- Use Dashboard to confirm which Working Event is selected.
- Check registration count versus guest count before doing finance or door work.
- Review payment, ticket, check-in, and operations snapshots for the selected event.
- If Dashboard says no Working Event is selected, go to Events and choose one first.

## How to use Events

- Create the event once, then keep its details current.
- Use price tiers when the event has named pricing.
- Legacy base ticket price can still exist for older event setups.
- After editing or deleting an event, confirm the Working Event still makes sense.

## How to use Registrations

- Use Registrations for manual guest adds, edits, deletes, and finance review.
- Registration count means records.
- Guest count means total `personsAttending` across those records.
- Use filters for paid, pending, outstanding, missing ticket code, checked in, and review-needed work.

## How to use Import Center

- Import Center is preview-first.
- Upload CSV or XLSX, or paste rows.
- Review mapping first.
- Review blocked rows and duplicate warnings before confirming import.
- No rows should be written before final confirm.

## How to use Tickets

- Use Tickets to assign, generate, regenerate, or clear ticket codes.
- Search by guest, buyer, attendee, contact, or ticket code.
- QR payload stays ticket-code only.
- Missing ticket codes and review-needed rows can be filtered directly.

## How to use Operations

- Operations is for non-ticket money only.
- Use it for sponsor income, expenses, refunds, reimbursements, and adjustments.
- It stays separate from ticket sales.
- Search and filters affect the current view.
- Copy view and Print view use only the rows currently visible on screen.

## What not to touch

- Do not use access-request workflow controls as if they are live.
- Do not try to add staff or scanner emails to `approvedEmails`.
- Do not use CPB for QA or experiments.
- Do not treat Scanner as the main admin workflow unless you are doing event-day testing.

## CPB warning

CPB is protected production data. Do not use it for QA, imports, scanner testing, or cleanup practice.

## CODEX_TEST guidance

Use `CODEX_TEST Live Verification Event` for safe QA and smoke checks only. Do not create a new daily test event when CODEX_TEST already covers the check.

## Access workflow status

Access request workflow is still not live.

- requester submit is not live
- approve/decline/revoke is not live
- staff assignment editing is not live

## Scanner note

Scanner is secondary in this phase. Use it only when event-day testing or check-in testing is actually needed.
