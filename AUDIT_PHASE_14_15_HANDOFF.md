# Gather & Savor Event Hub — System Audit After Phase 13A

**Audit Date:** 2026-06-24  
**Auditor:** Codex Automated System Audit  
**Branch:** `codex/system-audit-phase-14-15-planning`  
**Main Commit Audited:** `9ee9b29b15a7328fb440cd0e11332c0bd326e348`  
**Firebase Project:** `gathervibeshub`  
**Live Site:** https://gathervibeshub.web.app

---

## 1. Executive Summary

The Gather & Savor Event Hub is a **private, allowlist-gated, organizer-facing** event management platform deployed on Firebase Hosting + Firestore. After Phase 13A, the application has reached a stable and well-tested multi-feature baseline covering all critical event operations.

**Key strengths:**
- Robust Firestore security rules with strict schema enforcement and per-action validation.
- Approved-admin email allowlist enforced at the Firestore layer — no client-side bypass is possible.
- Full audit log trail for all registrations, tickets, and check-in actions. `update, delete: if false` blocks tampering.
- 162 passing tests, 9 legitimately skipped (Firestore emulator not running), 0 failures.
- All deferred features properly excluded: no OAuth, no AI API keys, no sending.
- Export scoping correctly prevents cross-event data leakage via `filteredRegistrations` guard.
- QR payloads contain ticket code only (`GSV:TICKET:{CODE}`) — no PII.
- Camera QR scanner is scaffolded via `QrScannerPanel.jsx` with `html5-qrcode` — selects guest without auto-check-in.

**Key risks and gaps identified:**
1. **Staff role enforcement is UI-only** — `checkInStaff` and `viewer` roles display in UI but are NOT enforced in Firestore rules. Any approved email has full write access regardless of role.
2. **Import batch is a single Firestore batch** — >400 rows may fail or be rejected. No chunked recovery on partial failure.
3. **No Firestore offline persistence** — connectivity loss during event-day check-in could drop state silently.
4. **`preferredSchool` does not persist as a top-level field** — it is mapped to `notes` on import, creating a roundtrip mismatch with the export template header.
5. **Event delete does not cascade-delete registrations** — orphaned registrations remain queryable.
6. **`test_output.txt` was committed** to the feature branch. Contains no sensitive data but should be `.gitignore`d.
7. **CSV injection** — `convertToCsv` does not strip leading `=`, `+`, `-`, `@` characters that trigger formula injection in Excel/Google Sheets.
8. **No pagination** — all registrations for an event are loaded into memory. Risk for 500+ guest lists.

---

## 2. Current Main / Deployment Status

| Item | Value |
|------|-------|
| Main branch commit | `9ee9b29b15a7328fb440cd0e11332c0bd326e348` |
| Feature branch (Phase 12A/13A) commit | `73553dd` |
| Live URL | https://gathervibeshub.web.app |
| Firebase project | `gathervibeshub` |
| Hosting deployment | Complete (Phase 12A + 13A) |
| Firestore rules deployed | Unchanged from Phase 11 |
| npm run lint | ✅ Pass — 0 errors |
| npm test | ✅ Pass — 162 pass, 9 skip, 0 fail |
| npm run build | ✅ Pass — 1785 modules |
| `.env.local` staged | No |
| Credentials staged | No |
| App code changes on audit branch | No |

---

## 3. Completed Phase Inventory

| Phase | Description | Merged Commit |
|-------|-------------|--------------|
| Phase 8 | Core event/registration/auth foundation | Early history |
| Phase 8.1 | Import Center, duplicate review | `f2ddd60` |
| Phase 8.2 | XLSX import, sheet selection, buyer/attendee mapping | `00a0bfd` |
| Phase 8.3 | Stability, canonical domain, permission-denied diagnostics | `ce8e897` |
| Phase 9 | Finance tracker — ticketPrice, amountDue/Paid/Balance, dashboard snapshot | `0d2d75d` |
| Phase 10 | Staff role UI foundation (display only), Admin Access UI | `133c992` |
| Phase 11 | Communications Pro copy-only, segment builder, template library, CSV packet | `4bb796c` |
| Phase 12A | Google Sheets-ready export presets, ImportTemplatesPanel, workflow helper | `73553dd` |
| Phase 13A | AI Draft Lab (draft-only, no API keys), tone selector, Copy AI Prompt | `73553dd` |

---

## 4. Route and UI Inventory

### `/login` — `LoginPage.jsx`
- **Purpose:** Authentication gateway. Google OAuth + email/password sign-in.
- **Write actions:** Firebase Auth only (no Firestore writes).
- **Read-only actions:** Reads `settings/accessControl` to verify allowlist membership after sign-in.
- **Role restrictions:** None — access controlled by allowlist check in `AuthProvider.jsx`.
- **Risks:** Rate-limiting relies on Firebase (no client-side throttle UI). `?googleMode` auto-trigger uses `setTimeout(0)` — minor edge case.
- **Suggested improvements:** Add loading fallback if auth hangs. Guard against redirect loop if `from` points to `/login`.

### `/` → redirects to `/dashboard`
- `src/App.jsx` line 24 — index redirect via `<Navigate>`.

### `/dashboard` — `DashboardPage.jsx`
- **Purpose:** Event-day command center; finance snapshot, counts, upcoming events, quick links.
- **Write actions:** None. Sets active event in React context/localStorage only (not Firestore).
- **Read-only actions:** `subscribeToRegistrations(eventId)`, `subscribeToEvents()`.
- **Risks:** Subscription errors silently discarded (`() => {}`). Counts load full dataset with no pagination.
- **Suggested improvements:** Surface subscription errors. Progressive load for large events.

### `/events` — `EventsPage.jsx`
- **Purpose:** Full CRUD for events.
- **Write actions:** `createEvent`, `updateEvent`, `deleteEvent` — each batched with `auditLog`.
- **Read-only actions:** `subscribeToEvents()`.
- **Risks:** Delete is permanent, no soft-delete. No cascade-delete for registrations (orphan risk). `friendlyFirebaseError` can leak raw Firebase messages as fallback.
- **Suggested improvements:** Warn before deleting events with existing registrations. Add "Archive" status.

