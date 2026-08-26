# Provider Integration Foundations

Current source-backed provider foundations live in:

- `integrations/backend/foundation.js`
- `integrations/google-forms/function/googleFormsReceiver.js`

These modules keep OAuth state, PKCE, token exchange, rate limiting, idempotency, and sanitized provider error handling on the server side. Browser and mobile clients remain limited to status display and copy-only fallbacks until owner-managed provider authorization is completed.

## Current source status

- Gmail: backend OAuth/send foundation complete in source, not connected
- Microsoft Outlook / Microsoft 365: backend OAuth/send foundation complete in source, not connected
- Google Sheets: backend OAuth/preview foundation complete in source, not connected
- Google Forms receiver: signed intake receiver foundation complete in source, not deployed

## Required owner actions

### Google

1. Use the `gathervibeshub` Google Cloud project that backs production Firebase.
2. Confirm OAuth consent configuration for the Gather & Savor production identity.
3. Add the production authorized domain for `gathervibeshub.web.app`.
4. Create or validate the exact web OAuth client for the integration callback routes.
5. Register the exact redirect URIs that the deployed backend will use.
6. Enable the Gmail API.
7. Enable the Google Sheets API.
8. Create secure server-side secret storage for the Google client secret and callback secrets.
9. Add the protected owner as an allowed test user until verification/publishing is complete.
10. Perform owner-approved Gmail and Sheets connection tests after deployment.

### Microsoft

1. Use the intended Microsoft Entra tenant for Gather & Savor.
2. Register the backend application and exact redirect URIs.
3. Grant or approve the minimum required delegated scopes, including `Mail.Send`.
4. Confirm tenant consent policy for the production mailbox.
5. Create secure server-side secret storage for the Microsoft client secret and callback secrets.
6. Perform one owner-approved Outlook connection and send test after deployment.

## Mobile emulator support

The mobile app now supports Firebase emulator wiring through `apps/mobile/.env.example`:

- `EXPO_PUBLIC_FIREBASE_USE_EMULATORS`
- `EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`
- `EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST`

This is for controlled Android E2E and QA only. It must remain disabled for production builds.
