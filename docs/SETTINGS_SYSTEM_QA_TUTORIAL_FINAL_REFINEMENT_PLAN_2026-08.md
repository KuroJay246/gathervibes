# Settings, System QA, and Tutorial Final Refinement Plan

## Product Problem

Settings still needed to answer organizer questions in plain language: who has access, what roles mean, what can be configured, and which integrations are actually connected. System QA needed to read as a technical verification workspace rather than a normal organizer workflow. Tutorial V3 needed final retargeting after the organizer UI refinements.

## Issues and Corrections

| Area | Current behavior | Intended audience | Problem | Correction | Must remain unchanged |
| --- | --- | --- | --- | --- | --- |
| Settings access summary | Protected owner and secondary organizer copy existed, but staff profiles and event assignments were not clearly separated. | Non-technical organizer | Counts and sources could be conflated. | Separate Protected Owner, Approved Organizers, Staff Profiles, and Event Assignments. | No access-write controls added. |
| Role wording | Event Manager and helper wording was partly generic. | Organizer and QA | UI wording could sound broader than route/rule gates. | Align role summaries with current route and Firestore boundaries. | Rules and permissions unchanged. |
| Integrations | Connection states were spread across Data, Messages, and Advanced. | Organizer | Optional disconnected tools could look like errors. | Add a concise Integration status section. | No Gmail, WhatsApp, payments, OCR, or live Sheets connection. |
| Tutorial help | Replay was nested under Account only. | Organizer | Harder to find guided help. | Add Tutorial and Help section while keeping replay behavior. | Onboarding preference behavior unchanged. |
| Advanced controls | Advanced section mixed technical status with routine settings. | Admin / release reviewer | Needed clearer caution. | Add administrator-only caution and link System QA. | No destructive Settings action added. |
| System QA | Useful checks were grouped around broad organizer readiness. | Jaylan / release QA | Technical status, product status, and manual checks were not clearly separated. | Add Environment, Working Event, Access, Data Boundaries, Feature Status, and Manual Acceptance sections. | QA checks remain read-only. |
| Tutorial routes | Tasks and Reconciliation were not standalone tutorial stops. | Organizer | Tutorial did not teach all current primary workflow checkpoints. | Retarget two lessons to `/tasks` and `/payments/reconciliation`. | At the time, 20 anchored lessons, route paths, and zero-business-write behavior remained. |

## Behavior Preserved

- QR payload remains `GSV:TICKET:{ticketCode}`.
- CPB was not used for QA writes.
- CODEX_DEMO remains the safe QA fixture.
- Firestore Rules and indexes are unchanged.
- Scanner access remains assigned-event check-in only.
- Message Builder remains copy-only.
- Google Forms receiver remains packaged but not deployed.
- Google Sheets remains manual export/upload.
- Gmail, online payments, OCR, SMS, WhatsApp, and AI generation remain disconnected or unsupported.
