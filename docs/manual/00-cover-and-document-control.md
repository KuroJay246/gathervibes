# Gathetr Owner's Technical Operations, Development, Maintenance and Repair Manual

Displayed title: Gathetr Technical Manual

Document version: 2026-08-21 Phase 3
Generated: 2026-08-21T04:41:38.930Z
Application commit documented: 1baf2796f4c5be143bc1f8f242546ebc2c155e1d
Documentation branch at generation: docs/gathetr-technical-manual
Repository: https://github.com/KuroJay246/gathervibes.git
Firebase project: gathervibeshub
Production URL: https://gathervibeshub.web.app

## Document Control

This manual covers the code and configuration present at the recorded commit only. It does not claim to describe later commits unless regenerated.

Source documents in `docs/` are authoritative. The PDF is a generated readable snapshot.

## Protected Boundaries

- Do not expose `.env.local`, cookies, tokens, service account JSON, or private Firebase keys.
- Do not use CPB for synthetic QA or fake data.
- QR payload format must remain `GSV:TICKET:{ticketCode}` unless explicitly approved and migrated.
- Firestore Rules, Auth, Hosting, Functions, and production data require explicit validation and approval before deployment.
- This Phase 3 documentation generation requires no Firebase deployment and makes no runtime behavior change.
