# Fresh Visual Application Audit Evidence Manifest

Date: 2026-07-29
Production URL: `https://gathervibeshub.web.app`
Selected event: `CODEX_TEST Live Verification Event`

## Evidence Files

- `layout-measurements.json`
- `measurements-desktop-1920x1080.json`
- `measurements-desktop-1440x900.json`
- `measurements-desktop-1280x720.json`
- `measurements-tablet-1024x768.json`
- `measurements-tablet-834x1112.json`
- `measurements-tablet-768x1024.json`
- `measurements-mobile-430x932.json`
- `measurements-mobile-390x844.json`
- `measurements-mobile-360x800.json`
- `measurements-mobile-320x568.json`
- `redacted-screenshots/`
- `interactive-states/`
- `secondary-tools/`

## Captured Routes

- `/dashboard`
- `/events`
- `/registrations`
- `/payments`
- `/payments/reconciliation`
- `/imports`
- `/tickets`
- `/check-in`
- `/scanner`
- `/operations`
- `/communications`
- `/event-review`
- `/settings`
- `/qa`
- `/login` through a clean signed-out browser context

## Captured Viewports

- `1920 x 1080`
- `1440 x 900`
- `1280 x 720`
- `1024 x 768`
- `834 x 1112`
- `768 x 1024`
- `430 x 932`
- `390 x 844`
- `360 x 800`
- `320 x 568`

## Measurement Results

- Records: 140.
- Loading records: 0.
- Login fallback records: 0.
- AppErrorBoundary records: 0.
- Missing selected-event records: 0.
- Horizontal overflow records: 14, all at `mobile-320x568`.
- Interactive-state records: 20.
- Interactive screenshots: 20.
- Interactive loading records: 0.
- Interactive AppErrorBoundary records: 0.
- Zoom/page-scale screenshots: 3.

## Interactive States Captured

- Signed-out login route.
- Event creation modal.
- Event editing modal.
- Registration form modal.
- Registration record edit/detail modal.
- Registration filters and disclosures expanded.
- Payments filters/disclosures and records.
- Ticket QR display.
- Check-In disclosures expanded.
- Operations commitments/disclosures expanded.
- Reports disclosures expanded.
- Import field mapping/preview with a synthetic pasted row and no save/commit action.
- Settings Organizer Access tab.
- Welcome celebration.
- Existing walkthrough.
- Mobile navigation.
- Mobile More drawer.
- Overview at `125%`, `150%`, and `200%` page-scale factors.

## Secondary Tool Evidence

- `secondary-tools/lighthouse-login-summary.json`
- `secondary-tools/lighthouse-login-failure.txt`
- `secondary-tools/axe-login-playwright.json`
- `secondary-tools/axe-cli-login-failure.txt`
- `secondary-tools/browser-console-dashboard.json`

## Privacy Handling

Committed screenshots are redacted.

- Desktop account area is blurred.
- Visible record areas on data-heavy pages are blurred.
- Mobile drawer account area is covered.
- Owner-name text in welcome/walkthrough screenshots and metadata is redacted.
- Measurement text replaces email-like strings with `[email]`.

Raw unredacted screenshots were captured to a temporary folder outside the repository and are not staged as repository evidence.

## Limitations

This evidence package includes modal-state screenshots, expanded disclosure screenshots, browser zoom/page-scale screenshots, a sanitized Lighthouse summary, and a Playwright-injected axe-core result.

Remaining limitations:

- Raw Lighthouse JSON is intentionally not committed because it contains Firebase auth iframe URLs with API-key query parameters.
- Lighthouse exited nonzero during temporary browser-profile cleanup after producing a report.
- Axe CLI failed because of a ChromeDriver/Chrome version mismatch; Playwright-injected axe-core was used instead.
- React DevTools component screenshots are not included; React Doctor and source-to-rendered component mapping provide the repeatable React evidence.
- Browser console captured extension message-channel noise and app-originated onboarding permission errors while replaying/closing the walkthrough.

CPB was not selected, edited, reconciled, checked in, imported into, or modified.
