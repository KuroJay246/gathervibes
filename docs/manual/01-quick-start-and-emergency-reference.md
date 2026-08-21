# Quick Start and Emergency Reference

## Immediate Symptom Table

| Symptom | First check | Next manual section |
| --- | --- | --- |
| Blank page | Browser Console and Network; check stale chunk or Firebase config | Troubleshooting: blank page or dynamic import failure |
| Permission denied | Signed-in account, `settings/accessControl`, staff assignment, Firestore rule line | Permissions and Security; Permission runbooks |
| Login fails | Firebase Auth provider, authorized domain, popup/redirect state | Firebase Authentication; Login failure runbook |
| Scanner fails | Camera permission, HTTPS, QR payload, assigned event, ticket code lookup | Imports/Exports/QR; Scanner runbook |
| Build fails | Terminal error and changed files | Build Deployment and Recovery |
| Production fails | Hosting deployment, asset cache, Firebase project, Console | Emergency recovery runbooks |

## Safe First Commands

```powershell
git status --short --branch
git rev-list --left-right --count main...origin/main
npm run lint
npm test
npm run build
```

Do not run deployment commands while diagnosing unless the fix is known, tested, and approved.
