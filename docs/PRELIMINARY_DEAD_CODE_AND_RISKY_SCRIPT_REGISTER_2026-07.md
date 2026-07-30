# Preliminary Dead Code And Risky Script Register - 2026-07

This is a preliminary static scan. Nothing was deleted or modified.

## Scan Summary
- Total keyword/direct-write hits: 855
- Files scanned: source, tests, e2e, scripts, functions, integrations, and Firestore rules.
- Terms included: TODO, FIXME, HACK, temporary, legacy, deprecated, phase, CPB, CODEX_TEST, hardcoded event IDs, protected UIDs/emails, console.log, eslint-disable, timers, and Firestore write APIs.

## Risk Classifications
- Active and required: normal source references and service-layer Firestore writes.
- Test fixture: CODEX_TEST and emulator-only constants.
- Security constant: protected owner UID/email references in rules/tests/source.
- Migration-only: scripts/docs with historical import/reconciliation/backfill purpose.
- Dangerous if run incorrectly: admin scripts and write APIs that can affect real data if pointed at production.
- Documentation-only: historical phase documents and audit records.
- Requires deeper review: legacy/deprecated/phase references and unused exports that need dependency-aware confirmation.

## Risky Production Scripts
- `scripts/admin/ensureAccessControl.mjs`: can initialize/update access settings; requires explicit production approval.
- `scripts/admin/ensureCodexTestEvent.mjs`: writes/maintains CODEX_TEST fixture; should remain QA-only.
- `scripts/admin/verifyProductionFixtures.mjs`: read-oriented but production-connected; safe only if kept read-only.
- `scripts/admin/verifyProductionCounts.mjs`: read-oriented production count diagnostic; safe only if no writes are added.
- `scripts/admin/runCodexApplyRehearsal.mjs`: intended CODEX_TEST rehearsal write path; must not be broadened casually.
- `scripts/admin/generateCpbManifest.mjs`: historical/reconciliation artifact generator; CPB references require context.

## Likely Dead Or Legacy Candidates
- Historical `PHASE_*` documents and older CPB normalization/reconciliation docs are useful provenance but not current product truth.
- Reserved denied rules paths for `tickets`, `checkIn`, `communications`, and `aiDrafts` are placeholders, not live collections.
- React Doctor/deslop reports unused exports in utilities such as auth, export, finance, payment reconciliation, QA, and ticket helpers. These require dependency-aware review before removal.

