# Settings and Access Presentation Standard

Settings is for practical organizer configuration and support. It must not become System QA.

## Required Sections

- Account: signed-in identity and role.
- Workspace: selected Working Event and app workspace context.
- Event Defaults: current practical defaults only.
- Organizer Access: protected owner, approved organizers, staff profiles, event assignments, and role wording.
- Tutorial and Help: replay Tutorial V3 where supported.
- Integrations: truthful connection status.
- Advanced: read-only administrative information and route to System QA.

## Access Language

- Protected Owner: full approved-organizer functionality plus UID-pinned owner protections.
- Approved Organizer: normal organizer-level management while approved.
- Event Manager: assigned-event task and check-in workflow access only.
- Viewer: assigned-event read-only behavior where read-only surfaces exist.
- Scanner: assigned-event check-in lookup and completion only.
- Operations Helper: assigned-event Operations ledger visibility only.

## Prohibited Settings Behavior

- No role editing from this page.
- No Firestore Rules editing.
- No destructive bulk action.
- No secrets, HMAC values, OAuth tokens, cookies, or private keys.
- No false connection state for optional integrations.
