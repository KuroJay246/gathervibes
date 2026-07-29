# Event Agnostic Architecture Assessment

Date: 2026-07-29
Branch: `codex/full-current-state-application-map`
Base commit inspected: `f61cb96d466975ca902e417025a1deff0445393c`

## Result

The app is structurally capable of supporting multiple event types because its core records are event-scoped and most operational workflows reference the selected Working Event. However, several user-facing panels and historical finance notes still carry CPB-specific language. The architecture is event-scoped, but the prototype presentation is not fully event-agnostic yet.

## Event-Scoped Strengths

- `events/{eventId}` is the primary scope object.
- Registrations store `eventId`.
- Operations ledger entries store `eventId`.
- Staff assignments are stored under `events/{eventId}/staffAssignments/{uid}`.
- Dashboard, Registrations, Payments, Tickets, Check-In, Operations, Message Builder, Reports, and System QA all depend on the selected Working Event.
- Scanner access is tied to assigned event access.
- CODEX_TEST exists as a safe QA event separate from CPB production data.

## Event-Type Flexibility

Current rules support these event types:

- `cake-picnic`
- `cake-tasting`
- `brunch`
- `tasting`
- `cultural-experience`
- `hospitality-event`
- `workshop`
- `party`
- `food-event`
- `vendor-pop-up`
- `private-food-experience`
- `private-event`
- `other`

This is broad enough for current Gather & Savor event prototypes, but type-specific copy and planning fields still need careful presentation so a private dinner, tasting, workshop, or pop-up does not inherit CPB-specific assumptions.

## Generic Capabilities Already Present

- Event metadata and date/location planning.
- Capacity and ticket price baseline.
- Price tiers.
- Registration requirement flags.
- Complimentary and door-payment flags.
- Registration open/close dates.
- Financial planning fields.
- Operations planning fields.
- Readiness checklist.
- Planning tasks.
- Partner records.
- Registration import.
- Ticket assignment.
- QR ticket generation.
- Check-in.
- Event-level Operations ledger.
- Copy-only Message Builder.
- Read-only Reports.

## CPB-Specific Surfaces

The following areas still show CPB-specific concepts or evidence:

- Dashboard displays CPB locked-history wording when CPB is selected.
- Registrations includes CPB booking crosswalk review content.
- Payments includes documentary support for CPB ticket income.
- Operations includes CPB closeout records applied.
- Payment Reconciliation Preview is explicitly CPB-oriented.
- Documentation contains substantial CPB closeout history.

These are not bugs by themselves because CPB is real protected production data, but they reduce the sense that the app is a reusable event operations product.

## Assessment By Product Area

### Overview

Mostly event-agnostic, but CPB conditional copy exists. The first screen should remain focused on selected-event status, metrics, and next actions rather than historical evidence.

### Events

Strongest event-agnostic base. Event type, capacity, pricing, readiness, tasks, planning, and partner records are generic enough for multiple event models.

### Guests & Registrations

Event-agnostic data model with event-specific import/reconciliation history. Registration/person distinction is reusable.

### Payments

Useful registration-payment system, but CPB documentary support needs separation from the everyday payment workflow. Future work should clarify registration payments versus Operations finance without creating an accounting-system claim.

### Tickets And Check-In

Reusable for event-day access and attendance. QR payload is intentionally generic and privacy-safe.

### Operations

Architecture supports generic event-level income/expense/obligation tracking. CPB closeout details should eventually become filtered historical evidence or report-only context.

### Message Builder

Event-agnostic and honest. It is correctly copy-only and does not pretend to send messages.

### Reports

Reusable read-only reporting surface. It needs to stay separate from command-center language and remain clear about current versus post-event views.

### Settings

Mostly practical settings. Needs continuing discipline so Settings does not become a phase/status archive.

### System QA

Correct place for technical guardrails, CODEX_TEST instructions, and CPB protection notes.

## Gmail And Google Forms Assessment

### Gmail

The app currently treats Gmail as external evidence only. There is no live Gmail integration. A future Gmail feature should not start as automatic reconciliation. It should begin as a private evidence import/review flow with:

- OAuth scope review.
- Explicit event selection.
- Evidence redaction.
- Preview-only matching.
- Organizer confirmation before writes.
- Append-only audit logs.

### Google Forms

The app currently supports Google Forms-like exported data through import mapping. There is no live Google Forms sync. A future Google Forms path should remain preview-first and should not auto-create records without organizer review.

## Event Template Direction

Recommended event-agnostic future structure:

- Keep the current `eventType` enum.
- Add reusable event setup presets only after product review.
- Preserve route paths and current data model until a migration is explicitly approved.
- Avoid new Firestore collections unless a real repeated workflow requires them.
- Move CPB historical evidence away from normal first-run event surfaces.

## Prototype Readiness Assessment

The app is workable as a private internal prototype with real event operations logic. To become a faster, cleaner 5x prototype, the next improvements should focus on reducing event-specific evidence from daily screens, clarifying finance boundaries, and finishing a high-quality onboarding/tutorial experience without changing production data rules.

## Do Not Do Next

Do not add these before the finance and IA issues are clarified:

- Public guest portal.
- Vendor portal.
- Payment gateway.
- Real Gmail sync.
- Real Google Forms sync.
- Live AI drafting.
- New accounting system.
- New production collections.
- CPB data rewrites.
