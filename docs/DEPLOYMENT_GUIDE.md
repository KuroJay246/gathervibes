# Deployment Guide

## Before merge

1. Update the working branch from `main`.
2. Run `npm run product:qa`.
3. Run `npm run product:audit`.
4. Review the changed file scope and `git diff --check`.
5. Confirm no private evidence entered Git.

## Merge and push

1. Merge with `--no-ff`.
2. Push `main` normally.
3. Do not force-push.

## Deploy

Hosting:

```powershell
npx firebase-tools deploy --only hosting --project gathervibeshub
```

Rules only when reviewed changes exist:

```powershell
npx firebase-tools deploy --only firestore:rules --project gathervibeshub
```

Do not deploy unrelated targets unless they are explicitly part of the approved release.

## Production smoke

After deployment:

1. Confirm the correct Firebase project is active.
2. Open the live site with an approved organizer session.
3. Review the primary organizer routes.
4. Confirm authentication restore or normal sign-in works.
5. Confirm CODEX_TEST remains the safe QA event.
6. Confirm CPB patron totals and approved Operations totals remain unchanged unless a separate approved write package was applied.
