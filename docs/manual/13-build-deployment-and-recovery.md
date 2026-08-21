# Build, Deployment, and Recovery

## Local Build

```powershell
npm ci
npm run lint
npm test
npm run build
npm run product:qa
```

## Firebase Project

Default project in `.firebaserc`: `gathervibeshub`.

Hosting public folder: `dist`.

Security headers and SPA rewrite are configured in `firebase.json`.

## Production-Impacting Commands

| Command | Impact | Prerequisites |
| --- | --- | --- |
| npm run firebase:deploy-hosting | PRODUCTION-IMPACTING COMMAND: deploys Hosting assets from dist. | Build passed; production visual check plan ready. |
| npm run firebase:deploy-rules | PRODUCTION-IMPACTING COMMAND: deploys Firestore Rules and indexes. | Rules tests passed; authorization impact reviewed. |
| npm run firebase:deploy-all | PRODUCTION-IMPACTING COMMAND: deploys Hosting, Rules, and indexes. | Use only when all targets intentionally changed. |

## Deployment Flow

```mermaid
flowchart TD
  Change[Code or docs change] --> Lint[npm run lint]
  Lint --> Tests[npm test]
  Tests --> Build[npm run build]
  Build --> QA[npm run product:qa]
  QA --> Decision{Runtime deployment needed?}
  Decision -- Docs only --> NoDeploy[No Firebase deploy]
  Decision -- Hosting changed --> Hosting[npm run firebase:deploy-hosting]
  Decision -- Rules changed --> Rules[npm run firebase:deploy-rules]
  Hosting --> Verify[Hard refresh production + console/network check]
  Rules --> Verify
```

No production deployment is performed by documentation generation.
