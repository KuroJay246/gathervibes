# System QA Presentation Standard

System QA is a technical verification workspace for release and troubleshooting. It is not a normal organizer workflow.

## Required Groups

- Environment: Firebase project, configuration state, route, authentication state.
- Working Event: selected event, real/test classification, event status.
- Access: current role, access level, assigned events where relevant.
- Data Boundaries: Registration Payments versus Operations, Training Event exclusion, QR format, scanner isolation, historical attendance, import write boundary.
- Feature Status: Tasks, Import Center, Response Inbox, Message Builder, automatic Forms receiver, Gmail, online payments, OCR.
- Manual Acceptance: authenticated visual review, true 200 percent zoom, scanner-device feel.

## Status Language

Use Pass, Needs Review, Manual Check, Not Connected, Packaged, and Not Applicable.

## Prohibited QA Behavior

- No production mutation shortcuts.
- No delete-all-test-data control.
- No bypass-permission or owner-escalation control.
- No secrets or raw private credentials.
- No claim that automated tests prove human browser acceptance.
