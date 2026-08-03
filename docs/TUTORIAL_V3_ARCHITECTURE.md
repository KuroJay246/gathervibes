# Tutorial V3 Architecture

## Version

`tutorial-v3-ground-up`

The new tutorial version does not treat prior `interactive-product-tour-v2` completion as completion for V3. Old onboarding fields remain preserved in the same secure user-owned preference document.

## Runtime Modules

- `TutorialProvider.jsx` owns orchestration, persistence, transitions, and replay events.
- `TutorialStateMachine.js` defines legal high-level states and reducer events.
- `TutorialController.js` creates transition IDs, owns cancellation, and waits for route/target readiness.
- `tutorialRoutes.js` defines the explicit supported tutorial routes.
- `tutorialRegistry.js` defines semantic target IDs and route-to-target requirements.
- `tutorialSteps.js` defines the current guided orientation steps.
- `tutorialStorage.js` reads and writes only `staffProfiles/{uid}/preferences/onboarding`.
- `TutorialOverlay.jsx`, `TutorialSpotlight.jsx`, `TutorialTooltip.jsx`, `TutorialArrow.jsx`, `TutorialProgress.jsx`, and `TutorialCompletion.jsx` render the single document-body overlay.
- `tutorialDiagnostics.js` produces safe diagnostics without private registration/payment contents.
- `useTutorial.js` and `useTutorialTarget.js` expose integration helpers.

## State Machine

The reducer uses explicit states:

- `idle`
- `opening`
- `preparing-route`
- `navigating`
- `waiting-for-route`
- `waiting-for-data`
- `waiting-for-target`
- `positioning`
- `presenting`
- `advancing`
- `reversing`
- `paused`
- `retryable-error`
- `completing`
- `completed`
- `closing`

The UI does not rely on a loose cluster of booleans to decide which tutorial surface is active.

## Transition Cancellation

Every step move creates a unique transition ID and an `AbortController`.

When a new transition starts:

- previous async work is aborted;
- stale route waits are ignored;
- stale target waits are ignored;
- stale callbacks cannot set the current step;
- Next/Back is disabled while a transition is active.

## Route Readiness

V3 does not use fixed navigation delays, generic `h1` checks, or uncontrolled polling.

A step presents only when:

1. the pathname matches the route definition;
2. the target ID belongs to the route registry;
3. the semantic `data-tour-id` element exists;
4. the target has a measurable bounding box;
5. the transition ID is still current.

## Target Registry

Targets use stable semantic IDs such as:

- `working-event-selector`
- `overview-summary`
- `create-event-action`
- `event-planning-workspace`
- `registrations-workspace`
- `payments-workspace`
- `tickets-workspace`
- `checkin-workspace`
- `operations-workspace`
- `message-builder-workspace`
- `reports-workspace`
- `imports-workspace`
- `settings-workspace`
- `system-qa-workspace`

The engine does not locate tutorial targets by visible text, class names, element order, or `nth-child`.

## Overlay and Positioning

One overlay is rendered into `document.body`. It uses:

- `getBoundingClientRect`;
- `ResizeObserver`;
- `IntersectionObserver`;
- `requestAnimationFrame`;
- scroll and resize cleanup;
- `visualViewport` sizing where available;
- safe viewport margins;
- collision-aware tooltip placement;
- arrow placement tied to the chosen side.

## Error Recovery

Route/target failure shows:

- failed step;
- expected route and target;
- Retry;
- Skip This Step;
- Exit Tour.

Diagnostics include tutorial version, step ID, route, target, transition ID, elapsed time, working event label, and viewport size. They do not include private registration or payment content.

## Practice Missions

V3 includes a practice-mode entry point and safe non-writing mission definitions. The default first-use guided orientation is read-only and writes only tutorial preference state.

## Firestore Contract

The existing secure document remains:

`staffProfiles/{uid}/preferences/onboarding`

Allowed fields are onboarding/tutorial-only. No role, access, staff, event, scanner, registration, payment, ticket, Operations, audit-log, or CPB fields are written by the tutorial runtime.
