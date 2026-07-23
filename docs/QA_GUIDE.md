# QA Guide

## Safe QA event

- Use `CODEX_TEST Live Verification Event` for destructive QA and demos.
- Keep CPB read-only unless a separate production-safe approval exists.
- Prefix temporary QA business records with `QA_PHASE23S_`.

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

Delete temporary demo business records after testing. Preserve audit logs.
