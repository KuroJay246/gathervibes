# Gathetr Owner's Technical Operations, Development, Maintenance and Repair Manual

Displayed title: Gathetr Technical Manual

Document version: 2026-08-21 Phase 3B
Generated: {{GENERATION_DATE}}
Application source commit documented: {{APPLICATION_COMMIT}}
Documentation commit: {{DOCUMENTATION_COMMIT}}
Documentation branch at generation: {{CURRENT_BRANCH}}
Repository: https://github.com/KuroJay246/gathervibes.git
Firebase project: gathervibeshub
Production URL: https://gathervibeshub.web.app
Status: Documentation-only manual repair and expansion

## Document Control

This manual covers the runtime application source at the recorded application commit and the documentation source at the recorded documentation commit. It does not claim to describe later changes unless regenerated.

Source documents in `docs/` are authoritative. The HTML and PDF outputs are generated reading copies.

## How to Use This Manual

- Start with the Emergency Reference when the app is failing right now.
- Use the main manual chapters for architecture, routes, permissions, and feature maintenance.
- Use the Runbook Section for step-by-step diagnosis and repair.
- Use the appendices for field-level Firestore details, command safety, and route/file indexes.

## Revision History

- Phase 3: initial technical summary and first generated PDF.
- Phase 3B: rendering repair, runbook expansion, appendices, bookmarks, and PDF validation.

## Protected Boundaries

- Do not expose `.env.local`, cookies, tokens, service account JSON, or private Firebase keys.
- Do not use CPB for synthetic QA or fake data.
- QR payload format must remain `GSV:TICKET:{ticketCode}` unless explicitly approved and migrated.
- Firestore Rules, Auth, Hosting, Functions, and production data require explicit validation and approval before deployment.
- This Phase 3B documentation generation requires no Firebase deployment and makes no runtime behavior change.