### `/registrations` — `RegistrationsPage.jsx`
- **Purpose:** Full registration management — list, add, edit, delete, bulk actions, export.
- **Write actions:** Create, update, bulk update, delete registrations (with audit logs). All scoped to `activeEvent.eventId`.
- **Read-only actions:** List, filter, calculate finance, ExportModal (client-side CSV only).
- **Risks:** Bulk delete uses `window.confirm`/`window.prompt` which can be suppressed in iframe contexts. `alert()` used for some error states. No undo for bulk delete. No pagination.
- **Suggested improvements:** Replace `alert()` with inline error banner. Add virtual list for large events. Debounce search input.

### `/imports` — `ImportsPage.jsx`
- **Purpose:** Multi-step CSV/XLSX import wizard plus ImportTemplatesPanel.
- **Write actions:** `commitImport` at Step 6 only — creates registrations + audit logs in atomic batch.
- **Read-only actions:** Steps 1–5 are entirely client-side: parsing, mapping, validation, duplicate detection, preview.
- **Risks:** No client-side file size or row count limit. Single Firestore batch may fail for >400 rows. `window.confirm` used for sheet change. No progress indicator during commit.
- **Suggested improvements:** Add max-row warning (>500). Add chunked batch (50/batch). Add file size cap.

### `/tickets` — `TicketsPage.jsx`
- **Purpose:** Ticket code assignment, QR display, print/copy.
- **Write actions:** Assign/unassign/regenerate ticket (batched with audit log).
- **Read-only actions:** Display QR codes, event-day summary, search.
- **QR payload:** `GSV:TICKET:{TICKET_CODE}` — no PII. ✅
- **Risks:** No bulk ticket assignment. Print prints whole page, not just QR grid.
- **Suggested improvements:** Bulk auto-assign for all unassigned. Print-specific CSS for QR grid.

### `/check-in` — `CheckInPage.jsx`
- **Purpose:** Event-day door check-in — QR scan, manual lookup, check-in, undo.
- **Write actions:** `completeCheckIn`, `undoCheckIn`, `recordDuplicateCheckInAttempt` — all batched with audit logs.
- **Read-only actions:** Guest lookup, helper lists, door list CSV copy (clipboard only).
- **Risks:** No offline support. Search results capped at 8 (`slice(0, 8)`). Undo confirm modal doesn't show check-in timestamp.
- **Suggested improvements:** Enable Firestore offline cache. Show check-in timestamp in undo confirm. Make result cap configurable.

### `/communications` — `CommunicationsPage.jsx`
- **Purpose:** Copy-only message preparation, segment filtering, AI Draft Lab.
- **Write actions:** None. Clipboard copy only.
- **Read-only actions:** Filter registrations, build message preview, generate AI prompt string.
- **Safety:** No API key, no OAuth, no sending. "Draft Only" and "Safety Notice" labels prominent. ✅
- **Risks:** Copied "All Messages" packet can contain PII for hundreds of guests — no clipboard warning. AI prompt includes event name/date/location (non-PII but organizer should know it goes to ChatGPT if pasted there).
- **Suggested improvements:** Add brief warning near "Copy AI Prompt" about third-party paste. Replace `alert()` clipboard fallback.

### `/qa` — `QaPage.jsx`
- **Purpose:** Internal QA center — ~43 system health checks, CODEX_TEST fixture management, checklist.
- **Write actions:** None. All Firestore operations are reads.
- **Read-only actions:** Reads events, registrations, auditLogs (limit 1), accessControl.
- **Risks:** Some checks are hardcoded `'pass'` strings (documentation-style, not runtime assertions). No loading spinner on "Run QA checks". Can run against any Working Event (not just CODEX_TEST).
- **Suggested improvements:** Add warning/block when active event is not CODEX_TEST. Add spinner during async checks. Add check for empty allowlist.

### `/settings` — `SettingsPage.jsx`
- **Purpose:** Admin profile, access control display, roadmap, system health.
- **Write actions:** Logout only.
- **Read-only actions:** Display all state from `useAuth()` and `useActiveEvent()`.
- **Risks:** Approved email list visible to all approved admins (acceptable for this scope).
- **Suggested improvements:** Add signout confirmation. Link to Firebase console for deferred/disabled actions.

### `/security` — Redirect to `/settings`
- `src/App.jsx` line 21: `<Navigate to="/settings" replace />`.

### `*` — `NotFoundPage.jsx`
- 404 fallback route.

---

## 5. Feature Matrix

