# Organizer Shell and Overview Refinement Plan

Date: 2026-08

## Product Problem

The organizer interface already has stable operational routes, but the shell and Overview still carry too much equal-weight information and inconsistent product grouping. The Phase 1 goal is to make the app feel like one coherent private event-operations product without changing records, calculations, permissions, imports, tickets, check-in, or Firebase security boundaries.

## Scope

In scope:

- Shared visual-system tokens and reusable shell treatment.
- Desktop sidebar, collapsed desktop sidebar, mobile More menu, and page container consistency.
- Working Event context visibility.
- Overview source-supported metrics, attention items, quick actions, recent activity, and empty states.

Out of scope:

- New routes, Tasks, idea/research features, payment gateway, Gmail/WhatsApp sending, Google Forms receiver activation, Firestore rules, Functions, Storage, Auth configuration, or new collections.

## Issue Inventory

| Component or route | Current behavior | Organizer problem | Proposed correction | Behavior preserved |
| --- | --- | --- | --- | --- |
| Application shell | Navigation grouped as daily/admin buckets | Daily work, review/data, and administration are not visually distinct enough | Group navigation as Home, Event Management, Operations, Review and Data, Administration | Existing route paths and `canViewRoute` filtering |
| Desktop sidebar | Full-width only | Organizer cannot compact navigation on wider screens | Add collapsed sidebar with accessible labels and title hints | Same links, same route guards |
| Mobile navigation | Event-day priorities are already primary | More menu needs product grouping parity | Keep Overview, Guests, Tickets, Check-In, More; group More menu by product area | Scanner route remains separate |
| Working Event strip | Repeated but useful scope marker | Needs to stay compact and consistent | Keep compact strip in shell and sidebar with event name, date, status, change action | Changing Working Event does not change event status |
| Overview metrics | Four-card summary plus secondary money detail | Important operational numbers are not all visible together | Show registrations, guests, registration payments, tickets, check-ins, Operations expenses, commitments | Existing finance and registration helpers |
| Overview quick actions | Included task-like and supplier/sponsor wording | Suggests capabilities that belong in ChatGPT or Operations details | Use route-backed actions only: registration, payment, import, Operations, tickets, check-in, reports, event edit, message builder | Existing routes only |
| Overview financial wording | Showed projected cash position | Risk of reading planning math as profit/accounting | Remove cash-position wording from Overview | Registration payments and Operations stay separate |
| Recent activity | Not visible as a concise section | Organizer lacks a safe "what changed recently" scan | Derive safe summaries from existing event, registration, and Operations timestamps | No new activity collection |
| Visual system | Hardcoded colors are repeated | Inconsistency and higher maintenance cost | Add `--gsv-*` tokens and reusable shell/status classes | Existing brand palette |
| Accessibility | Navigation is mostly labelled | Collapsed navigation needs explicit labels | Use `aria-label`, `title`, visible focus, safe touch targets | Current landmarks and route structure |

## Guardrails

- No CPB production writes.
- No Anica account use.
- CODEX_DEMO remains the QA/test event.
- QR payload remains `GSV:TICKET:{ticketCode}`.
- Firestore rules and indexes remain unchanged.
- Dependencies remain unchanged.
