# Google Forms Integration Testing

Run these checks before any automatic deployment.

- Valid signed response returns accepted and creates only a pending inbox response.
- Missing signature is rejected.
- Invalid signature is rejected.
- Stale timestamp is rejected.
- Repeated idempotency key does not create a second response.
- Wrong form ID is rejected.
- Wrong event ID is rejected.
- Disabled connection is rejected.
- Malformed JSON is rejected.
- Missing mapping stays in Needs Review.
- Duplicate response ID, email, phone, name, or business name is flagged for organizer review.
- Approve does not import automatically.
- Reject, Wait-List, Request Information, Mark Duplicate, and Link Existing do not create registrations.
- Conversion rechecks event, permissions, duplicate state, and target type.
- Manual CSV, XLSX, and pasted rows use the same review workflow.
- Cross-user writes are denied by Firestore rules before production use.
- Mobile and 200 percent zoom keep review actions usable.

Use only CODEX_TEST for QA. Do not test against Cake Piknik Barbados.
