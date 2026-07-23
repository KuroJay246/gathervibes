# Visual Layout and Information Architecture Review

Phase 23V repairs the organizer interface by reducing always-visible card volume and separating summary, action, and detail layers. The goal is not a new feature set; it is a clearer prototype-ready operating surface for the existing Gather & Savor workflows.

## Product Problem

The app had become visually heavy across normal organizer routes. Several pages showed all metrics, audit explanations, filters, and detail tables at the same priority. This made the app look like a development artifact instead of a daily event-operations product.

Confirmed pressure points:

- Overview repeated event context, money, readiness, and upcoming-event panels before the organizer could focus on action.
- Guests & Registrations displayed too many count cards before filters and records.
- Payments showed three metric grids plus evidence and historical panels before the record workspace.
- Tickets rendered filter controls and QR blocks too prominently, including QR content inside normal record rows.
- Check-In placed helper exports and advanced filters ahead of the main guest lookup workflow.
- Operations mixed finance-boundary explanations, partner workspace, audit history, form, and ledger at the same visual weight.
- Reports presented a long full-report metric wall that was difficult to scan.

## Layout Decisions

The repair uses a summary-first pattern:

- Keep the primary event numbers visible.
- Keep the immediate task/action area visible.
- Move secondary metrics, evidence history, filters, and operational detail into disclosure panels.
- Preserve route paths, calculations, permissions, and existing data behavior.

New shared CSS utilities:

- `phase23v-panel`
- `phase23v-summary`
- `phase23v-body`
- `phase23v-metric-grid`

These utilities standardize disclosure panels and responsive metric grids without adding dependencies.

## Before And After Inventory

### Overview

- Retained: Working Event context, key event numbers, Needs Attention, Quick Actions.
- Converted to compact metric row: registrations, guests, payments received, capacity used.
- Moved behind secondary detail: event setup details, projected registration income, outstanding registration balance, paid expenses, projected cash position.
- Moved behind secondary detail: planning progress and upcoming events.
- Removed from first-scan path: repeated finance/readiness metric grids.

### Guests & Registrations

- Retained: actions, import/export links, filters, tabs, table/cards, CRUD controls, registration-versus-guest explanation.
- Converted to primary summary: six high-signal metric cards.
- Moved behind secondary detail: additional payment-status, attendance, ticket, and selection metrics.
- Moved behind secondary detail: registration evidence reconciliation.
- Preserved: registration calculations, filters, tabs, bulk actions, table, mobile cards.

### Payments

- Retained: registration-payment boundary, links to registrations/reports/reconciliation, record filters, responsive cards, desktop table.
- Converted to primary summary: registration records, guests, expected income, payments received, outstanding balance.
- Moved behind secondary detail: payment status counts, review counts, evidence classification, historical/informational review.
- Preserved: payment follow-up lists and full payment record table.

### Tickets

- Retained: ticket assignment controls, printable QR list, QR payload behavior, filters, desktop table, mobile cards.
- Moved behind secondary detail: advanced ticket filters.
- Converted to on-demand detail: mobile per-registration QR display.
- Removed from normal desktop rows: always-visible inline QR block.
- Preserved: `GSV:TICKET:{ticketCode}` payload generation.

### Check-In

- Retained: event-day header, scanner link, QR/manual lookup, guest card, check-in controls, list mode.
- Converted to primary summary: total registrations, total guests, checked-in registrations, checked-in guests.
- Moved behind secondary detail: remaining counts, payment readiness, ticket readiness.
- Moved behind secondary detail: attendance evidence context, helper/export lists, advanced filters.
- Preserved: normal check-in behavior and undo/check-out guardrails.

### Operations

- Retained: Operations and registration-payment boundary, finance summary, partner commitments, form, ledger, reports link.
- Moved behind secondary detail: finance boundary explanation, partner/sponsor/supplier workspace, financial audit/closeout history.
- Preserved: Operations Ledger calculations and separation from registration payments.

### Reports

- Retained: read-only report structure, registration payments, Operations summary, event summary, attendance limitation note.
- Converted to primary summary: status, registration records, total guests, capacity usage.
- Moved behind secondary detail: full report metric set.
- Preserved: registration-versus-guest distinction and Operations/payment separation.

## Navigation And Routes

Route paths remain preserved:

- `/dashboard`
- `/events`
- `/registrations`
- `/payments`
- `/tickets`
- `/check-in`
- `/operations`
- `/event-review`
- `/communications`
- `/imports`
- `/settings`
- `/qa`

Organizer-facing labels remain aligned to the product structure: Overview, Guests & Registrations, Payments, Tickets, Check-In, Operations, Message Builder, Reports, Settings, and System QA.

## Responsive Impact

The repair reduces first-screen vertical density on desktop, tablet, and mobile by moving secondary content into disclosure panels. The `phase23v-metric-grid` utility uses auto-fit columns so metric groups wrap instead of forcing fixed-column layouts across narrow widths.

Mobile event-day priority remains intact: Overview, Guests, Tickets, Check-In, and More continue to be the bottom navigation structure.

## Accessibility Notes

- Disclosure summaries use visible text labels and focusable native `details` / `summary` controls.
- Primary action areas remain visible without requiring disclosure expansion.
- Existing focus states remain in `src/styles.css`.
- QR details and audit/history panels are accessible through standard keyboard-expandable controls.

## Guardrails Preserved

- No Firestore collections changed.
- No Firestore rules changed.
- No Firestore indexes changed.
- No dependencies added.
- No registration finance formulas changed.
- No Operations Ledger formulas changed.
- No authentication behavior changed.
- No approved organizer or scanner permission boundary changed.
- No access-request workflow activated.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- CPB production data was not read for write operations and was not modified.

