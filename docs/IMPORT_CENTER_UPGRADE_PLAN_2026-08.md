# Import Center Upgrade Plan 2026-08

## Product Problem

Import Center had working import pieces, but source choice, record purpose, templates, header review, validation, and Response Inbox review were presented too close together. Organizers needed a clearer path before any data write.

## Upgrade Plan

- Split the workflow into Source, Record Type, Upload/Paste, Template, Headers, Mapping, Validation, Review, Confirm, and Result.
- Keep the current guest-registration import service and Firestore write path unchanged.
- Make every source honest about whether it is connected, manual, local parsing, or fallback guidance only.
- Mark non-registration record types as review-only until dedicated workflows exist.
- Improve header mapping with detected field, confidence, status, example value, and duplicate-header visibility.
- Keep Google Forms Response Inbox as manual response review unless a receiver is separately deployed and authorized.

## Guardrails

- No Firestore collection, rules, or index changes.
- No new dependencies.
- No live Google Sheets, Gmail, OCR, payment, AI, or message-sending integration.
- No production data import during implementation.
- QR payload remains `GSV:TICKET:{ticketCode}`.
