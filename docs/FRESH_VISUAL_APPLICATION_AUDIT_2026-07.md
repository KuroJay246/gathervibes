# Fresh Visual Application Audit

Date: 2026-07-29
Branch: `codex/full-current-state-application-map`
Production inspected: `https://gathervibeshub.web.app`
Selected event: `CODEX_TEST Live Verification Event`

## Scope

This is a rendered-browser audit of the current Gather & Savor Event Hub after the dependency-security and React Doctor fixes were released to Hosting.

This audit does not redesign the product, add features, alter CPB data, alter access, change Firestore rules, or deploy anything. It exists to document the current visual and structural state so a later event-agnostic layout phase can be designed from evidence rather than guesswork.

## Evidence

Evidence directory:

- `output/fresh-visual-application-audit/`

Primary evidence files:

- `layout-measurements.json`
- `measurements-*.json`
- `redacted-screenshots/`

Coverage currently captured:

- 14 authenticated production routes.
- 10 viewport sizes.
- 140 rendered layout measurement records.
- 140 redacted first-viewport screenshots.

The screenshot set is redacted before commit:

- Desktop account area is blurred.
- Visible private record regions on data-heavy pages are blurred.
- Measurement JSON replaces email-like text with `[email]`.

Raw screenshots were captured only to a temp directory outside the repository and are not staged as repository evidence.

## Routes Reviewed

| Route | Rendered title | Notes |
| --- | --- | --- |
| `/dashboard` | Overview | Current event metrics, needs attention, actions, progress disclosures. |
| `/events` | Events | Event list, selected-event controls, setup summary, planning numbers, readiness. |
| `/registrations` | Guests & Registrations | Summary metrics, disclosures, filters, bulk controls, table/mobile records. |
| `/payments` | Payments | Registration payment follow-up, filters, records, financial evidence notes. |
| `/payments/reconciliation` | Reconciliation Preview | Read-only CPB payment audit comparison route. |
| `/imports` | Import Center | Source selector, mapping/preview flow surfaces. |
| `/tickets` | Tickets | Ticket summary, missing tickets, assigned ticket records. |
| `/check-in` | Check-In | Event-day check-in, helper disclosures, search and record lists. |
| `/scanner` | Guest ticket | Scanner-isolated route. |
| `/operations` | Operations | Event-level ledger, partner commitments, summaries and disclosures. |
| `/communications` | Message Builder | Copy-only message builder and prompt/template surfaces. |
| `/event-review` | Reports | Read-only event report and review. |
| `/settings` | Settings | Account, workspace, defaults, access, event-day, data, advanced tabs. |
| `/qa` | System QA | Health checks, guardrails, QA guidance. |

## Viewports Reviewed

Desktop:

- `1920 x 1080`
- `1440 x 900`
- `1280 x 720`

Tablet:

- `1024 x 768`
- `834 x 1112`
- `768 x 1024`

Mobile:

- `430 x 932`
- `390 x 844`
- `360 x 800`
- `320 x 568`

## Rendered Gate Results

Measured result from `layout-measurements.json`:

- Loading-shell records: 0.
- Missing CODEX_TEST scope records: 0.
- Login fallback records: 0.
- AppErrorBoundary records: 0.
- Horizontal-overflow records: 14.

The 14 horizontal-overflow records all occur at `mobile-320x568`.

At `320 x 568`, every measured route reports:

- `documentElement.clientWidth`: `305px`
- `documentElement.scrollWidth`: `320px`
- `main.width`: `320px`

Source connection:

- `src/styles.css` sets `html` and `body` to `min-width: 320px`.
- `src/layout/AppShell.jsx` renders the mobile main wrapper with `px-4`, then an inner `max-w-[1480px] min-w-0 overflow-x-clip`.

Interpretation:

- This is a narrow-viewport compatibility issue at the minimum supported width. It is not caused by a single page table because it appears on every route at the same viewport.
- The likely root is the app-level `min-width: 320px` plus scrollbar/client-width behavior in Chrome at `320px` viewport.

## Primary Visual Findings

### 1. Events Planning Numbers Stretch Too Wide

User-reported issue confirmed.

Rendered evidence:

- Route: `/events`
- Viewport: `desktop-1440x900`
- Main content width: `1167px`
- Event table wrapper width: `1085px`
- Events page height: `4151px`

Source:

