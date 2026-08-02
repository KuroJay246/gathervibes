# Next Product Development Recommendation - 2026-08

## Decision

Recommendation: resume scoped feature development.

Recommended next phase: `Document Register and Contacts Foundation`.

Recommended next branch: `codex/document-register-and-contacts-foundation`.

## Why This Phase

The product now has strong event, registration, payment, ticket, operations, import, reporting, QA, and tutorial foundations. The next highest organizer-value gap is not another visual polish pass. It is the missing reusable structure around operational documents, links, contacts, partners, suppliers, and evidence references.

This phase should improve real organizer workflow without connecting risky external integrations or changing payment/attendance calculations.

## Proposed Scope

- Add an event-scoped document/link register for contracts, venue info, vendor files, menus, permits, receipts, forms, and organizer references.
- Add a reusable contacts foundation for partners, suppliers, vendors, sponsors, venues, and internal helpers.
- Link contacts and documents to existing event workflows where appropriate.
- Keep records event-scoped or clearly reusable, with audit logs for business writes.
- Keep file upload/storage scope explicit before implementation.

## Explicit Non-Scope

- No Gmail integration.
- No WhatsApp or SMS sending.
- No payment gateway.
- No public guest/vendor portal.
- No automatic Google Forms receiver deployment unless separately approved.
- No CPB-specific protection model.
- No final accounting/profit claims.

## Prerequisites Before Implementation

- Define whether documents are URL-only, metadata-only, or actual uploaded files.
- If file uploads are required, complete Firebase Storage security design first.
- Define contact dedupe and merge rules before write implementation.
- Confirm whether contacts are global, event-scoped, or both.

## Cleanup That Can Wait

- Large component decomposition.
- React Doctor advisory cluster cleanup.
- Java 21 migration, unless upgrading Firebase CLI.
- Historical documentation pruning.
- True 200% zoom manual acceptance, unless preparing for a high-stakes demo.
## Feature Development Safety

Feature work is safe to resume because automated validation passed, no P0/P1 findings remain, production dependency audit is clean, and security/data-integrity guardrails remain intact.
