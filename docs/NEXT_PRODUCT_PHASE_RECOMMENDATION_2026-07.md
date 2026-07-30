# Next Product Phase Recommendation - 2026-07

## Exact Next Implementation Phase

**Phase 1 - Immediate Stabilization**

Recommended branch:

`codex/immediate-stabilization-data-write-audit-quality`

## Why This Phase Comes Next

The audit does not support a broad feature-growth phase yet. The product is usable, but the highest-value next work is to reduce financial ambiguity, improve write recovery, close manual acceptance gaps, and harden the areas that carry production trust.

## Scope

### 1. Registration Payments and Operations Financial Boundaries

- Clarify payment terminology across Registrations, Reports, and Operations.
- Prevent ticket-revenue double-counting in organizer interpretation.
- Keep registration finance and Operations Ledger records separate.
- Improve payment follow-up states and review language.
- Prepare for CPB reconciliation without CPB-specific protection systems.

### 2. Payment Reconciliation Workflow

- Make selected Working Event scope explicit.
- Add safer review states for unknown, partial, complimentary, door, and paid statuses.
- Preserve raw stored values and avoid displaying missing values as explicit proof.
- Require evidence notes for organizer-confirmed corrections.

### 3. Import and Bulk-Write Recovery

- Improve import run visibility.
- Add clearer failed-row and partial-run recovery guidance.
- Keep batch chunk safeguards and append-only audit logs.
- Do not add new collections unless explicitly approved.

### 4. Manual Acceptance Closeout

- Complete a human Tutorial V3 walkthrough in production.
- Complete true 200 percent browser zoom review.
- Capture any remaining UI defects as focused tickets.

### 5. Maintenance Stabilization

- Plan Java 21 migration for future Firebase CLI support.
- Remediate dev dependency audit items separately from production dependencies.
- Address high-signal React Doctor warnings by surface.

## Out of Scope

- No payment gateway.
- No public guest portal.
- No Gmail send integration.
- No WhatsApp send integration.
- No automatic Google Forms receiver deployment without a separate deploy/security plan.
- No broad UI redesign.
- No CPB-specific locks or protection system.
- No Firestore rules/index deployment unless a later phase explicitly changes and validates them.

## Acceptance Criteria

- Registration Payments and Operations remain visibly and technically separate.
- CODEX_TEST stays the only special QA/test event.
- CPB behaves like a normal completed real event.
- Payment follow-up states are understandable to an organizer.
- Bulk/import failure recovery is documented and safer.
- Tutorial and true 200 percent zoom manual acceptance items are closed or converted into exact defects.
- Required validation commands pass before commit.
