# Known Product And Data Discrepancies

Date: 2026-07-29
Branch: `codex/full-current-state-application-map`
Base commit inspected: `f61cb96d466975ca902e417025a1deff0445393c`

## Purpose

This register captures known product, data, wording, and workflow discrepancies that should be kept visible before the next implementation phase. It does not authorize any production write.

## Discrepancy Register

| ID | Area | Current state | Risk | Recommended next action |
| --- | --- | --- | --- | --- |
| D-001 | Git alignment | Local `main` and `origin/main` both point to `f61cb96`. | No current release-alignment blocker. The older Daily QA workflow-only local commit is preserved only on a backup branch, not on this documentation branch. | Keep future release and documentation branches based on updated `main`. |
| D-002 | Onboarding | Current `main` uses welcome modal plus route walkthrough. It is not the full interactive spotlight tutorial. | Organizer may still feel guided by a development tour rather than a polished training layer. | Continue the tutorial phase separately after this docs-only map. |
| D-003 | Onboarding copy | `AppShell` success modal hardcodes `Welcome aboard, Anica.` | Wrong or awkward for other approved organizers. | Replace with user-aware display name in the tutorial/code-fix branch, not this audit branch. |
| D-004 | Mobile navigation | Check-In can be rendered twice for roles that can view `/check-in` but cannot view `/dashboard`. | Scanner-like or narrow-role mobile users may see duplicate primary actions. | Add a focused navigation test and dedupe logic in a code-fix branch. |
| D-005 | CPB specificity | Dashboard, Registrations, Payments, and Operations still include CPB-specific evidence panels. | App can feel like a CPB recovery console rather than reusable event software. | Move CPB history to Reports/System QA/details where needed; keep daily pages event-agnostic. |
| D-006 | Finance model | Registration payments and Operations are separate, but users can still mentally combine them incorrectly. | Double-counting risk, especially around ticket revenue and event-level cash position. | Run a focused Registration Payments and Operations Financial Boundaries phase. |
| D-007 | Payments wording | Payments page contains documentary CPB ticket income support. | Useful audit context can distract from normal registration follow-up. | Keep evidence but make normal payment follow-up the first workflow. |
| D-008 | Operations wording | Operations cash position can be mistaken for event profit. | Organizer may infer final profitability when the app does not calculate final event profit. | Maintain explicit boundary copy and simplify the summary hierarchy. |
| D-009 | Google Forms | Google Forms-style headers are supported, but there is no live Forms sync. | Organizer may expect automatic imports. | Keep copy explicit: exported/pasted data only unless future integration is approved. |
| D-010 | Gmail | Gmail evidence exists historically, but no Gmail OAuth integration exists. | Organizer may expect live proof lookup or automatic matching. | Keep Gmail as external evidence until a privacy-scoped integration phase is approved. |
| D-011 | Horizontal UI | Some tables and tab strips are intentionally horizontally scrollable within containers. | Narrow mobile review can confuse contained scroll with page overflow. | Continue viewport QA and avoid document-level horizontal overflow. |
| D-012 | Settings | Settings is practical now but remains a tempting place for roadmap/status material. | Settings can become cluttered again. | Keep roadmap, implementation status, and technical history in docs/System QA. |
| D-013 | Event planning numbers | Event financial plan, Operations ledger, and registration payment totals are not one accounting ledger. | Organizer may compare numbers that are intentionally different. | Label planning, registration, and Operations values by source and purpose. |
| D-014 | CPB attendance | CPB historical attendance corrections are evidence-gated and not the same as live scanner check-in. | Incorrect assumption that historic attendance equals system check-in. | Keep attendance limitation wording in Reports and Check-In. |
| D-015 | Footer | The app does not currently rely on a persistent footer for organizer workflow. | Low risk, but users may expect support/version info somewhere. | If needed, place support/version in System QA or Settings, not daily task screens. |

## Production Data Boundaries

No production data write is authorized by this register.

CPB remains protected production data. Known locked CPB patron finance baseline from prior documented closeout remains:

- Expected: BBD $6,530.00
- Received: BBD $6,530.00
- Outstanding: BBD $0.00

This audit did not verify or mutate current live CPB records.

## Guardrail Status

The following must remain true for future phases unless separately authorized:

- QR payload stays `GSV:TICKET:{ticketCode}`.
- `approvedEmails` remains unchanged by UI code.
- Scanner remains assigned-event-only.
- Normal scanner Undo Check-In stays disabled.
- Normal scanner Check Out stays disabled.
- Access request approval/revoke workflow remains disabled until explicitly implemented.
- Firestore rules and indexes are not changed casually.
- CPB writes require exact named-record approval, drift checks, before snapshots, narrow field changes, audit logs, and post-write totals verification.

## Recommended Next Implementation Phase

The highest-value next product phase is Registration Payments and Operations Financial Boundaries.

Scope:

- Payment terminology.
- Ticket-revenue double-counting risk.
- Payment follow-up workflow.
- Registration financial totals.
- Operations reporting boundaries.
- Preparation for CPB reconciliation without altering CPB data.
