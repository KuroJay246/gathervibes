# Organizer Comprehension and Usability Audit

## Product Problem

Gather & Savor has strong operational coverage, but organizers can lose context when they move between event setup, registrations, tickets, Operations, resources, documents, contacts, messages, reports, and System QA. The product needs every route to answer three questions quickly: what am I doing here, what event is this scoped to, and what will not change automatically.

## Browser Findings

- Production opened with the authenticated protected-owner session for `jaylanspencer99@gmail.com`.
- Normal event lists hide `CODEX_DEMO - Full System Walkthrough` until `Show Test Events` is enabled.
- Selecting `CODEX_DEMO - Full System Walkthrough` changed only the local Working Event scope.
- A reversible note-only edit on `EXAMPLE - Ellis VIP` saved, persisted after reload, and was reverted.
- No permission-denied error appeared during the CODEX_DEMO registration save.
- The likely user confusion was not a production write lock; it was event visibility and generic save-error copy.

## Decisions

- Add one consistent page-purpose strip in the organizer shell instead of adding separate explanatory cards to every page.
- Mark selected test/demo events in the Working Event strip so organizers know they are using synthetic data.
- Preserve all route paths and current workflows.
- Improve registration/resource save-error language so the next blocked save points to account, Working Event, and System QA checks.
- Keep CODEX_DEMO as the only synthetic QA/training event.
- Keep CPB and all other real events under the standard real-event safeguard model.

## Card and Explanation Inventory

- Retained: Working Event context, route titles, primary actions, critical metrics, safety warnings.
- Merged: repeated page-purpose and product-boundary text into one shell-level page-purpose strip.
- Converted to compact guidance: page-specific limitations such as copy-only Message Builder, registration-versus-Operations boundary, QR payload contract, scanner restrictions, and preview-first import behavior.
- Removed from organizer flow: no new historical roadmap, phase chronology, or implementation archive was added.
- Relocated: technical QA and owner-write procedure remain in System QA and docs, not daily event workflows.

## Guardrails Preserved

- No Firestore collections changed.
- No Firestore indexes changed.
- No dependency added.
- No QR/scanner payload change.
- No payment, Operations, attendance, ticket, or registration calculation change.
- No CPB record was selected for QA or modified.
- CODEX_DEMO remained the only synthetic write-test event.

