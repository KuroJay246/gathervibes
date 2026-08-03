# Document Reference Data Standard

## Purpose

Document references help organizers find external agreements, receipts, quotations, forms, permits, schedules, policies, reports, and evidence for the selected event.

## Storage Rule

The application stores only reference metadata and external URLs. It must not store uploaded files, raw external document bodies, credentials, browser cookies, private keys, or copied document contents in Firestore.

## Required Fields

- `documentId`
- `eventId`
- `eventName`
- `title`
- `category`
- `description`
- `status`
- `required`
- `url`
- `documentType`
- `provider`
- `storageLocation`
- `linkedContactId`
- `linkedOrganizationId`
- `linkedTaskId`
- `linkedOperationId`
- `linkedCommitmentId`
- `dueDate`
- `expiryDate`
- `versionLabel`
- `notes`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

## Categories

Venue, Agreement / Contract, Finance, Quotation, Receipt, Invoice, Supplier, Sponsor / Partner, Registration, Safety, Permit / Licence, Insurance, Marketing, Event Day, Programme / Schedule, Learning / Workshop Material, Policy, Report, Other.

## Statuses

Needed, Requested, Received, Draft, Under Review, Approved, Current, Expired, Replaced, Not Required.

## URL Handling

URLs must be HTTP or HTTPS. UI should show the hostname where possible, open links explicitly in a new context, and use `rel="noreferrer noopener"`.

## Expiry Logic

Expired and Expiring Soon are derived from `expiryDate`. Expiring Soon uses a 30-day window. Derived timing does not permanently mutate the stored status by itself.

