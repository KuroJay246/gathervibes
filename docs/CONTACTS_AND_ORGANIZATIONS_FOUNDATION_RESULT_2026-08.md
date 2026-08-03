# Contacts and Organizations Foundation Result - 2026-08

## Result

The app now has a reusable Contacts & Partners route at `/contacts` for people, organizations, and event relationship links.

## Product Boundary

This is not a CRM, marketing campaign system, access-control system, or messaging integration. Contacts do not grant application login access.

## Data Model

Reusable records:

- `contacts/{contactId}`
- `organizations/{organizationId}`

Event relationship records:

- `events/{eventId}/contactLinks/{linkId}`

This keeps reusable contact data separate from event-specific role/context.

## Organizer Workflow

- Add reusable contact
- Add organization
- Link contact or organization to selected Working Event
- Search by name, organization, phone, email, and category
- Filter by category/status/current-event relationship
- Review duplicate suggestions by email, phone, or organization name
- Create New Anyway when a suggestion is not the same person/business
- Create Follow-Up Task
- Open Message Builder with contact context

## Integrations

- Operations: optional `linkedContactId` and `linkedOrganizationId` fields are supported while preserving free-text historical values.
- Tasks: contact follow-up opens Tasks with organizer-confirmed prefill.
- Message Builder: contact context is copy-only and sends nothing.
- Documents: document references may point to contact and organization IDs.

## Security

Global contact and organization records contain contact PII and are organizer-only. Event relationship records are scoped to the selected event and readable to event-manager/viewer/operations-helper roles where route/rule scope justifies it. Scanner access remains isolated.

## Tests

`tests/document-contact-foundation.test.js` covers route wiring, duplicate suggestions, filters, event relationships, access boundaries, services, and guardrails.