- `src/components/events/EventPlanningWorkspace.jsx`
- Budget section wrapper: `section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"`
- Budget article: `rounded-[24px] border ... bg-white p-5 ... sm:p-6`
- Planning number grid: `mt-5 grid gap-3 sm:grid-cols-2`

Problem:

- The "Budget and cash position" article is one of two wide desktop columns. Inside it, six small currency values occupy a large white card.
- The parent grid gives the budget panel roughly half of a wide page even when all values are `BBD $0.00`.
- The card height and surrounding explanatory note make a small numeric state feel like a major dashboard.

Recommendation for later implementation:

- Treat the planning values as compact metrics or a secondary details panel.
- Keep the Operations boundary warning, but avoid a full-width visual block when values are empty or small.

### 2. Registrations Table Remains Dense

Rendered evidence:

- Route: `/registrations`
- Viewport: `desktop-1440x900`
- Main content width: `1167px`
- Table wrapper width: `1085px`
- Table width: `1216px`
- Table columns detected: 18 by measurement selector, 9 visible header cells in source.
- Wrapper class: `overflow-x-auto`

Source:

- `src/pages/RegistrationsPage.jsx`
- Desktop table wrapper: `overflow-hidden ... lg:block`, then `overflow-x-auto`
- Table class: `w-full text-left text-sm`
- Visible columns include selection, guest/registration, buyer/contact, guest count, payment, finance review, ticket status, check-in status, actions.

Problem:

- The table is wider than its visible wrapper even on desktop, so sideways movement remains part of normal registration work.
- Finance Review packs tier, due, paid, balance, method, and reference into one table cell.
- Several helper popovers and disclosures increase the perceived complexity before the organizer reaches the records.

Recommendation for later implementation:

- Preserve calculations and fields, but split high-frequency record work from finance-audit detail.
- Consider desktop row summaries plus expandable detail, and keep mobile record cards separate from table thinking.

### 3. Registration Disclosures Are Discoverable But Heavy

Source:

- `src/pages/RegistrationsPage.jsx`
- `details className="phase23v-panel"` for More Registration Metrics.
- Additional `phase23v-panel` for registration audit/supporting evidence.
- Filter controls are inside horizontally scrollable containers.

Problem:

- The disclosures hide information that can be useful for organizer triage.
- Opening them likely helps power users but adds an extra decision before basic record review.
- On mobile, the disclosures are stacked into a long page, which makes the hierarchy feel like operational admin rather than quick registration work.

### 4. Settings Count Logic Is Data-Source Specific

Source:

- `src/pages/SettingsPage.jsx`
- `approvedEntries = listApprovedAccessEntries(accessControl || {})`
- `secondaryOrganizerCount = approvedEntries.filter((entry) => !entry.protectedOwner).length`
- Protected owner displayed from `PROTECTED_OWNER_EMAIL`.

Interpretation:

- The secondary organizer count is not the same as protected owner count.
- It does not count all `staffProfiles`.
- It does not count scanner assignments.
- It counts approved allowlist entries returned by `listApprovedAccessEntries`, excluding the protected owner.

Product wording risk:

- If Anica is expected to be reflected as an organizer, the UI wording must make clear whether the number means approved-email entries, secondary organizers, staff profiles, or current signed-in account.

### 5. Check-In and Historical Attendance Need Strong Wording

Source:

- `src/utils/eventReview.js`
- Attendance note: guest attendance is based on the `personsAttending` value of checked-in registration records; group registrations are not scanned guest-by-guest.
- `docs/PRODUCT_GUIDE.md` states approximate historical attendance must not be entered as live system check-ins.

Finding:

- The model can represent scanner-confirmed check-in and manually corrected check-in as audited system states.
- Organizer-confirmed historical attendance is a different evidence class and should not be fabricated as QR scan history.
- Future UX should separate "system check-in" from "historical attendance confirmation."

## Current Limitations Of This Pass

Not yet complete against the full Phase 4 target:

- Modal states are not fully captured yet.
- Expanded disclosures are measured but not all expanded visual states are captured.
- Browser zoom `125%`, `150%`, and `200%` are not yet captured.
- Lighthouse, axe DevTools, and React Developer Tools evidence are not yet recorded.
- Login route visual evidence is not captured in signed-out state because this pass preserved the authenticated organizer session.

These are remaining Phase 4 tasks, not product regressions.