| Feature | Location | Status | Data Touched | Firestore Write? | Security Concern | Next Action |
|---------|----------|--------|--------------|-----------------|-----------------|-------------|
| Auth (Google + email) | `LoginPage`, `AuthProvider` | ✅ Complete | `settings/accessControl` read | No | Low — allowlist enforced server-side | Maintain |
| Access allowlist | `accessRoles.js`, `SettingsPage`, rules | ✅ Complete | `settings/accessControl` (read-only client) | No | Low — created in Firebase Console only | Maintain |
| Staff roles (UI display) | `accessRoles.js`, `SettingsPage`, `AppShell` | ⚠️ Partial | None | No | **Medium — roles NOT Firestore-enforced** | **Phase 15** |
| Working Event | `ActiveEventProvider`, localStorage | ✅ Complete | localStorage | No | Low — queries scoped to event | Maintain |
| Events CRUD | `EventsPage`, `eventService` | ✅ Complete | `events`, `auditLogs` | Yes | Low — validated in rules | Add cascade guard |
| Registrations | `RegistrationsPage`, `registrationService` | ✅ Complete | `registrations`, `auditLogs` | Yes | Low — all writes batched | Add pagination |
| Bulk operations | `RegistrationsPage`, `registrationService` | ✅ Complete | `registrations`, `auditLogs` | Yes | Low — eventId scoping confirmed | Add rollback |
| Import CSV/XLSX | `ImportsPage`, `importService` | ✅ Complete | `registrations`, `auditLogs` | Yes (Step 6 only) | Low — preview-before-write | Add chunked batching |
| Duplicate review | `importUtils`, `ImportPreviewTable` | ✅ Complete | None (client-side) | No | Low | Maintain |
| Export (Phase 12A) | `ExportModal`, `exportUtils` | ✅ Complete | None (client-side) | No | Low — scoped to active event; **CSV injection gap** | Fix `=` stripping |
| Import templates (Phase 12A) | `ImportTemplatesPanel` | ✅ Complete | None (client-side) | No | Low | Maintain |
| Finance calculations | `financeUtils` | ✅ Complete | None (pure functions) | No | Low | Fix overpayment warning |
| Finance snapshot | `DashboardPage` | ✅ Complete | `registrations` read | No | Low | Maintain |
| Tickets | `TicketsPage`, `ticketService` | ✅ Complete | `registrations`, `auditLogs` | Yes | Low | Add bulk assign |
| QR codes | `TicketQrCode`, `qrTicketUtils` | ✅ Complete | None | No | **Low — ticket code only, no PII** ✅ | Maintain |
| Camera scan | `QrScannerPanel` | ⚠️ Partial | None (guest selection only) | No | Low — no auto check-in | **Phase 14** |
| Check-In | `CheckInPage`, `checkInUtils` | ✅ Complete | `registrations`, `auditLogs` | Yes | Low — duplicate blocked at rules | Phase 14 polish |
| Communications | `CommunicationsPage`, `communicationsUtils` | ✅ Complete | None (copy-only) | No | Low | Maintain |
| AI Draft Lab (Phase 13A) | `CommunicationsPage` | ✅ Complete | None (copy-only) | No | Low — no API key ✅ | Add ChatGPT caveat notice |
| Google Sheets tools (Phase 12A) | `exportUtils`, `ImportTemplatesPanel` | ✅ Complete | None | No | Low | Maintain |
| QA Center | `QaPage`, `qaHelper` | ✅ Complete | Read-only | No | Low | Add more runtime assertions |
| Settings | `SettingsPage`, `SystemHealthPanel` | ✅ Complete | None | No | Low | Maintain |
| Audit logs | `auditService`, all services | ✅ Complete | `auditLogs` (append-only) | Yes | Low — `update/delete: if false` ✅ | Maintain |
| Firestore rules | `firestore.rules` | ✅ Complete | N/A | N/A | Medium — role rules not yet enforced | **Phase 15** |
| CPB protection | Rules + CODEX_TEST isolation | ✅ Complete | N/A | N/A | Low | Maintain |

---

## 6. Data Model and Firestore Collections

### `settings/accessControl` (singleton)
```
approvedEmails: list<string>       — allowlist (Firebase Console only)
rolesByEmail: map<string, string>  — optional role assignments (UI-only enforcement)
```
Client can **get** (if approved). Cannot create/update/delete from client ever.

### `events/{eventId}`
```
eventId (immutable), eventName (1-150), eventDate (timestamp), location (1-250),
eventType (enum: cake-picnic|brunch|tasting|vendor-pop-up|private-food-experience|other),
status (enum: draft|upcoming|active|completed|cancelled),
capacity (int 1-100000), ticketPrice (number 0-1000000), notes (0-10000 chars),
priceTiers? (list<map> max 7 — each: name enum, price number, status enum),
createdAt (immutable timestamp), updatedAt (server timestamp)
```

### `registrations/{registrationId}`
```
Required: registrationId, eventId, fullName (1-250), email, phone, groupName,
  personsAttending (int 1-100), paymentStatus (enum), paymentReference,
  ticketStatus (enum), ticketCode, ticketAssignedAt, ticketAssignedBy,
  notes (0-10000), checkedIn (bool), checkInTime, checkedInBy,
  source (manual|csv-import), sourceRowId, timestamp, createdAt, updatedAt

Optional: buyerName, attendeeNames (list max 100), priceTier, ticketPrice,
  amountDue, amountPaid, balanceDue, paymentMethod (enum)
```
> ⚠️ `preferredSchool` is NOT a top-level Firestore field. It is mapped to `notes` during import but included as a column header in export templates — creating a roundtrip gap.

### `auditLogs/{logId}`
```
logId, eventId, action (enum), targetType, targetId, performedBy, timestamp, details
```
`update, delete: if false` in rules — append-only, tamper-proof. ✅

### Reserved (blocked) collections
All blocked via explicit `allow read, write: if false` rules:
- `/tickets/{documentId}`
- `/checkIn/{documentId}`
- `/communications/{documentId}`
- `/aiDrafts/{documentId}`
- `/settings/{documentId}` (catch-all, distinct from `settings/accessControl`)
- `/{document=**}` (wildcard catch-all at end)

---

## 7. Auth, Roles, and Security Review

### Authentication
- Google Sign-In (`signInWithPopup`, fallback to `signInWithRedirect`) and Email/Password via Firebase Auth.
- Every sign-in runs `verifyAdminAccess(user)` in `AuthProvider.jsx` — reads `settings/accessControl`, checks `approvedEmails` (case-insensitive via `.lower()` in rules, `normalizeAccessEmail` client-side).
- If not approved → immediately signed out. `ProtectedRoute` checks `user != null` (post-approval).
- `isApprovedAdmin()` in Firestore rules enforces this server-side regardless of client behavior.

### Role System (`accessRoles.js`)
| Role | ID | Current Enforcement |
|------|----|-------------------|
| Owner | `owner` | UI display only |
| Admin | `admin` | UI display only |
| Check-In Staff | `checkInStaff` | UI display only ⚠️ |
| Viewer | `viewer` | UI display only ⚠️ |

**Critical gap:** `checkInStaff` and `viewer` roles are stored in `accessControl.rolesByEmail` but Firestore rules only check `isApprovedAdmin()`. All approved emails have identical full write access, regardless of role. `roleCapabilitySummary()` in `accessRoles.js` explicitly documents this limitation.

### Firestore Rule Highlights
- `settings/accessControl` is `allow get: if isApprovedAdmin()` — list/create/update/delete all false.
- `isValidRegistration()` validates 25+ fields including all finance fields, enum values, and size limits.
- `registrationIdentityUnchanged()` ensures `registrationId`, `eventId`, `source`, `sourceRowId`, `createdAt` can never be changed on update.
- Check-in updates are strictly validated: `checkedIn false→true` with `checkInTime == request.time` enforced at rules level. Duplicate check-in is impossible via Firestore.
- Audit log `create` requires `timestamp == request.time` — prevents backdated logs.

