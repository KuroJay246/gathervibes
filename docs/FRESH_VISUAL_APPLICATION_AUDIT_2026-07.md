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
- `interactive-states/interactive-state-metadata.json`
- `interactive-states/*.png`
- `secondary-tools/axe-login-playwright.json`
- `secondary-tools/lighthouse-login-summary.json`
- `secondary-tools/browser-console-dashboard.json`

Coverage currently captured:

- 14 authenticated production routes plus signed-out `/login`.
- 10 viewport sizes.
- 140 rendered layout measurement records.
- 140 redacted first-viewport screenshots.
- 20 additional interactive-state screenshots.
- 20 interactive-state metadata records.
- 3 zoom inspections on Overview at `125%`, `150%`, and `200%` equivalent page-scale factors.

The screenshot set is redacted before commit:

- Desktop account area is blurred.
- Visible private record regions on data-heavy pages are blurred.
- Mobile drawer account details are covered.
- Owner-name references in welcome/walkthrough metadata and screenshots are redacted.
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

Interactive-state result from `interactive-state-metadata.json`:

- Records: 20.
- Loading records: 0.
- AppErrorBoundary records: 0.
- Signed-out login route: captured in a clean browser context.
- Event creation modal: captured.
- Event editing modal: captured.
- Registration form modal: captured.
- Registration record edit/detail modal: captured.
- Registration filters and disclosures expanded: captured.
- Payment filters/disclosures and records: captured.
- Ticket QR display: captured.
- Check-In disclosures: captured.
- Operations commitments/disclosures: captured.
- Reports disclosures: captured.
- Import field mapping/preview state: captured with a synthetic pasted row and no save/commit action.
- Settings Organizer Access tab: captured.
- Welcome celebration and existing walkthrough: captured.
- Mobile navigation and mobile More drawer: captured.
- Zoom/page-scale factors `1.25`, `1.5`, and `2`: applied and captured.

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

## Secondary Tooling Results

Lighthouse:

- Route: `/login`.
- Raw Lighthouse JSON was not committed because it included Firebase auth iframe URLs with API-key query parameters.
- Sanitized summary retained in `secondary-tools/lighthouse-login-summary.json`.
- Performance score: `0.70`.
- Accessibility score: `0.95`.
- Best Practices score: `1.00`.
- SEO score: `0.63`.
- Lighthouse command exited nonzero during temporary browser-profile cleanup after report generation. This is documented in `secondary-tools/lighthouse-login-failure.txt`.

Axe:

- Axe CLI failed because the temporary ChromeDriver version did not match the installed Chrome.
- Playwright plus injected `axe-core@4.12.1` completed on `/login`.
- Result: 1 serious color-contrast violation and 1 serious incomplete color-contrast check.
- Evidence: `secondary-tools/axe-login-playwright.json`.

Browser console:

- Evidence: `secondary-tools/browser-console-dashboard.json`.
- Extension-originated message-channel errors were present.
- Two app-originated onboarding skip/close permission errors appeared while testing the welcome/walkthrough replay path.
- No AppErrorBoundary rendered during the interactive captures.

React Developer Tools:

- A separate React DevTools component-tree export was not available from the automated browser surface.
- React Doctor full JSON remained the repeatable React diagnostic signal for this pass.

## Current Limitations Of This Pass

This pass now captures the requested primary routes, responsive matrix, modal/dialog states, disclosures, mobile navigation, and zoom checks. Remaining limitations are secondary-tool and product-defect observations rather than missing route evidence:

- Lighthouse raw output is intentionally excluded because it contains Firebase auth iframe API-key URLs; only the sanitized score summary is retained.
- Axe DevTools UI itself was not available, but equivalent axe-core analysis was run through Playwright on the login route.
- React DevTools component screenshots are not included; source-to-rendered mapping and React Doctor diagnostics are used instead.
- Browser console includes a non-blocking app-originated onboarding permission error when closing/skipping the replayed tour.

CPB remained untouched.
