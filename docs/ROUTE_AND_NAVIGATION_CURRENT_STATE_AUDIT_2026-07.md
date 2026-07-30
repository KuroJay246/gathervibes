# Route and Navigation Current State Audit

Audit pass: Pass 2
Date: 2026-07-30
Production URL: `https://gathervibeshub.web.app`

## Scope

Authenticated production route and navigation inspection covered the organizer routes, route redirects, scanner route separation, Working Event behavior, CPB completed-event behavior, CODEX_TEST visibility, and no-selected-event states.

## Routes Inspected

- `/`
- `/login`
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
- `/security`
- `/unknown-audit-route`

Structured route evidence is saved in `output/full-repository-audit/route-matrix.json` and `output/full-repository-audit/browser-results.json`.

## Findings

- Authenticated `/` resolves to `/dashboard`.
- Authenticated `/login` redirects to `/dashboard`.
- `/security` redirects to `/settings`.
- `/unknown-audit-route` shows the designed not-found page.
- Protected organizer routes did not show AppErrorBoundary.
- Desktop and mobile route probes did not show page-level horizontal overflow.
- `/imports` and `/event-review` contain the word "login" in page copy or actions, but did not redirect to the login screen during the authenticated route probe.

## Navigation

The production organizer navigation currently presents:

- Daily workspace: Overview, Events, Guests & Registrations, Payments, Tickets, Check-In, Operations, Message Builder, Reports.
- Admin: Import Center, Settings, System QA.

Scanner remains a separate route and is not presented as a normal organizer workspace route in the desktop primary navigation.

## Working Event

The Working Event strip is visible in the authenticated organizer shell and communicates the selected event scope. Clearing the Working Event produced clean no-selected states on Overview and Reports without stale CPB totals.

Evidence: `output/full-repository-audit/working-event-results.json`.

## CPB and CODEX_TEST

- CPB appears as a normal completed real event.
- CPB has visible edit/setup controls for an approved organizer.
- No CPB-specific lock or special protected-event warning was observed.
- CODEX_TEST is hidden from normal event list mode.
- Show Test Events reveals CODEX_TEST and marks it as a Test Event.

No production records were created, edited, deleted, checked in, reconciled, imported, or financially modified during this pass.
