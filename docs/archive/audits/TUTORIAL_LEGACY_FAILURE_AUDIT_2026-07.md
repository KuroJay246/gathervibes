# Tutorial Legacy Failure Audit - 2026-07

## Scope

This audit covers the legacy onboarding runtime removed during the tutorial-v3 rebuild:

- `src/components/onboarding/AppWalkthrough.jsx`
- `src/components/onboarding/WelcomeCelebration.jsx`
- `src/components/onboarding/onboardingSteps.js`
- `src/components/onboarding/useOnboarding.js`
- `src/layout/AppShell.jsx` onboarding integration
- `firestore.rules` onboarding preference contract
- onboarding tests and the related Git history

## Git Origin

- `9a15eae` introduced the Antigravity personalized welcome and guided walkthrough.
- `d55df79` patched resume, completion text, and success feedback.
- `4ffba71` decoupled some state and attempted navigation stabilization.
- `ebccf1f` replaced the walkthrough copy with the interactive product tutorial and added route targets.
- `9c089f7` expanded the Firestore `lastStep` boundary after production completion failed.
- `74c85bf` added a route-recovery patch after production navigation stalled.

## Root Causes

### Coupled UI Booleans

- Symptom: welcome, walkthrough, and success overlays could become inconsistent.
- File: `useOnboarding.js`.
- Trigger: replay, completion, close, and async Firestore writes.
- Race risk: separate `showWelcome`, `showWalkthrough`, and `showSuccess` booleans did not encode one legal state.
- Decision: removed and replaced with a reducer/state-machine boundary.

### Fixed Route Polling

- Symptom: route transitions passed or failed based on timing rather than true page readiness.
- File: `AppWalkthrough.jsx`, `waitForRouteReady`.
- Trigger: lazy page loading, Firestore loading, browser history state, slow device/network.
- Race risk: stale callbacks could resolve after a later step transition.
- Decision: removed. V3 uses transition IDs, `AbortController`, route definitions, and target readiness checks.

### Generic Header/Marker Readiness

- Symptom: tutorial could present a step while the previous page shell was still visible.
- File: `AppWalkthrough.jsx`, `ROUTE_HEADER_TITLES`, `ROUTE_READY_MARKERS`.
- Trigger: React Router route changed before the lazy page and target content were stable.
- Why tests missed it: source-level tests checked marker strings, not slow-loading route transitions.
- Decision: removed. V3 waits for the expected pathname and a stable semantic `data-tour-id` target.

### Stale Navigation Completion

- Symptom: Back/Next/retrace could be overwritten by a previous async route wait.
- File: `AppWalkthrough.jsx`, `navigateToStep`.
- Trigger: rapid Next/Back, browser Back/Forward, and slow route content.
- Race risk: no transition token owned the async route wait.
- Decision: removed. V3 transitions generate unique IDs and abort previous work.

### Spotlight Timing

- Symptom: target boxes sometimes measured before scroll, layout, sticky headers, or mobile viewport changes settled.
- File: `AppWalkthrough.jsx`, `updateSpotlight`.
- Trigger: scroll, resize, mobile browser chrome, lazy content, sticky navigation.
- Cleanup risk: resize/scroll listeners were global and recalculated against current state only.
- Decision: removed. V3 centralizes measurement in the overlay with `ResizeObserver`, `IntersectionObserver`, `requestAnimationFrame`, scroll/resize cleanup, and viewport margins.

### Weak Back Operation

- Symptom: Back decremented step state before the previous route was confirmed ready.
- File: `AppWalkthrough.jsx`, Back button handler.
- Trigger: route A -> route B -> Back to route A under slow loading.
- Decision: removed. V3 treats Back as a reversing transition with the same route/target readiness gate as Next.

### Storage Version Coupling

- Symptom: old completed state could suppress new tutorial behavior.
- File: `useOnboarding.js`.
- Trigger: version changes and replay after completion.
- Decision: V3 uses `tutorial-v3-ground-up` and preserves old fields while opening once for the new version.

### Insufficient Error Recovery

- Symptom: route timeout could leave the organizer stuck with navigation controls disabled or mismatched content.
- File: `AppWalkthrough.jsx`.
- Trigger: target missing, permission route, route load delay.
- Decision: V3 exposes Retry, Skip This Step, and Exit Tour with diagnostics and no raw stack trace.

## Retained Concepts

- Per-user storage at `staffProfiles/{uid}/preferences/onboarding`.
- Jaylan and Anica as independent eligible tutorial users.
- Organizer-name personalization via trusted display helpers.
- Manual replay from Settings.
- One-time opening for a new tutorial version.
- Zero business writes during the normal guided orientation.

## Removed Concepts

- Legacy `AppWalkthrough` runtime.
- Legacy step array import path.
- Fixed 100ms route polling.
- Generic `h1`/`main` readiness gates.
- Navigation timeout recovery based on `PopStateEvent` patches.
- Boolean-only overlay state.
- Duplicate overlay/completion ownership in `AppShell`.
