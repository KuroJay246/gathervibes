# Tickets, Check-In, Reports, and Reconciliation Refinement Plan

## Scope
- Phase 0: harden `npm run product:qa` emulator lifecycle on Windows.
- Phase 5: refine Tickets, Check-In, Reports, and Payment Reconciliation only.

## Tickets
- Current behavior: assignment actions were present, but the page centered the assignment controls more than the organizer decision flow.
- Organizer difficulty: quick answers like who has a ticket, who is checked in, and which record needs review required scanning dense rows.
- Event-day risk: slow review can cause duplicate issuance attempts or delayed door decisions.
- Visual problem: the desktop table overemphasized raw row detail, and mobile cards had no clear “view ticket” selection pattern.
- Responsive problem: ticket details were scattered instead of grouped.
- Security concern: none in the current write path; preserve explicit actions and existing validations.
- Proposed correction: add a summary row, a selected-ticket details panel, clearer desktop columns, and direct organizer links to Check-In without changing ticket writes.
- Must remain unchanged: QR payload, ticket code format, assignment validation, event scope, scanner interpretation.

## Check-In
- Current behavior: scanning and manual check-in were functional, but secondary helper content competed with the fastest door workflow.
- Organizer difficulty: the page did not foreground recent activity or the manual-search workflow strongly enough.
- Event-day risk: slower guest resolution at the door.
- Visual problem: useful counts and helper tools were present but not clearly tiered.
- Responsive problem: the page needed a stronger summary-first sequence before the detailed workspace.
- Security concern: preserve organizer-only corrections and scanner least privilege.
- Proposed correction: add a manual check-in framing block, compact attendance metrics, and a recent check-ins panel.
- Must remain unchanged: check-in confirmation writes, duplicate protection, undo permission boundaries, historical attendance separation.

## Reports
- Current behavior: the page contained the right information but led with dense sections before the clearest event summary and administrative review.
- Organizer difficulty: closeout review and event summary required more scanning than necessary.
- Event-day risk: low; primary risk is administrative confusion after the event.
- Visual problem: too many metrics arrived at the same visual weight.
- Responsive problem: summary and closeout items were not separated enough from detailed finance sections.
- Security concern: keep Reports read-only.
- Proposed correction: add a top Event Summary section, a distinct Event closeout review section, and move reporting boundaries into a dedicated lower section.
- Must remain unchanged: registration vs guest distinction, payment vs Operations separation, read-only behavior, current vs post-event wording.

## Payment Reconciliation
- Current behavior: dry-run logic was sound, but the UI made classification and evidence review harder to interpret at a glance.
- Organizer difficulty: payment balance and evidence discrepancy could still feel too close together in the presentation.
- Event-day risk: moderate administrative misinterpretation.
- Visual problem: the wide table carried too much priority and had no selected-record review surface.
- Responsive problem: mobile depended too heavily on the table shape.
- Security concern: preserve preview-only behavior and avoid payment writes here.
- Proposed correction: add a framing section for payment balance vs evidence discrepancy, a selected-item details panel, and mobile-friendly cards.
- Must remain unchanged: preview-only architecture, supported proposal fields, event scope, no write actions.