---

## 8. Import / Export Review

### Import Center — Detailed Assessment
- **CSV:** Hand-written RFC-4180 parser (`parseCSV`) — handles quoted fields, embedded commas/newlines. Edge case risk with non-standard encodings.
- **XLSX:** `read-excel-file` library reads display values only — no formula execution, no macro execution. ✅
- **Sheet selection:** Explicit confirmation step required before mapping — prevents accidental sheet selection.
- **Header auto-detection:** `detectHeaderField` has ~100 alias entries with `high`/`medium`/`none` confidence. Fuzzy fallback (anything with "name" not "group" → `fullName`) could mis-map exotic spreadsheets.
- **Duplicate detection:** `sourceRowId` is a SHA-256 hash (via Web Crypto API) of event+source+name+email+phone+timestamp. Same source row re-imported → blocked. Contact sharing → warning only (not blocked).
- **Buyer/attendee mapping:** `buyerName`, `attendeeNames` (multi-column or single newline-separated), `personsAttending` reconciliation.
- **Finance mapping:** All 6 finance fields mapped. `parseMoney` strips BBD/USD/$, rejects negatives.
- **Import templates (Phase 12A):** 6 templates with correct headers. `preferredSchool` included as column — maps to `notes` in import. Roundtrip gap exists.
- **Batch limits:** All rows committed in a single Firestore batch. `commitImport` chunks into groups of 5 sub-batches of 2 (registration + audit) = effective batch sizes. However, a 300-row import creates 300 batch sets that are written sequentially — no parallel chunking or rollback on mid-import failure.
- **Permission-denied:** Error caught, diagnostic panel shown. Guest row values deliberately excluded from error display. ✅

### Export (Phase 12A) — Detailed Assessment
- **Scoping:** `filteredRegistrations` from `RegistrationsPage` — filtered by `activeEvent.eventId` before passing to modal. ✅
- **Exclusions:** `auditLogs`, `settings/accessControl`, `registrationId` (in some presets) — none appear in any export preset. ✅
- **Presets:** `basic`, `door`, `finance`, `communications`, `admin`, `reimport` (Google Forms re-import).
- **`reimport` preset:** Uses human-readable column headers matching Import Center's header auto-detection aliases. Includes `ticketCode`, `paymentReference`, `amountPaid` — financially complete for roundtrip.
- **CSV injection gap:** `convertToCsv` does not strip leading `=`, `+`, `-`, `@` characters. Values starting with these in names or notes could execute as spreadsheet formulas in Excel/Google Sheets. **Medium risk — fix before events with external stakeholders.**
- **Download/copy:** Both available. `downloadCsv` uses Blob URL + hidden anchor — browser-only (safe).

---

## 9. Finance Review

### Calculation Architecture
`calculateRegistrationFinance(reg, event)` — pure function, derives all finance values from stored fields or falls back to `event.ticketPrice`. Called per-registration in: ExportModal, RegistrationCard, CommunicationsPage, TicketsPage, CheckInPage, QaPage.

### Payment Status Enum
`paid | pending | complimentary | door | door-list | unknown`

> ⚠️ `door-list` is valid in Firestore rules but has no dedicated tab filter in `RegistrationsPage`. Registrations with this status appear in "All" only.

### Finance Field Flow
```
Import/Manual → ticketPrice, amountDue, amountPaid → stored in Firestore
Display → calculateRegistrationFinance derives balanceDue = max(0, amountDue - amountPaid)
```
> Overpayment (amountPaid > amountDue) is silently floored to `balanceDue = 0`. No warning generated.

### Finance Display Coverage
- **Dashboard:** `buildFinanceSummary` snapshot — totalExpected, collected, outstanding, door, complimentary.
- **Registrations:** Finance card per registration. Filter tabs: Outstanding Balance, Missing Amount, Missing Ticket Price.
- **Communications:** Finance segments — outstanding balance, balance due, missing amount, etc.
- **Check-In:** Balance due warning shown in guest card.
- **Tickets:** Balance shown per registration row.
- **QA:** Finance checks including paid-with-outstanding-balance detection.

---

## 10. Tickets / QR / Check-In Review

### Ticket Code System
- **Random format:** `GSV-XXXXXX` (6 chars from `TICKET_ALPHABET` — 32 chars, excludes 0,1,I,O).
- **Sequential format:** `{PREFIX}-NNN` where prefix is derived from event name initials (max 6 chars).
- **Flexible format (imports):** `FLEXIBLE_TICKET_CODE_PATTERN = /^[A-Z0-9][A-Z0-9 _-]{0,31}$/` — accepts organizer-assigned codes like `CPB-TEST-001`, `DOOR-001`, `VIP-001`.
- **Uniqueness:** Checked client-side against `existingRegistrations` (event-scoped). Race condition risk if two admins assign simultaneously — no Firestore transaction.

### QR Payload
```
GSV:TICKET:{NORMALIZED_TICKET_CODE}
```
- `qrPayloadForTicketCode()` validates code before encoding — returns `''` for invalid codes.
- `parseQrTicketCode()` accepts raw codes or prefixed codes, strips prefix, normalizes uppercase.
- **No PII in QR payload.** ✅ Confirmed by static analysis and tests.

### Camera Scanner — Current State
`QrScannerPanel.jsx` uses `html5-qrcode` via dynamic import (lazy-loaded, not in main bundle):
- `facingMode: 'environment'` — rear camera preferred.
- `fps: 10`, `qrbox: 240×240`.
- On success → calls `resolveTicket(decodedText, 'scan')` → calls `onMatch(registration, ticketCode)`.
- Parent `CheckInPage` handles check-in confirmation — scanner does NOT auto-check-in. ✅
- Camera failure → graceful error with manual lookup fallback. ✅

**Missing for production camera use:**
- No audio beep or haptic vibration on successful scan.
- No torch/flashlight toggle (dark venues).
- No "continuous scan mode" (auto-reset after each check-in).
- No HTTPS enforcement check at runtime (required for camera API — hosting is HTTPS, so low risk).
- No real mobile device testing documented.