## Representative Evidence
| Classification | File | Line | Excerpt |
| security constant | `firestore.rules` | 9 | //   UID: WcDU2jmbopdAgDlMMWvD3TkqqbC3 |
| security constant | `firestore.rules` | 10 | //   Email: jaylanspencer99@gmail.com |
| security constant | `firestore.rules` | 74 | return 'WcDU2jmbopdAgDlMMWvD3TkqqbC3'; |
| dangerous if run incorrectly | `scripts/admin/ensureAccessControl.mjs` | 43 | console.log(`Using Firebase project: ${projectId}`); |
| dangerous if run incorrectly | `scripts/admin/ensureAccessControl.mjs` | 82 | console.log(`Success! Document ${existingEmails.length > 0 ? 'updated' : 'created'}.`); |
| dangerous if run incorrectly | `scripts/admin/ensureAccessControl.mjs` | 83 | console.log(`Total approved emails configured: ${verifyDoc.data().approvedEmails.length}`); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 6 | const eventName = 'CODEX_TEST Live Verification Event'; |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 8 | const qaPattern = /CODEX_TEST/CODEX DAILY/CODEX_DAILY/smoke/test/verification/QA/i; |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 45 | console.log(`Using Firebase project: ${projectId}`); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 46 | console.log(`Ensuring fixture: ${eventName}`); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 55 | const codexMatches = events.filter((event) => /CODEX_TEST/i.test(JSON.stringify(event))); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 58 | console.log('Before summary:'); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 59 | console.log(JSON.stringify({ |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 75 | console.error('Error: More than one CODEX_TEST-looking event already exists. Refusing to write.'); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 82 | console.error('Error: CODEX_TEST fixture exists but is not marked isTestEvent: true. Repair it through an approved fixture maintenance run.'); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 85 | console.log(`CODEX_TEST fixture already exists and is marked as a Test Event: ${existingCodex.docId}. No write needed.`); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 85 | console.log(`CODEX_TEST fixture already exists and is marked as a Test Event: ${existingCodex.docId}. No write needed.`); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 86 | console.log(JSON.stringify({ |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 99 | console.error('Error: Found a QA-looking event that is not CODEX_TEST. Refusing to guess or create a duplicate fixture.'); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 141 | console.log('Creating exactly one CODEX_TEST fixture event and one event.create audit log.'); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 141 | console.log('Creating exactly one CODEX_TEST fixture event and one event.create audit log.'); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 152 | const afterCodexMatches = afterEvents.filter((event) => /CODEX_TEST/i.test(JSON.stringify(event))); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 154 | console.log('After summary:'); |
| dangerous if run incorrectly | `scripts/admin/ensureCodexTestEvent.mjs` | 155 | console.log(JSON.stringify({ |
| dangerous if run incorrectly | `scripts/admin/generateCpbApprovalPackage.mjs` | 5 | const manifestPath = 'C:\\Users\\Jaylan\\Desktop\\GSV_New_CPB_Manifest\\CPB_Proposal_Manifest_New_Private.json' |
| dangerous if run incorrectly | `scripts/admin/generateCpbApprovalPackage.mjs` | 6 | const outputRoot = 'C:\\Users\\Jaylan\\Desktop\\GSV_New_CPB_Manifest_Approval' |
| dangerous if run incorrectly | `scripts/admin/generateCpbApprovalPackage.mjs` | 125 | finalApprovalPhrase: `I APPROVE CPB MANIFEST ${manifestHash} FOR PHASE 23G APPLY REHEARSAL AND PHASE 23H APPLY DESIGN ONLY`, |
| dangerous if run incorrectly | `scripts/admin/generateCpbApprovalPackage.mjs` | 126 | partialApprovalPhrase: `I PARTIALLY APPROVE CPB MANIFEST ${manifestHash} USING THE SAVED APPROVAL DECISIONS FOR PHASE 23G APPLY REHEARSAL AND PHASE 23H APPLY DESIGN ONLY`, |
| dangerous if run incorrectly | `scripts/admin/generateCpbApprovalPackage.mjs` | 127 | rejectionPhrase: `I DO NOT APPROVE CPB MANIFEST ${manifestHash}`, |
| dangerous if run incorrectly | `scripts/admin/generateCpbApprovalPackage.mjs` | 160 | await writeFile(join(outputRoot, 'CPB_New_Manifest_Approval_Decisions.json'), stableStringify(decisions)) |
| dangerous if run incorrectly | `scripts/admin/generateCpbApprovalPackage.mjs` | 161 | await writeFile(join(outputRoot, 'CPB_New_Manifest_Approval_Summary_Masked.csv'), toCsv(groups.map((group) => ({ |
| dangerous if run incorrectly | `scripts/admin/generateCpbApprovalPackage.mjs` | 171 | await writeFile(join(outputRoot, 'CPB_New_Manifest_Field_Counts.json'), stableStringify(fieldCounts)) |
| dangerous if run incorrectly | `scripts/admin/generateCpbApprovalPackage.mjs` | 172 | await writeFile(join(outputRoot, 'CPB_New_Manifest_Money_Changes_Masked.csv'), toCsv(proposals.filter((proposal) => moneyFields(proposal).length).map((proposal) => ({ |
| dangerous if run incorrectly | `scripts/admin/generateCpbApprovalPackage.mjs` | 180 | await writeFile(join(outputRoot, 'CPB_New_Manifest_Status_Changes_Masked.csv'), toCsv(proposals.filter((proposal) => proposal.changedFields.includes('paymentStatus')).map((proposal) => ({ |
| dangerous if run incorrectly | `scripts/admin/generateCpbApprovalPackage.mjs` | 187 | await writeFile(join(outputRoot, 'CPB_New_Manifest_Door_Changes_Masked.csv'), toCsv(proposals.filter((proposal) => ['door', 'door-list'].includes(proposal.proposedValues.paymentStatus)).map((proposal) => ({ |
| dangerous if run incorrectly | `scripts/admin/generateCpbApprovalPackage.mjs` | 194 | await writeFile(join(outputRoot, 'CPB_New_Manifest_Replacement_Warnings_Masked.csv'), toCsv(proposalRisk.filter((item) => item.highRiskReasons.length // item.warnings.length).map((item) => ({ |
| dangerous if run incorrectly | `scripts/admin/generateCpbApprovalPackage.mjs` | 202 | console.log(JSON.stringify({ outputRoot, ...summary, groupCount: groups.length }, null, 2)) |
| dangerous if run incorrectly | `scripts/admin/generateCpbManifest.mjs` | 11 | const CPB_RECONCILIATION_EVENT_ID = 'zhaPxi31cpqLAW0cuS20' |
| dangerous if run incorrectly | `scripts/admin/generateCpbManifest.mjs` | 11 | const CPB_RECONCILIATION_EVENT_ID = 'zhaPxi31cpqLAW0cuS20' |
| dangerous if run incorrectly | `scripts/admin/generateCpbManifest.mjs` | 13 | const outputRoot = 'C:\\Users\\Jaylan\\Desktop\\GSV_New_CPB_Manifest' |

Full machine-readable scan: `output/full-repository-audit/risky-scan.json`.