## Files Changed

- `src/styles.css`
- `src/pages/DashboardPage.jsx`
- `src/pages/RegistrationsPage.jsx`
- `src/pages/PaymentsPage.jsx`
- `src/pages/TicketsPage.jsx`
- `src/pages/CheckInPage.jsx`
- `src/pages/OperationsPage.jsx`
- `src/pages/EventReviewPage.jsx`
- `tests/phase23v-visual-layout-information-architecture.test.js`
- `docs/VISUAL_LAYOUT_INFORMATION_ARCHITECTURE_REVIEW_2026-07.md`

## Tests Added

`tests/phase23v-visual-layout-information-architecture.test.js` verifies:

- shared layout utilities exist;
- Overview is summary-first;
- dense pages collapse secondary review/detail sections;
- routes remain preserved;
- QR payload remains unchanged;
- scanner, rules, indexes, dependencies, and access-workflow guardrails remain intact.

## Deferred

- No new payment workflow.
- No reconciliation workflow expansion.
- No new Team & Access module.
- No public portal.
- No real message sending.
- No real AI integration.
- No Firestore schema migration.
- No CPB import or data-write workflow.

## Screenshot Evidence

Private screenshot evidence was kept out of Git under:

- Before production review: `C:\Users\Jaylan\Documents\gathetr\output\phase23v-visual-layout\before`
- After initial local review: `C:\Users\Jaylan\Documents\gathetr\output\phase23v-visual-layout\after-initial`
- Final authenticated local review: `C:\Users\Jaylan\Documents\gathetr\output\phase23v-visual-layout\after-final-top`

Final contact sheets:

- `C:\Users\Jaylan\Documents\gathetr\output\phase23v-visual-layout\after-final-top\contact-desktop.png`
- `C:\Users\Jaylan\Documents\gathetr\output\phase23v-visual-layout\after-final-top\contact-tablet.png`
- `C:\Users\Jaylan\Documents\gathetr\output\phase23v-visual-layout\after-final-top\contact-mobile.png`

Chrome screenshot capture required a short post-ready paint delay. Earlier captures landed on the loading shell even after route DOM readiness, so the final pass explicitly waited for route content and then waited for paint before screenshot capture.

## Page-by-Page Final Visual Results

- Overview: now leads with event context, four primary metrics, Needs Attention, and Quick Actions. Secondary event details, finance, planning progress, and upcoming events are collapsed.
- Events: event records remain readable with primary event action and summary data visible first.
- Guests & Registrations: summary metrics are reduced, advanced metrics are collapsed, filters stay in a compact work area, and records remain reachable without page-level horizontal sliding.
- Payments: expected/received/outstanding work is first; review counts, evidence detail, and historical limitations are secondary.
- Tickets: QR and advanced filters are no longer permanently dominant; ticket work stays visible and QR details are on demand.
- Check-In: event-day scan/manual lookup and attendance summary are first; helper/export and advanced filters are secondary.
- Operations: finance summary, active ledger work, and action buttons are first; partner workspace and audit history are collapsed.
- Reports: event review is positioned as a report; full metric detail is available but not the first visual layer.
- Message Builder: create/copy workflow is clearer and remains copy-only.
- Settings: category tabs keep Settings from reading as a roadmap archive.
- System QA: system status is separate from daily organizer work and remains secondary in navigation.

## Desktop Results

Final desktop review used an authenticated Chrome session at approximately `1440 x 1000`. The final route set showed no app-origin console warnings/errors, no AppErrorBoundary, no loading stalls, no page-level horizontal overflow, and no organizer-facing phase-number language in the reviewed body text.

## Tablet Results

Final tablet review used approximately `834 x 1112`. Summary groups wrapped into readable columns, record regions remained contained, bottom navigation stayed usable, and no page-level horizontal overflow was detected.

## Mobile Results

Final mobile review used approximately `390 x 844`. The organizer content column, bottom navigation, Tickets, Check-In, Message Builder, Reports, Settings, and System QA remained usable without overlapping panels or page-level horizontal scrolling. Chrome viewport screenshots include blank capture area outside the simulated mobile viewport, but the measured app viewport and content column were correct.

## 200% Zoom Results

Focused 200% zoom checks covered Overview, Guests & Registrations, Tickets, Check-In, and Reports. No AppErrorBoundary, loading stall, or page-level horizontal overflow was detected.

## Accessibility Results

Automated accessibility coverage ran through the Chromium and Firefox Playwright suites. The organizer route accessibility tests passed for desktop and mobile. Native `details` / `summary` controls preserve keyboard access for collapsed secondary detail. No full formal accessibility certification was performed.

## Mother-Layout Test

The final authenticated local review confirmed the primary pages answer the organizer questions quickly:

- What page is this: page headings are visible and consistent.
- What is the main event: the compact Working Event context is visible.
- What is the most important number: primary summary metrics appear before secondary detail.
- What can I do here: primary actions remain visible in the first work area.
- Where can I see more detail: secondary information is moved into explicit disclosure panels.
- Is anything requiring attention: Needs Attention and warning/status sections are separated from historical detail.

## Remaining Visual Limitations

- Some legacy desktop tables still contain dense operational data. Phase 23V contains the table regions and improves the first-scan hierarchy, but it does not fully redesign every record row into a new action-menu system.
- Chrome viewport screenshots can include extra blank area outside the simulated viewport. DOM measurements and visual inspection were used together to verify the app content itself did not overflow.
- Event Review may preserve internal scroll position during automated route capture; this did not reproduce as an app error and does not indicate data loss.

## Exact Next Action

Merge the Phase 23V branch through the normal no-fast-forward release path, deploy Firebase Hosting only unless Firestore files change, and perform authenticated production visual acceptance.
