# Remove Google Forms Integration

1. Open the Apps Script project attached to the Google Form.
2. Run `removeGatherSavorTriggers`.
3. Delete script properties: `GSV_ENDPOINT_URL`, `GSV_SHARED_SECRET`, `GSV_CONNECTION_ID`, `GSV_EVENT_ID`, `GSV_FORM_ID`.
4. Disable the corresponding Gather & Savor connection.
5. Leave existing inbox response records as audit history unless a separate retention policy authorizes deletion.

Removing the trigger stops automatic delivery. Manual CSV, XLSX, and pasted-row review remain available in Import Center.
