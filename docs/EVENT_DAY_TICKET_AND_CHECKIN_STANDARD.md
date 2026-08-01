# Event-Day Ticket and Check-In Standard

## Core rules
- Tickets answer: who has a ticket, who still needs one, and who has already checked in.
- Check-In answers: who is at the door right now, whether the ticket is valid for the selected Working Event, and what action the organizer should take next.

## Required boundaries
- Keep QR payload exactly `GSV:TICKET:{ticketCode}`.
- Keep ticket issuance explicit; opening the page must never create a ticket.
- Keep duplicate ticket prevention and duplicate check-in prevention active.
- Keep scanner access assigned-event-only and outside organizer admin surfaces.
- Keep historical attendance distinct from live `checkedIn` state.

## Presentation rules
- Show compact summary metrics first.
- Put lower-priority record detail into a detail panel or disclosure.
- Keep mobile actions direct for event-day use.
- Do not use colour alone for ticket or check-in state.

## Correction rules
- Undo Check-In must remain explicit and audited.
- Organizer correction authority must not imply scanner correction authority.
