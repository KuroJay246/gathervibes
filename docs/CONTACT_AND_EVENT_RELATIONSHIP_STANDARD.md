# Contact and Event Relationship Standard

## Purpose

Contacts and organizations store reusable business/contact details. Event relationships describe how a person or organization participates in one selected event.

## Reusable Contact

Path: `contacts/{contactId}`

Fields:

- display name
- first name
- last name
- organization ID
- role/title
- category
- email
- phone
- preferred contact method
- location
- website
- social link
- status
- notes
- search text
- audit metadata

## Organization

Path: `organizations/{organizationId}`

Fields:

- name
- category
- primary contact ID
- email
- phone
- website
- social link
- location
- status
- notes
- search text
- audit metadata

## Event Relationship

Path: `events/{eventId}/contactLinks/{linkId}`

Fields:

- event ID
- contact ID
- organization ID
- relationship type
- role for event
- status
- primary for event
- notes
- audit metadata

## Relationship Types

Venue contact, Supplier, Sponsor, Facilitator, Corporate client, Helper, Partner, Other.

## Duplicate Standard

Duplicate detection uses normalized email, normalized phone, and organization name. Matches are suggestions only. The first version does not implement destructive merge.

## Access Standard

Business contacts are not staff assignments. Staff access remains controlled by `staffProfiles` and `events/{eventId}/staffAssignments/{uid}` only.