### Check-In Flow (complete)
1. Search by name / email / ticket code / buyerName / attendeeNames.
2. Select guest (or QR scan pre-selects).
3. View guest card — balance due warning, door payment warning, missing ticket warning.
4. Click "Check In" → `completeCheckIn()` → Firestore batch (`checkedIn=true`, `checkInTime=server`, `checkedInBy=email`, `updatedAt` + audit log).
5. Firestore rules validate: `checkedIn false→true`, `checkInTime == request.time`, `performedBy == auth.email`.
6. Duplicate check-in blocked at Firestore level — even if client tries. ✅
7. "Undo Check-In" → in-page confirm modal → `undoCheckIn()` → batch clears check-in fields + audit log.

---

## 11. Communications / AI Draft Lab Review

### Segment System
14 filter dimensions: `paymentStatus`, 10 `financeSegment` values, `checkInStatus`, `ticketStatus`, 9 `contactSegment` values, `groupName`, free-text search.

### Template Library
14 pre-built templates: payment reminder, balance due, door payment, payment received, ticket/QR reminder, check-in instructions, missing ticket follow-up, event reminder, group reminder, thank-you, post-event, internal note, and more. All use `{{token}}` placeholders replaced client-side via `buildMessagePreview`.

### Copy Features
- Copy One Message (first in segment)
- Copy All Messages (all in segment)
- Copy Recipient List (Name | Email | Phone)
- Copy CSV Packet (all messages as CSV rows)

### AI Draft Lab (Phase 13A)
- **Mode toggle** between Standard and AI Draft Lab in the Message Editor.
- **8 tone options:** Professional, Warm, Friendly, Formal, Casual, Short WhatsApp, Urgent, Luxury/Brand.
- **Prompt construction:** Assembles event name/date/location, segment stats (total, outstanding balance, pending count), selected template layout, and placeholder instructions into a structured ChatGPT-ready prompt.
- **No API calls.** Pure string concatenation. No HTTP requests from this feature. ✅
- **"Draft Only" label** prominently shown. "Safety Notice" banner at top of page. ✅
- **Gap:** AI prompt includes `event.eventDate` and `event.location`. If pasted to ChatGPT, these event details go to OpenAI. A brief notice about this is missing.

### Confirmed No-Send Verification
- No `sendEmail()`, `fetch()`, `axios`, `nodemailer`, `sgMail`, or similar in any file.
- No SMTP credentials, SendGrid keys, Twilio keys in codebase.
- No Cloud Functions calls.
- `runtimeHealth.js` health check explicitly asserts this. ✅

---

## 12. QA Center and Test Coverage Review

### QA Center (~43 checks)
Covers: Working Event exists, registrations present, payment breakdown, missing tickets, buyerName/attendeeNames, invalid persons count, finance totals, balance mismatches, auditLog reachability, QR privacy assertion, role/access detection, Phase 10/11/12A/13A checks, no-send/no-OAuth confirmation, CODEX_TEST isolation.

**Known gap:** Several checks are documentation-style `'pass'` strings, not runtime assertions. Example: `"Verified in ExportModal logic"` is a static string, not a live check.

### Test Suite — Full Results

| Test File | Key Coverage | Pass | Skip |
|-----------|-------------|------|------|
| `csv-parser.test.js` | CSV parsing, normalization, stable ID, duplicate detection | ✅ | 0 |
| `event-utils.test.js` | Event validation, date parsing | ✅ | 0 |
| `firestore-checkin-rules.test.js` | Check-in/import rules (emulator), static rules analysis | ✅ | 9 |
| `import-center.test.js` | Source selector, ticket dedup, XLSX normalization, paste path | ✅ | 0 |
| `phase10-phase11-roles-communications.test.js` | Role resolution, template system, CSV packet, QR privacy | ✅ | 0 |
| `phase25-foundation.test.js` | PWA, service worker, auth, audit structure, mobile nav | ✅ | 0 |
| `phase31-additions.test.js` | Price tiers, countdown, upcoming events, CSV blank rows | ✅ | 0 |
| `phase45-ticketing.test.js` | Ticket lifecycle, check-in flow, search, static rules analysis | ✅ | 0 |
| `phase6-communications.test.js` | Templates, preview, filters, group/search, CSV export | ✅ | 0 |
| `phase7-qr-checkin.test.js` | QR format, privacy, lookup scoping, component isolation | ✅ | 0 |
| `phase8-event-day-polish.test.js` | Event-day helpers, label formatters, CSV output | ✅ | 0 |
| `phase81-import-center.test.js` | Full import pipeline — mapping, attendee names, merges | ✅ | 0 |
| `phase82-admin-polish.test.js` | Door payment, organizer ticket codes, school field, bulk ops | ✅ | 0 |
| `phase83-phase9-finance.test.js` | Finance math, import finance fields, segments, domain safety | ✅ | 0 |
| `production-qa.test.js` | QA fixture isolation, CODEX_TEST recognition, script safety | ✅ | 0 |
| `registration-metrics.test.js` | Shared metrics, persons count, check-in sequencing | ✅ | 0 |
| `registration-utils.test.js` | `validateRegistration` — required fields, enums, constraints | ✅ | 0 |
| `search-health.test.js` | Admin search, runtime health items, allowlist privacy | ✅ | 0 |
| **TOTAL** | | **162** | **9** |

**Skipped tests:** 9 Firestore emulator tests in `firestore-checkin-rules.test.js`. These skip cleanly when `FIRESTORE_EMULATOR_HOST` is not set. Not a failure.

### Missing Test Coverage
1. `ExportModal.jsx` — no direct rendering tests; `buildExportRows` and `convertToCsv` have no unit test file.
2. `ImportTemplatesPanel.jsx` — not covered by any test.
3. AI Draft Lab mode toggle, tone selector, and prompt text content — not tested.
4. Cross-event export scoping (verify exported rows all share same `eventId`).
5. `door-list` payment status tab filter behavior.
6. Camera scan → guest selection → check-in integration flow.
7. Firestore CRUD rules for `events` and general `registrations` — only check-in/import rules are emulator-tested.
8. `convertToCsv` CSV injection edge cases (leading `=`, `+`, `-`, `@`).

