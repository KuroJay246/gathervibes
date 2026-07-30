# Manual Operator Acceptance Checklist - 2026-07

Use this checklist before broad organizer rollout or before a major production workflow change. It is intentionally manual because the audit could not honestly automate these areas end-to-end.

## Environment

- Production site: `https://gathervibeshub.web.app`
- Test event: `CODEX_TEST Live Verification Event`
- Test event ID: `xPfa0b3KZyLSDnAD2uGI`
- Real completed event reference: Cake Piknik Barbados
- CPB event ID: `zhaPxi31cpqLAW0cuS20`

## Safety Rules

- Do not create, edit, delete, check in, refund, reconcile, or financially modify production records during acceptance unless a separate write contract approves it.
- Do not treat CPB as specially locked or specially protected.
- Do not use CODEX_TEST in real-event totals.
- Do not capture passwords, cookies, tokens, verification codes, Gmail, or Google account details.

## Manual Checks

| Item | Pass Criteria | Result |
| --- | --- | --- |
| Tutorial V3 full production walkthrough | Every step can be completed from start to finish without modal targeting defects, route confusion, or data writes outside tutorial-safe actions. | Pending manual acceptance |
| Tutorial modal/form interaction | Let Me Try steps that open forms clearly guide Cancel/Next behavior and do not trap focus. | Pending manual acceptance |
| True 200 percent zoom - Dashboard | Native browser zoom at 200 percent has no horizontal overflow or obscured primary actions. | Pending manual acceptance |
| True 200 percent zoom - Registrations | Table/list controls remain readable and operable. | Pending manual acceptance |
| True 200 percent zoom - Tickets | Ticket actions and QR status remain usable. | Pending manual acceptance |
| True 200 percent zoom - Check-In | Event-day check-in controls remain touch/click usable. | Pending manual acceptance |
| True 200 percent zoom - Operations | Ledger summary and entry controls remain readable without hidden critical actions. | Pending manual acceptance |
| True 200 percent zoom - Reports | Registration Payments and Operations sections remain separate and readable. | Pending manual acceptance |
| CPB normal completed event | CPB appears as a completed real event and does not show special protected-event lock language. | Pending manual acceptance |
| CPB standard editing controls | Approved organizer can see normal edit controls without saving changes. | Pending manual acceptance |
| CODEX_TEST hidden by default | Normal event lists hide CODEX_TEST by default. | Evidence supported, recheck before release |
| Show Test Events | CODEX_TEST appears when Show Test Events is used where implemented. | Evidence supported, recheck before release |
| Scanner boundary | Scanner account/session, if available, cannot access organizer/admin shell, Event Review, Undo Check-In, or Check Out. | Pending scanner-session acceptance |
| Browser console | Dashboard, Registrations, Operations, Reports, Imports, Settings, and QA show no app-originated red console errors. | Evidence supported, recheck before release |

## Acceptance Output

Record:

- date and browser;
- account role used;
- selected Working Event;
- pass/fail per item;
- exact route and visible failure text for any issue;
- screenshots only when they do not expose private guest data.
