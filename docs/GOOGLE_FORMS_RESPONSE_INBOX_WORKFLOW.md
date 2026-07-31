# Google Forms Response Inbox Workflow

## Current Workflow

Google Forms Response Inbox is a manual review queue in the organizer app. The organizer pastes a CSV response export, reviews detected respondents, resolves duplicates or missing information, approves safe guest-registration responses, then continues approved rows to the normal mapping and preview flow.

## Status

The frontend supports manual response review. Automatic Google Forms delivery is not activated from Import Center.

## Review Actions

Supported review actions are Approve, Import, Request Information, Wait-List, Reject, Mark Duplicate, and Link to Existing Record. These actions classify the response review state. They do not create a registration until approved guest-registration rows go through mapping, validation, final preview, and confirmation.

## Boundaries

- No automatic email, WhatsApp, Gmail, or Sheets sending.
- No automatic receiver deployment.
- No automatic registration creation.
- No write to unsupported record types.