---

## 13. Production Data Safety Review

### CODEX_TEST Event
- **ID:** `xPfa0b3KZyLSDnAD2uGI`
- **Status:** Intact. Used for QA only. Not modified during this audit.
- **Writes performed during audit:** None.

### CPB Event
- **ID:** `zhaPxi31cpqLAW0cuS20`
- **Status:** Intact. Not modified during this audit.
- **Writes performed during audit:** None.

### auditLogs
- **Status:** Intact, append-only via Firestore rules (`update, delete: if false`).
- **Writes performed during audit:** None.

### Staged Files Check
- `.env.local`: Not staged or committed. ✅
- Service account JSON / `.pem` / `.key`: Not found in repo. ✅
- `test_output.txt`: Present in the repository root (committed in Phase 12A branch). Contains only test runner output — no sensitive data. Should be added to `.gitignore` and removed from repo.

---

## 14. Bugs, Risks, and Gaps

### High Priority
| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | Staff roles (`checkInStaff`, `viewer`) not Firestore-enforced — all approved emails have full write access | High | `accessRoles.js`, `firestore.rules` |
| 2 | Import batch is single Firestore batch — >400 rows may fail with no partial rollback | High | `importService.js` |

### Medium Priority
| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 3 | No Firestore offline persistence — connectivity loss during check-in loses state | Medium | `src/lib/firebase.js` |
| 4 | CSV injection — `convertToCsv` does not sanitize leading formula characters | Medium | `exportUtils.js` |
| 5 | `preferredSchool` roundtrip gap — exports as column but imports to `notes` field | Medium | `importUtils.js`, `exportUtils.js` |
| 6 | Event delete does not cascade-delete registrations — orphaned data | Medium | `eventService.js` |
| 7 | No pagination — full registration load into memory for all pages | Medium | `registrationService.js`, all pages |
| 8 | No QA check for empty `approvedEmails` — could lock out all users | Medium | `QaPage.jsx` |
| 9 | AI Draft Lab prompt sends event context to OpenAI if user pastes to ChatGPT — no warning | Medium | `CommunicationsPage.jsx` |
| 10 | `door-list` payment status has no dedicated tab filter | Medium | `RegistrationsPage.jsx` |
| 11 | `window.confirm`/`alert()` used for destructive actions — can be suppressed in some contexts | Medium | `RegistrationsPage`, `TicketsPage`, `ImportsPage` |
| 12 | Ticket code uniqueness uses client-side check only — race condition possible if two admins assign simultaneously | Medium | `ticketService.js` |

### Low Priority
| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 13 | `test_output.txt` committed to repo | Low | Root directory |
| 14 | No audio/haptic feedback on QR scan success | Low | `QrScannerPanel.jsx` |
| 15 | No torch/flashlight toggle for dark venues | Low | `QrScannerPanel.jsx` |
| 16 | No continuous scan mode after check-in | Low | `QrScannerPanel.jsx` |
| 17 | No bulk ticket auto-assignment | Low | `TicketsPage.jsx` |
| 18 | Print action prints whole page, not just QR grid | Low | `TicketsPage.jsx` |
| 19 | `ExportModal`, `ImportTemplatesPanel`, `AI Draft Lab` have no unit tests | Low | `tests/` |
| 20 | Overpayment (amountPaid > amountDue) silently floors to `balanceDue = 0` — no warning | Low | `financeUtils.js` |
| 21 | `updateRegistration` always logged as `registration.finance-update` even for name/email changes | Low | `registrationService.js` |

---

## 15. Recommended Phase 14

### Phase 14: QR Camera Check-In Polish + Event-Day Mobile UX

**Goal:** Make the Check-In page genuinely staff-operable at a live event door using a mobile phone or tablet, with camera scan feedback and UX improvements for high-volume check-in.

**Why it should be next:**
- `QrScannerPanel.jsx` already exists with `html5-qrcode` integration — the camera path is scaffolded. What's missing is production-grade UX: feedback, speed, and resilience.
- Event-day check-in is the most time-critical operation in the system. A confusing or slow check-in page directly impacts guests.
- This requires no new Firestore collections, no new auth complexity, and no deferred integrations.
- Firestore offline persistence is also needed for event-day resilience and belongs in this phase.
- The `door-list` tab filter and chunked import are directly event-day concerns that complete the circle.

**Exact files likely involved:**
- `src/components/checkin/QrScannerPanel.jsx` — audio/haptic feedback, torch toggle, continuous scan mode
- `src/pages/CheckInPage.jsx` — tablet-optimized layout, larger touch targets, faster guest card, search result cap increase
- `src/services/importService.js` — chunked batch writes (50 rows/batch) with progress tracking
- `src/pages/RegistrationsPage.jsx` — add `door-list` tab filter
- `src/lib/firebase.js` — enable `enableIndexedDbPersistence()` for offline cache
- `src/utils/exportUtils.js` — strip leading `=`, `+`, `-`, `@` from CSV values (CSV injection fix)
- New: `tests/phase14-camera-checkin.test.js`

**Phase 14 implementation scope:**
1. Add audio beep feedback on successful scan (Web Audio API — no external library needed).
2. Add haptic feedback on mobile (`navigator.vibrate([200])`).
3. Add torch/flashlight toggle button (track `ImageCapture` or `applyConstraints` — may not work on all devices; degrade gracefully).
4. Add "continuous scan mode" toggle — after successful check-in, reset selection and re-start scanner automatically.
5. Optimize Check-In page for tablet landscape: widen guest card, larger touch targets (min 48px), sticky summary bar.
6. Increase search result cap from 8 to 20 (or make configurable).
7. Enable Firestore offline persistence (`enableIndexedDbPersistence`) — prevents data loss on connectivity drop during check-in.
8. Add `door-list` tab filter to Registrations page.
9. Chunk import commits at 50 rows/batch with basic progress indicator.
10. Strip leading formula characters in `convertToCsv`.

