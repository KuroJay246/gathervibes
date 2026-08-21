# Runbook 1. Application and Session Failures

## Purpose

Repair organizer-facing failures where the app does not boot correctly, loses session state, or loops back to login.

## Symptoms

- Blank page after navigation.
- `Failed to fetch dynamically imported module`.
- Login succeeds briefly, then the app returns to `/login`.
- Session does not persist across refresh.
- Firebase appears unavailable in the browser.

## Severity

High.

## Possible causes

- Stale browser cache after a Hosting release.
- Broken dynamically imported bundle.
- Firebase config mismatch.
- Persistence setup failure in `AuthProvider`.
- Browser storage or cookie restrictions.

## Safety warnings

- Do not deploy while diagnosing unless the fix is already proven.
- Do not clear production data or mutate auth state to test a theory.

## Evidence to collect

- Current route and query string.
- Console error text.
- Network failures for JS chunks or Firebase requests.
- Signed-in user state if visible.
- App build commit shown by diagnostics where available.

## First checks

1. Confirm whether the issue reproduces after hard refresh.
2. Check console for dynamic-import, Firebase, or storage errors.
3. Check whether the browser is offline or unstable.
4. Confirm the route is expected for the current role and Working Event.

## Files to inspect

- `src/components/AppErrorBoundary.jsx`
- `src/utils/appErrorDiagnostics.js`
- `src/lib/firebase.js`
- `src/auth/AuthProvider.jsx`
- `src/auth/ProtectedRoute.jsx`
- `firebase.json`

## Commands to run

- `npm run build`
- `npm run product:qa`
- `npm run e2e:smoke`
- `npm run admin:verify-firebase` only if a safe production-read check is justified

## Step-by-step diagnosis

1. If the screen is blank and console shows a failed chunk fetch, treat it as stale deployment drift first.
2. Reload with a cache-busting navigation and confirm the requested JS asset exists in the current build output.
3. If the app returns to `/login`, inspect `AuthProvider` persistence setup and the computed return route.
4. If Firebase initialization fails, verify `VITE_FIREBASE_*` values are present in the active environment without exposing secrets.
5. If the browser loses auth only on refresh, inspect local persistence restrictions or browser storage failures.

## Repair options

- Stale chunk: redeploy only the correct hosting build in a later release phase, then hard-refresh.
- Session failure: correct persistence or return-path logic and retest locally.
- Firebase boot issue: correct local environment or document missing configuration.

## Verification

- Organizer can load `/dashboard` after refresh without losing session.
- No dynamic-import failure remains in console.
- `npm run product:qa` and `npm run e2e:smoke` pass.

## Rollback

- Revert the bad frontend commit or restore the previous Hosting release.

## Escalation conditions

- Protected Owner cannot sign in.
- Dynamic-import failure persists across clean local rebuild and validated release artifact.
- Firebase configuration appears broken in production.

## Search keywords

- blank page
- dynamic import
- stale deployment chunk
- auth persistence
- session lost
- return to login

## Related tests

- `tests/error-boundary-classification*.test.js`
- `tests/auth-reliability.test.js`
- `e2e/navigation.spec.js`

## Related manual sections

- Application Overview
- Firebase Authentication
- Build, Deployment, and Recovery
