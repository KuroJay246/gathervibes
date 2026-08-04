# Tutorial and In-App Guidance Maintenance Standard

Gather & Savor Event Hub feature work is not complete until the tutorial and affected in-app explanations match the current product.

## Permanent Release Check

Every organizer-facing release must record:

1. Tutorial impact reviewed: Yes or No.
2. Tutorial update required: Yes or No.
3. Routes affected.
4. Navigation labels affected.
5. Workflow steps affected.
6. Permissions affected.
7. Existing tutorial content updated.
8. In-app descriptions updated.
9. Tutorial selectors tested.
10. Mobile tutorial tested.
11. Historical or older records explained where relevant.

## Explanation Standard

Tutorial and in-page guidance must explain:

- What the feature is.
- Why the organizer would use it.
- When it should be used.
- What information belongs there.
- What information does not belong there.
- What other app areas it connects to.
- What changes automatically.
- What does not change automatically.
- Who can use or edit it.
- What to check before considering the work complete.

## Product Boundaries

- Run of Show is an operational event-day sequence. It is not a public guest schedule, payroll, or automatic calendar scheduler.
- Event Resources tracks event-specific supplies, equipment, packing, pickup, return, and shortages. It is not warehouse inventory, purchasing, or accounting.
- Event Readiness is derived from visible operational conditions. It is not a hidden score, financial forecast, or guarantee.
- Message Builder creates copyable text. It does not send messages automatically.
- Documents records references and tracking information. It does not upload or store files unless a future approved feature adds that.
- Relationships remain relationships. Linking a Task does not complete it, linking Operations does not change amounts, assigning a Contact does not grant access, and linking a Commitment does not mark it paid.
- Synthetic tutorial, rehearsal, and QA guidance must point to `CODEX_DEMO - Full System Walkthrough`, not retired `CODEX_TEST` or any real event.

## Existing Data

Guidance must account for older legitimate records. Do not imply older records need to be recreated. Do not automatically migrate production data to make tutorial copy easier.

## Selector Standard

Tutorial targets must use stable semantic targets such as `data-tour-id`. Avoid selectors based on generated classes, row order, CSS position, or volatile text.

## Page-Purpose Standard

Tutorial and in-app guidance must stay aligned with the shell page-purpose strip. When a route is added or renamed, update the route title, page-purpose guidance, tutorial targets, route map, and the relevant tests in the same release.

## Demo Editability Check

When a user reports that the demo is locked, first confirm:

- the signed-in account is the protected owner or an approved organizer;
- `CODEX_DEMO - Full System Walkthrough` is visible after `Show Test Events`;
- CODEX_DEMO is selected as the Working Event;
- a harmless reversible CODEX_DEMO edit saves and persists after reload;
- the edit is reverted after verification.

