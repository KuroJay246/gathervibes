# Access and Connected-Service Change Checklist

## Permanent Cross-System Rule

Whenever a setting, account, permission, schema, status, field, integration, or workflow changes in Firebase or another connected service, inspect and update every affected layer before release.

Required layers:

- External service/configuration.
- Firebase data.
- Firestore Rules.
- Backend/service functions.
- Validation and normalization.
- Frontend interface.
- Settings/admin visibility.
- Tests.
- Documentation.

A change is not complete if Firebase has been updated but the application UI does not show or understand it. Prefer one authoritative source of truth. For organizer access, that source is `settings/accessControl`; authorization and Settings visibility must both read that document.
