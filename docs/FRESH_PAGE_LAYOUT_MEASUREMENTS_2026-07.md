# Fresh Page Layout Measurements

Date: 2026-07-29
Evidence: `output/fresh-visual-application-audit/layout-measurements.json`

## Measurement Method

Measurements were captured in authenticated Chrome production using `CODEX_TEST Live Verification Event`.

For each route/viewport record, the browser captured:

- viewport dimensions;
- document scroll/client dimensions;
- main content bounding rectangle;
- heading rectangle;
- card-like container rectangles;
- table and wrapper rectangles;
- disclosure rectangles;
- small touch-target candidates;
- loading, login, selected-event, app-error, and overflow flags.

Private text was scrubbed in JSON where email-like strings appeared.

Additional interactive-state measurements are stored in:

- `output/fresh-visual-application-audit/interactive-states/interactive-state-metadata.json`

Those records add route/state-specific measurements for modals, expanded disclosures, mobile navigation, and zoom/page-scale checks.

## Coverage Summary

- Records: 140.
- Routes: 14.
- Viewports: 10.
- Loading records: 0.
- Login fallback records: 0.
- AppErrorBoundary records: 0.
- Missing selected event records: 0.
- Horizontal overflow records: 14.
- Interactive-state records: 20.
- Interactive loading records: 0.
- Interactive AppErrorBoundary records: 0.
- Interactive signed-out login record: 1.
- Interactive zoom records: 3.

## App-Level Width Finding

At `mobile-320x568`, every route reports:

| Value | Measurement |
| --- | --- |
| `clientWidth` | `305px` |
| `scrollWidth` | `320px` |
| `main.width` | `320px` |
| Main padding | `16px left`, `16px right` |

Source:

- `src/styles.css`: `html { min-width: 320px }`
- `src/styles.css`: `body { min-width: 320px }`
- `src/layout/AppShell.jsx`: `main className="px-4 ..."`

Assessment:

- This is the highest-confidence layout defect from the measurement pass.
- The overflow is uniform and route-independent, so the first fix should be app-shell/CSS level, not page-by-page.

## Key Route Measurements

### Overview

Desktop `1440 x 900`:

- Main width: approximately `1167px`.
- Metrics row fits four compact cards.
- Needs Attention and Quick Actions use two large columns.

Mobile `320 x 568`:

- Main width: `320px`.
- Document client width: `305px`.
- Horizontal overflow: yes.
- Disclosures detected: 3.

Finding:

- Overview is visually coherent at normal mobile widths, but the app-level 320px issue still applies.

### Events

Desktop `1440 x 900`:

- Main width: `1167px`.
- Page scroll height: `4151px`.
- Event table wrapper: `1085px`.
- Event table: `1085px`.
- Event table wrapper class: `hidden overflow-x-auto md:block`.

Budget and cash position source:

- `src/components/events/EventPlanningWorkspace.jsx`
- `xl:grid-cols-[0.95fr_1.05fr]`
- `rounded-[24px] ... p-5 ... sm:p-6`
- `mt-5 grid gap-3 sm:grid-cols-2`

Finding:

- Budget values are visually promoted into a large card even when the content is only six small values and a note.

### Guests & Registrations

Desktop `1440 x 900`:

- Main width: `1167px`.
- Table wrapper width: `1085px`.
- Table width: `1216px`.
- Wrapper class: `overflow-x-auto`.
- Disclosures counted: 20 using `[aria-expanded]` and `details` selectors.

Finding:

- Even at desktop width the registration table is wider than its wrapper.
- The visible layout combines summary, help controls, disclosures, filters, bulk tools, and a wide table.

### Payments

Source:

- `src/pages/PaymentsPage.jsx`
- Main table class: `w-full min-w-[1080px]`.

Finding:

- Payment records intentionally require horizontal containment because the table has a `1080px` minimum width.
- This is acceptable for audit detail but not ideal for primary organizer follow-up work.

### Operations

Source:

- `src/pages/OperationsPage.jsx`
- Ledger table class: `w-full min-w-[760px]`.
- Partner commitments panel is separate in `src/components/operations/PartnerCommitmentsPanel.jsx`.

Finding:

- Operations has a clearer event-level boundary than Payments, but disclosures and ledger/detail panels still create high page density.

### Settings

Desktop `1440 x 900`:

- Main width: `1182px`.
- Page scroll height: `900px`.
- No tables.
- Settings category tabs use `overflow-x-auto`.

Finding:

- Settings is compact at desktop and tablet.
- On mobile, horizontal tab scrolling is expected but should be tested at 320px after the app-level width fix.

### System QA

Finding:

- System QA is intentionally long and technical.
- It should remain visually separated from daily workspace navigation and not become a default event-day route.

## Touch Target Notes

The measurement pass flags several `40px` desktop sidebar links and `20px` help buttons as smaller than a strict `44px` target.

Interpretation:

- Desktop sidebar links at `40px` are likely acceptable for mouse use but below mobile touch guidance.
- Help buttons at `20px` need stronger accessible activation targets if they remain visible on mobile.

## Evidence Files

- `output/fresh-visual-application-audit/measurements-desktop-1920x1080.json`
- `output/fresh-visual-application-audit/measurements-desktop-1440x900.json`
- `output/fresh-visual-application-audit/measurements-desktop-1280x720.json`
- `output/fresh-visual-application-audit/measurements-tablet-1024x768.json`
- `output/fresh-visual-application-audit/measurements-tablet-834x1112.json`
- `output/fresh-visual-application-audit/measurements-tablet-768x1024.json`
- `output/fresh-visual-application-audit/measurements-mobile-430x932.json`
- `output/fresh-visual-application-audit/measurements-mobile-390x844.json`
- `output/fresh-visual-application-audit/measurements-mobile-360x800.json`
- `output/fresh-visual-application-audit/measurements-mobile-320x568.json`
- `output/fresh-visual-application-audit/interactive-states/interactive-state-metadata.json`
- `output/fresh-visual-application-audit/interactive-states/*.png`
