# Tickets and Check-In Refinement Result

## Outcome
- Tickets is now summary-first with explicit counts for issued, missing, checked-in, unused, and review-needed ticket records.
- Tickets now exposes a selected-ticket detail panel so lower-priority record detail does not dominate the table or mobile cards.
- Mobile ticket cards now include direct `View Ticket` and `Check-In` actions.
- Check-In now leads with a manual check-in framing block and a recent check-ins panel before the heavier helper and list tools.

## Preserved behavior
- QR payload remains `GSV:TICKET:{ticketCode}`.
- Ticket issuance still requires an explicit organizer action.
- Duplicate ticket and duplicate check-in protections remain unchanged.
- Undo Check-In remains organizer/admin gated.
- Scanner navigation and permissions were not expanded.

## Files changed
- `src/pages/TicketsPage.jsx`
- `src/pages/CheckInPage.jsx`
- `tests/phase5-tickets-checkin-reports-reconciliation-refinement.test.js`

## Remaining limits
- Tickets still uses the existing assignment write flow and audit logic.
- Check-In still relies on the current registration-level record model and existing historical-attendance separation.
