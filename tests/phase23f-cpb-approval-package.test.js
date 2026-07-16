import { readFileSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

const script = readFileSync('scripts/admin/generateCpbApprovalPackage.mjs', 'utf8')

test('Phase 23F approval package reads the new manifest and writes only Desktop approval artifacts', () => {
  assert.ok(script.includes('GSV_New_CPB_Manifest\\\\CPB_Proposal_Manifest_New_Private.json'))
  assert.match(script, /GSV_New_CPB_Manifest_Approval/)
  assert.match(script, /CPB_New_Manifest_Approval_Decisions\.json/)
  assert.match(script, /CPB_New_Manifest_Approval_Summary_Masked\.csv/)
  assert.match(script, /CPB_New_Manifest_Field_Counts\.json/)
  assert.match(script, /CPB_New_Manifest_Money_Changes_Masked\.csv/)
  assert.match(script, /CPB_New_Manifest_Status_Changes_Masked\.csv/)
  assert.match(script, /CPB_New_Manifest_Door_Changes_Masked\.csv/)
  assert.match(script, /CPB_New_Manifest_Replacement_Warnings_Masked\.csv/)
})

test('Phase 23F approval package keeps organizer decisions unresolved until explicit approval', () => {
  assert.match(script, /approvalState: 'unresolved'/)
  assert.match(script, /decision: 'unresolved'/)
  assert.match(script, /fieldDecisions/)
  assert.match(script, /unresolvedDecisions/)
})

test('Phase 23F approval phrases are exact and scoped to rehearsal/design only', () => {
  assert.match(script, /I APPROVE CPB MANIFEST \$\{manifestHash\} FOR PHASE 23G APPLY REHEARSAL AND PHASE 23H APPLY DESIGN ONLY/)
  assert.match(script, /I PARTIALLY APPROVE CPB MANIFEST \$\{manifestHash\} USING THE SAVED APPROVAL DECISIONS FOR PHASE 23G APPLY REHEARSAL AND PHASE 23H APPLY DESIGN ONLY/)
  assert.match(script, /I DO NOT APPROVE CPB MANIFEST \$\{manifestHash\}/)
})

test('Phase 23F approval package has no Firestore write or manifest mutation path', () => {
  assert.doesNotMatch(script, /firebase\/firestore/)
  assert.doesNotMatch(script, /\bsetDoc\b|\bupdateDoc\b|\baddDoc\b|\bdeleteDoc\b|\bwriteBatch\b/)
  assert.doesNotMatch(script, /firestore\.googleapis\.com/)
  assert.doesNotMatch(script, /writeFile\(manifestPath/)
  assert.match(script, /firestoreWritesPerformed: false/)
  assert.match(script, /manifestMutated: false/)
})

test('Phase 23F flags risky financial replacements and door-list proposals', () => {
  assert.match(script, /nonblank monetary replacement/)
  assert.match(script, /payment-status replacement/)
  assert.match(script, /To Pay at Door proposal/)
  assert.match(script, /partial-deposit record/)
  assert.match(script, /three or more money fields/)
})
