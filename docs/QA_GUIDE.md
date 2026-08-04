# QA Guide

## Safe QA event

- Use `CODEX_DEMO - Full System Walkthrough` for synthetic QA, organizer rehearsal, and demo/training walkthroughs.
- Real events use the same standard safeguards and must not be used for synthetic QA.
- Prefix temporary QA business records with `QA_DEMO_`.

## Local validation

Fast gate:

```powershell
npm run product:qa
```

Full audit:

```powershell
npm run product:audit
```

Supporting checks:

```powershell
npm run lint
npm test
npm run build
npm audit --omit=dev
npm run doctor
npm run doctor:changed
npm run doctor:json
git diff --check
git status --short
```

## Browser review

Review these routes at minimum:

- `/dashboard`
- `/events`
- `/registrations`
- `/payments`
- `/tickets`
- `/check-in`
- `/operations`
- `/communications`
- `/imports`
- `/event-review`
- `/settings`
- `/qa`

Review across desktop, tablet, and mobile widths. Confirm:

- no horizontal overflow
- navigation remains usable
- buttons and dialogs fit
- no AppErrorBoundary fallback
- no app-originated console errors

## Cleanup

Delete temporary QA business records after testing. Preserve audit logs.
