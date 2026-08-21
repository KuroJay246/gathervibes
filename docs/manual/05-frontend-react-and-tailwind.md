# Frontend React and Tailwind

Entry point: `src/main.jsx`
Top-level app: `src/App.jsx`
Authenticated shell: `src/layout/AppShell.jsx`
Global styles: `src/styles.css`

## React Patterns

- Lazy-loaded route pages are declared in `src/App.jsx`.
- `ProtectedRoute` blocks unauthenticated or unauthorized users.
- `AppShell` owns desktop sidebar, mobile drawer, mobile tab bar, page titles, Admin Search, page guidance, and TutorialProvider wrapping.
- Firebase writes are kept in service modules under `src/services/`.
- Shared validation and display helpers live in `src/utils/`.

## Tailwind Usage

Tailwind is used directly through class names and the Vite Tailwind plugin. The app uses compact cards, dense grids, responsive `sm`, `md`, `lg`, `xl` breakpoints, and semantic color usage tied to the Gather & Savor visual system.

Troubleshooting:

- Element not visible: check responsive utility prefixes and route/access gating.
- Mobile overflow: inspect fixed widths, tables, and long event names.
- Dynamic class not applying: avoid constructing class strings that Tailwind cannot see statically.
- Form accessibility issue: inspect associated label, id, name, and focus behavior.
