# Gather & Savor Staff Mobile

Expo development-build application for protected Gather & Savor staff workflows.

## Current scope

- Google sign-in through the native Google Sign-In SDK and React Native Firebase Auth
- Workspace authorization against the existing web access model
- Secure selected-event persistence with `expo-secure-store`
- Event selection and event-day home
- Registration lookup, manual ticket entry, QR scanner, and guarded check-in
- Read-only tasks, contacts, notes, and limited reports

## Commands

```bash
npm install
npm run lint
npx expo start --dev-client
npm run android:e2e:seed
npm run android:e2e
```

## Native setup

- Android and iOS Firebase config files live in this directory.
- Native Android project files are generated with `npx expo prebuild --platform android --no-install`.
- Native iOS project files must be generated from macOS or Linux.
- Local emulator-driven mobile QA uses `.env` values that mirror `.env.example`.
- EAS build profiles live in `eas.json` for `development`, `preview`, and `production`.
- Gather Android QA uses only the dedicated clean `gsv_api36_staff_clean` AVD. Set `GSV_ANDROID_DEVICE_ID` and `GSV_ANDROID_AVD_NAME` explicitly; the older `gsv_api36_staff` AVD is contaminated and the Couple Book `medium_phone` AVD is not valid for this harness.
- Real Android Google sign-in requires the Firebase Android app to have the active signing certificate SHA-1 registered and an Android OAuth client in the downloaded `google-services.json`. This is an owner Firebase/Google Cloud configuration action; do not substitute the web client for the missing Android registration.

## Android E2E

- Seed the Firebase emulators with `npm run android:e2e:seed`.
- Start the Firebase emulators from the repo root.
- Start Metro with `EXPO_PUBLIC_FIREBASE_USE_EMULATORS=true`, `EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=10.0.2.2:9099`, `EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST=10.0.2.2:8080`, and `GSV_MOBILE_E2E_AUTH=true`.
- The hidden `/e2e-auth` route is available only when both emulator mode and `GSV_MOBILE_E2E_AUTH=true` are present. Production and ordinary development builds remain Google-only.
- Run `npm run android:e2e` after the app is installed on the emulator. The harness rejects an unspecified AVD, a mismatched AVD name, or an installed Couple Book package.

## iOS and EAS

- `eas.json` contains Windows-safe build profile setup only. Expo project linking, Apple signing, and physical iPhone validation remain owner actions.
- `GoogleService-Info.plist`, bundle identifier, camera permission text, deep-link scheme, and secure-store usage are already configured in `app.json`.

## Validation status as of 2026-09-26

- `npm run lint` passes
- `npx expo-doctor` passes
- `npx expo export --platform android` passes
- `npx expo prebuild --platform android --clean --no-install` passes
- JDK 17 plus the configured Android SDK produce a development-client debug APK
- The guarded Android suite passes 11/11 flows on `gsv_api36_staff_clean` against isolated Auth and Firestore emulators
