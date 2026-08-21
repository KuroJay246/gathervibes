# Appendix D. Error Index and Search Keywords

## Error Index

| Message or symptom | Most likely area | First runbook |
| --- | --- | --- |
| `Failed to fetch dynamically imported module` | Hosting deploy drift or browser cache | Application and Session Failures |
| `Missing or insufficient permissions` | Firestore Rules or organizer/staff access mismatch | Permission and Access Failures |
| Redirect loop to `/login` | Authentication state or access resolver | Application and Session Failures |
| Scanner opens but cannot find assigned event | Staff assignment or Working Event mismatch | Scanner, Ticket, and Check-In Failures |
| Ticket code collision | Ticket generation/import data | Import and Data Repair |
| `Firestore rules are not filters` | Query shape exceeds rule visibility | Permission and Access Failures |
| Emulator ports already in use | Local QA infrastructure | Development, Build, and Test Failures |
| `NO_ADC_FOUND` or Firebase admin credential issue | Production-read admin tooling | Deployment, Firebase, and Project Targeting |
| Playwright smoke timeout | Local app boot, route error, or emulator startup | Development, Build, and Test Failures |
| React Doctor warning | Changed code health issue | Development, Build, and Test Failures |

## Search Keywords

- `dynamic import stale chunk deployment cache-bust`
- `permission denied approved organizer protected owner staff assignment`
- `scanner camera QR html5-qrcode GSV:TICKET`
- `ticket code collision duplicate registration import`
- `Firestore rules are not filters query denied`
- `firebase project selected wrong hosting rules deploy`
- `emulator port 8080 9099 collision`
- `React Doctor changed scope warning`
- `worktree detached branch local changes lost`
- `documentation generation pdf bookmark toc`
