# Google Forms Response Inbox Audit

Audit pass: Pass 3
Date: 2026-07-30
Scope: `src/utils/formResponseInbox.js`, `src/pages/ImportsPage.jsx`, tests, packaged receiver expectations, and source scan for secrets.

## Status Classification

| Statement | Result |
| --- | --- |
| Deployed and working | Not verified in Pass 3. |
| Deployed but incomplete | Not verified. |
| Manual only | True for the currently reviewed frontend flow. |
| Packaged but undeployed | Likely true for automatic receiver package; deployment was not verified. |
| Placeholder UI | Partly true for non-registration target types and automatic connection status. |
| Unsupported | Non-registration conversion is not implemented as a live workflow. |
| Blocked by billing | Not verified. |
| Blocked by missing Google Form access | Not verified. |

## Verified Behavior

- Manual inbox responses can be built from parsed rows.
- Response statuses include new, needs-review, approved, imported, wait-listed, rejected, duplicate, information-requested, and linked.
- Duplicate candidates use response ID, email, phone, and name.
- Review actions change local response status only.
- A response cannot become a registration without the organizer choosing an import path.
- Source scan did not find frontend secret values for HMAC or receiver credentials.
- `secretReferenceId` is represented as `not-stored-in-frontend`.

## Findings

| ID | Priority | Finding |
| --- | --- | --- |
| PASS3-FORMS-P1-001 | P1 | Automatic Google Forms receiver deployment, HMAC runtime secrets, billing state, and real form access were not production-verified. Do not describe automatic Forms intake as live until verified. |
| PASS3-FORMS-P2-001 | P2 | Non-registration target types are listed, but conversion workflows are not live. UI wording must avoid implying vendor/sponsor/baker modules are implemented. |
