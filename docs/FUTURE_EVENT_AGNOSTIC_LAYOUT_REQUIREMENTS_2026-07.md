# Future Event-Agnostic Layout Requirements

Date: 2026-07-29

## Purpose

This document converts the fresh rendered audit into requirements for a later event-agnostic layout improvement phase. It does not implement categories, templates, modules, Gmail, Google Forms, tutorial changes, CPB-specific modules, or data writes.

## Product Direction

Gather & Savor Event Hub should feel like a universal private event-operations system.

The layout should make the common event workflow obvious:

1. Select the Working Event.
2. Understand current status.
3. Manage registrations and guests.
4. Track registration payments separately from event-level Operations.
5. Prepare tickets.
6. Run Check-In.
7. Review reports.
8. Configure settings and run QA separately from daily work.

## Universal Capabilities

Universal capabilities should be available for most event types:

- Event setup.
- Working Event scoping.
- Guest and registration management.
- Registration payment status and follow-up.
- Ticket assignment.
- Event-day check-in.
- Event-level Operations ledger.
- Copy-only Message Builder.
- Read-only Reports.
- Import preview.
- Settings.
- System QA.

## Optional Capabilities

Optional capabilities should be enabled when useful and hidden or minimized otherwise:

- Ticketing.
- Public registration.
- Seating.
- Vendors.
- Sponsors.
- Suppliers.
- Bakers.
- Sessions.
- Speakers.
- Tasting zones.
- Allergens.
- Bridal party.
- Accommodation.
- Transportation.
- Certificates.

## Event-Category-Specific Capabilities

Potential future categories:

- Birthday.
- Bridal Shower.
- Wedding.
- Workshop.
- Cake Tasting.
- Cultural Experience.
- Corporate Event.
- Hospitality Event.
- Party.
- Private Event.
- Other.

Requirement:

- Event category should configure labels, optional sections, and planning prompts.
- It should not hardcode Cake Piknik behavior into daily navigation.
- CPB reconciliation history should remain an evidence/reporting concern, not the base product model.

## Layout Requirements

### App Shell

Requirements:

- Remove route-independent 320px overflow.
- Preserve strong Working Event visibility.
- Keep Check-In and Tickets prominent on mobile.
- Keep System QA out of primary mobile event-day navigation.
- Avoid exposing account email in evidence or shared screenshots.

### Overview

Requirements:

- Keep Overview focused on status, attention, event numbers, and next actions.
- Do not reproduce full Reports or full Operations here.
- Use compact metrics for small numeric values.
- Limit secondary disclosures to content that is not needed for day-to-day triage.

### Events

Requirements:

- Make event creation/editing primary and clear.
- Reduce the visual weight of empty planning numbers.
- Convert zero-heavy budget/cash values into compact metrics or secondary detail.
- Keep event-level planning separate from actual registration payment totals.

### Guests & Registrations

Requirements:

- Make the distinction between registration records and guests persistent.
- Reduce sideways table movement on desktop.
- Give mobile cards a simpler information hierarchy.
- Move finance audit detail behind a deliberate row-level detail affordance.
- Keep import, add, filter, and bulk actions visually separated.

### Payments

Requirements:

- Focus the page on registration payment follow-up.
- Keep documentary evidence and reconciliation context secondary.
- Do not combine registration payments with Operations ledger records.
- Avoid table-only workflows for mobile.

### Tickets

Requirements:

- Keep ticket preparation and QR state clear.
- Preserve QR privacy: `GSV:TICKET:{ticketCode}`.
- Keep group-size context visible without crowding every record.

### Check-In

Requirements:

- Keep event-day search, scan, and attendance state above secondary helpers.
- Preserve scanner-only boundaries.
- Separate system check-in from historical attendance confirmation.
- Do not create fake scan timestamps from organizer memory.

### Operations

Requirements:

- Keep Operations for event-level obligations: expenses, sponsor income, vendor/supplier payments, refunds, reimbursements, and adjustments.
- Do not imply guest payment totals live here.
- Separate ledger, partners, and evidence into clearer workflow zones.

### Message Builder

Requirements:

- Keep copy-only language.
- Do not imply automatic sending, WhatsApp sending, OAuth, AI generation, or delivery tracking.
- Keep recipients, templates, prompt builder, and copy output visibly distinct.

### Reports

Requirements:

- Keep Reports read-only.
- Preserve registration payments vs Operations separation.
- Keep current/post-event wording tied to event date.
- Keep attendance limitation wording visible.

### Settings

Requirements:

- Make organizer-count labels precise.
- State whether counts mean protected owner, approved emails, staff profiles, or event assignments.
- Keep technical details in Advanced/System QA.

### System QA

Requirements:

- Keep diagnostics and guardrails available but separated from event-day work.
- Keep CPB production-data protection visible.
- Keep access workflow disabled status honest.

## Priority Defects For Next Implementation

P0:

- None found in the fresh rendered measurement pass.

P1:

- App-level `320px` horizontal overflow on all routes.
- Events planning-number panel visually overweights small/empty budget values.
- Registrations desktop table remains wider than its wrapper.
- Registration disclosures and helper controls create heavy information density.

P2:

- Several help buttons measure below 44px.
- Settings tab strip requires horizontal movement on mobile.
- Some technical QA content remains long and dense by design.
- Check-In advanced/helper disclosures need clearer prioritization.

## Recommended Next Implementation Phase

Registration Payments and Operations Financial Boundaries.

Scope:

- Payment terminology.
- Ticket-revenue double-counting risk.
- Payment follow-up workflow.
- Registration financial totals.
- Operations reporting boundaries.
- Preparation for CPB reconciliation without altering CPB production data.
