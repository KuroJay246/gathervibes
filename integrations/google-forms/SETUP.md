# Google Forms Response Inbox Setup

This package connects a Google Form to the Gather & Savor Form Response Inbox without auto-importing records.

Automatic delivery requires Firebase Functions on an already-enabled Blaze project. Do not enable billing from this repo task.

## Manual Fallback

1. Open the linked Google Form response Sheet.
2. Export responses as CSV or XLSX.
3. Open Gather & Savor Import Center.
4. Paste or upload the export into Google Forms Response Inbox.
5. Review each response.
6. Approve only confirmed responses.
7. Continue approved guest-registration responses to mapping.
8. Import only from the final preview.

## Automatic Delivery

1. Deploy a signed HTTPS Function using `function/googleFormsReceiver.js`.
2. Store the receiver secret in Firebase Secret Manager.
3. Store the same secret in Apps Script Properties as `GSV_SHARED_SECRET`.
4. Store `GSV_ENDPOINT_URL`, `GSV_CONNECTION_ID`, `GSV_EVENT_ID`, and `GSV_FORM_ID` in Apps Script Properties.
5. Run `healthCheckGatherSavorConfig`.
6. Run `installGatherSavorTrigger`.

Never store the shared secret in React, Firestore documents, source control, browser storage, or logs.

## Connection Fields

- connection name
- form ID
- event ID
- target type
- status
- mapping version
- last response
- last success
- last failure
- secret reference identifier

Supported target types are guest registration, baker application, vendor application, sponsor inquiry, volunteer application, school participation, feedback, and custom review record.