**Risks:**
- Camera API behavior varies across iOS Safari (requires WebRTC + permission prompt), Android Chrome (works well), Firefox (partial). Real-device testing is mandatory.
- Torch toggle is not universally available (`ImageCapture` API has limited support).
- Offline persistence must be called before first Firestore read — initialization order in `firebase.js` matters. Must not break test environments (guard with `typeof window !== 'undefined'`).
- Chunked import progress UI adds complexity to the currently simple `commitImport` flow.

**Test plan:**
- Simulate scan input in CI via mocked `Html5Qrcode` (`resolveTicket` call).
- Test beep and vibrate functions are called on `onMatch`.
- Test "camera unavailable" error path shows fallback text.
- Test `door-list` tab filter returns only `door-list` registrations.
- Test chunked import: 100-row batch commits in 2 chunks of 50.
- Test offline persistence initialization guard does not throw in test environment.
- Manual: test camera scan on iOS + Android on real event day.

**Must remain deferred:**
- Gmail/Outlook OAuth
- Google Sheets OAuth
- Real AI API
- Cloud Functions
- Firebase Storage
- Public attendee flows
- Staff role Firestore enforcement (Phase 15)

**Stop conditions:**
- Camera API breaks existing manual check-in flow
- Firestore offline persistence breaks audit log writes or test suite
- Chunked import creates partial imports without detection or recovery

---

## 16. Recommended Phase 15

### Phase 15: Staff Role Firestore Enforcement + Security Hardening

**Goal:** Move `checkInStaff` and `viewer` roles from UI-only display to Firestore-enforced access control. Any approved email with `checkInStaff` role should only be able to write check-in fields. `viewer` should be read-only.

**Why it should be next:**
- The current system allows any approved email to perform full admin operations regardless of role. This is the primary remaining security gap.
- Before the organizer adds external door staff to the allowlist for event-day use, role enforcement must be in place. Otherwise a volunteer with a tablet has full access to delete registrations, modify finance, and view all payment data.
- Firestore rules already have the architectural foundation — `registrationIdentityUnchanged`, `ticketFieldsUnchanged`, `checkInFieldsUnchanged`, `isCheckInCompletionUpdate`, `isCheckInUndoUpdate` — the plumbing exists to layer role checks on top.
- This phase should be completed before any external staff accounts are added to `approvedEmails`.

**Exact files likely involved:**
- `firestore.rules` — add `userRole()` function, `isCheckInStaff()`, `isViewer()`, role-scoped update permissions for `registrations`
- `src/utils/accessRoles.js` — additional exports for role capability checks
- `src/auth/ProtectedRoute.jsx` — add optional `requiredRole` prop for route-level role restriction
- `src/layout/AppShell.jsx` — hide `navGroups` items based on resolved role (Imports, Finance, Settings hidden from `checkInStaff`)
- `src/pages/CheckInPage.jsx` — confirm `checkInStaff` can reach this page and use all check-in features
- New: `tests/phase15-role-hardening.test.js`
- Extended: `tests/firestore-checkin-rules.test.js` — role-scoped emulator tests

**Phase 15 implementation scope:**
1. Add `userRole(database)` function to `firestore.rules` — reads `rolesByEmail[request.auth.token.email]` from `settings/accessControl`.
2. Add `isCheckInStaff()` rule function — approved email with `checkInStaff` role.
3. Add `isViewer()` rule function — approved email with `viewer` role.
4. For `registrations` update: allow `checkInStaff` to perform `isCheckInCompletionUpdate` and `isCheckInUndoUpdate` only.
5. For `registrations` read: allow `isViewer()` read-only access.
6. For `registrations` create/delete: block for `checkInStaff` and `viewer`.
7. For `events` and `auditLogs`: allow `isViewer()` read; block `checkInStaff` and `viewer` writes.
8. Scope `AppShell` navigation: hide Registrations, Imports, Finance, Settings from `checkInStaff` role; hide all write-access pages from `viewer`.
9. Add `requiredRole` to `ProtectedRoute` — redirect non-matching roles to `/dashboard`.
10. Add QA Center check: confirm `checkInStaff` enforcement is active.
11. Run full Firestore emulator test suite against new role rules.

**Risks:**
- Adding `get()` calls in Firestore rules for role checking adds one Firestore read per write request — increases latency and billing. Optimize by using `request.auth.token` custom claims if available; otherwise `get()` is necessary.
- Role data in `rolesByEmail` may be out of sync with `approvedEmails` — need to handle case where email is in `approvedEmails` but not in `rolesByEmail` (default to `admin`).
- Existing approved admins must retain full access — no regression permitted.
- Firestore emulator must be running for Phase 15 tests to pass — CI pipeline needs emulator setup.

**Test plan:**
- Emulator: `checkInStaff` can complete check-in → `201/200`.
- Emulator: `checkInStaff` cannot create registration → `PERMISSION_DENIED`.
- Emulator: `checkInStaff` cannot delete registration → `PERMISSION_DENIED`.
- Emulator: `viewer` can read events → success.
- Emulator: `viewer` cannot write any registration field → `PERMISSION_DENIED`.
- Emulator: `admin`/`owner` retain full access after rules deploy → no regression.
- UI: `checkInStaff` role hides Imports, Registrations management, Finance, Settings from nav.
- UI: `viewer` role hides all write actions.
- QA Center role check passes.

**Must remain deferred:**
- Gmail/Outlook OAuth
- Google Sheets OAuth
- Real AI API
- Cloud Functions
- Firebase Storage
- Public attendee flows

**Stop conditions:**
- Role rule change breaks existing admin writes
- Emulator tests fail on admin CRUD operations
- `get()` calls in rules trigger billing threshold concerns
- Rules deploy would break live allowlist enforcement for current approved admins

---

## 17. Deferred Features

