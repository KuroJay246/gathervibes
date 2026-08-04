# Phase 22A - Auth Reliability Local Review Fix

Branch: `codex/phase-22a-auth-reliability-local-review`

Status: in progress, not merged, not deployed

## Scope

Fix the recurring local Firebase Google sign-in failure where an approved admin could complete Google authentication but still end up back on `/login` or remain stuck on a loading state instead of entering the app.

This phase does not merge, deploy, change Firestore rules, change Firestore indexes, modify `approvedEmails`, broaden scanner access, touch CPB, or change the QR payload.

## Root Cause

The local auth path had two separate failure modes:

1. Firebase auth persistence and access verification could race during local startup and redirect handling.
2. After successful auth resolution, the app still depended on the login page to hand control off from `/login` to the correct protected route. In the reproduced local flow, auth completed but the app remained on `/login` with the loading screen.

## Changes Made

### `src/auth/authFlow.js`

- Added `clearGoogleSignInState()`.
- Kept return-path state readable until the session is fully handed off.

### `src/pages/LoginPage.jsx`

- Switched the login page from eagerly consuming Google sign-in state to reading it without clearing it first.
- Clear the stored sign-in state only after an authorized session is established.

### `src/auth/AuthProvider.jsx`

- Added provider-level authorized route handoff for sessions that resolve successfully while the browser is still on `/login`.
- Preserved explicit local persistence setup.
- Preserved popup-first local Google auth with redirect fallback only when needed.
- Kept unauthorized users signed in long enough to show a real access-verification error instead of forcing an immediate logout loop.

### Tests

- Extended `tests/auth-reliability.test.js` to cover the new provider-level handoff path and login-state cleanup behavior.

## Validation

- `npm run lint`: PASS
- `npm test`: PASS
- `npm run build`: PASS
- `npm audit --omit=dev`: PASS, 0 vulnerabilities
- `npm ls xlsx`: absent
- `npm ls read-excel-file`: present (`read-excel-file@9.2.0`)

## Real Browser Findings

Using the user's existing Chrome `Default` profile:

- The pre-fix bug was reproduced in a real local sign-out/sign-in cycle.
- After Google auth, the app returned to `/login` and stayed on the loading screen.
- After the code fix, the remaining live-browser blocker is the Google account chooser popup in the existing Chrome session. The popup must finish account selection before the post-auth route handoff can be confirmed end to end.

## Guardrails Preserved

- No merge
- No deploy
- No Firestore rules changes or deployment
- No Firestore indexes changes or deployment
- `approvedEmails` unchanged
- CPB untouched
- QR payload unchanged: `GSV:TICKET:{ticketCode}`
- `xlsx` absent
- `read-excel-file` present
- No dependency additions

## Remaining Step

Complete one final real local browser verification after the existing Chrome profile finishes the Google account chooser flow:

- Google sign-in returns to the protected app instead of sticking on `/login`
- `/dashboard` loads
- direct protected routes remain stable on reload
- organizer/admin review can resume on the fixed local session
