# Gather & Savor Staff Mobile

Expo development-build application for protected Gather & Savor staff workflows.

## Current scope

- Email/password sign-in through React Native Firebase Auth
- Workspace authorization against the existing web access model
- Secure selected-event persistence with `expo-secure-store`
- Event selection and event-day home
- Registration lookup, manual ticket entry, QR scanner, and guarded check-in
- Read-only tasks, contacts, notes, and limited reports

## Commands

```bash
npm install
npm run lint
npx expo start
```

## Native setup

- Android and iOS Firebase config files live in this directory.
- Native Android project files are generated with `npx expo prebuild --platform android --no-install`.
- Native iOS project files must be generated from macOS or Linux.

## Validation status as of 2026-08-24

- `npm run lint` passes
- `npx expo-doctor` passes
- `npx expo export --platform android` passes
- `npx expo prebuild --platform android --no-install` passes
- `gradlew assembleDebug` reaches Android SDK discovery and requires a configured local SDK