| Feature | Status | Notes |
|---------|--------|-------|
| Gmail/Outlook OAuth | Deferred | Requires credential management, user consent flows |
| Google Sheets OAuth | Deferred | Replaced by Phase 12A manual workflow helper |
| Real AI API integration | Deferred | Phase 13A provides copy-prompt bridge; no API key needed |
| Cloud Functions | Deferred | All logic is client-side; Cloud Functions add operational complexity |
| Firebase Storage | Deferred | No file attachment or media feature yet needed |
| Public attendee flows | Deferred | App is private/admin-only by design |
| Automatic email sending | Deferred | Copy-only Communications is sufficient |
| Automatic WhatsApp sending | Deferred | Same as above |
| Full Firestore-enforced staff roles | **Phase 15** | Foundation in place; implementation planned |
| Camera torch toggle | **Phase 14** | Minor; may need `ImageCapture` API |
| Print-all QR sheet PDF | Future | Requires PDF generation library |
| Firestore pagination | Future | Required before events with 500+ registrations |
| Bulk ticket auto-assignment | Future | Nice-to-have for large events |
| Overpayment warning | Future | `balanceDue` currently floors to 0 silently |

---

## 18. Codex Handoff for Next Implementation

### Phase 14 Prompt Template
```
Project: Gather & Savor Event Hub
Firebase project: gathervibeshub
Repo: KuroJay246/gathervibes
Branch to create: codex/phase-14-camera-checkin-mobile-ux
Base branch: main
Base commit: 9ee9b29b15a7328fb440cd0e11332c0bd326e348

Phase 14 scope:
- QR camera check-in polish (audio/haptic feedback, continuous scan, torch toggle)
- Event-day mobile UX (tablet layout, larger touch targets, search cap increase)
- Firestore offline persistence (enableIndexedDbPersistence in firebase.js)
- Chunked import batching (50 rows/batch in importService.js)
- door-list tab filter in RegistrationsPage.jsx
- CSV injection fix in exportUtils.js (strip leading =,+,-,@ from values)

Key files to modify:
- src/components/checkin/QrScannerPanel.jsx
- src/pages/CheckInPage.jsx
- src/services/importService.js
- src/pages/RegistrationsPage.jsx
- src/lib/firebase.js
- src/utils/exportUtils.js

Tests to write: tests/phase14-camera-checkin.test.js

Security constraints unchanged:
- No OAuth, no AI API keys, no sending, no Cloud Functions, no Storage
- Do not modify CPB
- Do not weaken Firestore rules
- CODEX_TEST only for manual retest
- Do not commit .env.local or credentials
```

### Phase 15 Prompt Template (after Phase 14 merges)
```
Project: Gather & Savor Event Hub
Firebase project: gathervibeshub
Branch to create: codex/phase-15-staff-role-hardening
Base branch: main (after Phase 14 merge)

Phase 15 scope:
- Firestore rule enforcement for checkInStaff and viewer roles
- userRole() function in firestore.rules reading rolesByEmail
- AppShell navigation scoping by role
- ProtectedRoute role parameter for route-level restriction
- Emulator-based rule tests for checkInStaff and viewer

Key files to modify:
- firestore.rules
- src/utils/accessRoles.js
- src/auth/ProtectedRoute.jsx
- src/layout/AppShell.jsx
- src/pages/CheckInPage.jsx (verify checkInStaff access)

Tests to write: tests/phase15-role-hardening.test.js
Tests to extend: tests/firestore-checkin-rules.test.js

Requires: Firestore emulator running for full test coverage.
STOP if: rules change breaks existing admin writes.
STOP if: regression in admin CRUD operations.
```

---

## 19. Organizer Retest Checklist (After Phase 12A + 13A — Current Live State)

- [ ] Log in at https://gathervibeshub.web.app/login
- [ ] Select CODEX_TEST as Working Event
- [ ] Open Registrations — verify Export CSV button appears
- [ ] Test all 6 export presets — verify scope is CODEX_TEST only
- [ ] Verify export does NOT include auditLogs or settings data
- [ ] Download finance export — check columns include amountDue, amountPaid, balanceDue
- [ ] Open Import Center — verify ImportTemplatesPanel appears
- [ ] Download "Basic Registration Import" — verify buyerName, attendeeNames headers present
- [ ] Download "Finance Import" — verify amountDue, amountPaid, balanceDue headers present
- [ ] Download "School / Group Import" — verify preferredSchool header present
- [ ] Re-import a small template into CODEX_TEST — verify field mapping works
- [ ] Open Communications — switch to AI Draft Lab mode
- [ ] Verify "Draft Only" label and "Safety Notice" banner visible
- [ ] Select a tone, click "Copy AI Prompt for ChatGPT" — paste to notepad and verify content
- [ ] Switch back to Standard mode — verify template editor still works
- [ ] Open QA Center — run all checks — verify Phase 12A/13A checks appear as pass
- [ ] Verify "QR payload is ticket-code only" check passes
- [ ] Check CPB event is unchanged (events list shows CPB with original name/date)
- [ ] Verify no email was sent, no OAuth prompt appeared during entire session
- [ ] Open Check-In — test camera QR scan on a real mobile device (if available)
- [ ] Test manual ticket code lookup fallback
- [ ] Open Settings — verify your role, allowlist, and roadmap items are visible

---

## 20. Final Recommendation

The system is **stable, secure for its current scope, and production-ready** for organizer use by approved admins only.

### Immediate action items (pre-Phase 14)
1. Add `test_output.txt` to `.gitignore` and remove from the repository.
2. Add CSV injection sanitization to `convertToCsv` in `exportUtils.js` (strip `=`, `+`, `-`, `@` from cell values).
3. Add a brief notice near the "Copy AI Prompt for ChatGPT" button that pasting the prompt sends event context to OpenAI.
4. Add a QA check for empty `approvedEmails` list to prevent lockout detection.
5. Add `door-list` tab filter to Registrations page (low-complexity, should be done immediately).

### Phase 14 (next)
**QR Camera Check-In Polish + Event-Day Mobile UX**
This directly addresses the most time-critical real-world use case. The scaffold exists. No new Firestore collections, no deferred integrations, no auth complexity.

### Phase 15 (after Phase 14)
**Staff Role Firestore Enforcement**
This closes the primary security gap before external staff accounts are added to the allowlist. Required before giving `checkInStaff` access to door volunteers.

---

*Audit complete. No production writes performed. No Firestore rules modified. No credentials staged. CPB and CODEX_TEST untouched. All 162 tests pass.*
