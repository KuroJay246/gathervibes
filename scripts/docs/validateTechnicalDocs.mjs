/* global process, console, Buffer */
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const requiredFiles = [
  'docs/README.md',
  'docs/generated/MANUAL_SOURCE_COMBINED.md',
  'docs/generated/Gathetr_Technical_Operations_Maintenance_and_Repair_Manual.html',
  'docs/generated/Gathetr_Technical_Operations_Maintenance_and_Repair_Manual.pdf',
  'docs/data-dictionary/FIRESTORE_DATA_DICTIONARY.md',
  'docs/permissions/PERMISSION_MATRIX.md',
  'docs/problem-register/PROBLEM_AND_REPAIR_REGISTER.md',
  'docs/changelog/DOCUMENTATION_CHANGELOG.md',
  'docs/runbooks/AUTH_AND_LOGIN_RUNBOOK.md',
  'docs/runbooks/PERMISSION_FAILURE_RUNBOOKS.md',
  'docs/runbooks/SCANNER_AND_QR_RUNBOOK.md',
  'docs/runbooks/BUILD_DEPLOYMENT_RECOVERY_RUNBOOK.md',
  'docs/templates/MANUAL_UPDATE_CHECKLIST.md',
  'docs/templates/REPAIR_RUNBOOK_TEMPLATE.md',
  'docs/templates/RELEASE_CHECKLIST.md',
]

for (let index = 0; index <= 18; index += 1) {
  requiredFiles.push(`docs/manual/${String(index).padStart(2, '0')}-*.md`)
}

const globManual = async (pattern) => {
  if (!pattern.includes('*')) return [pattern]
  const prefix = pattern.split('*')[0]
  const dir = path.dirname(prefix)
  const base = path.basename(prefix)
  const { readdir } = await import('node:fs/promises')
  const entries = await readdir(path.join(root, dir))
  return entries.filter((entry) => entry.startsWith(base)).map((entry) => path.join(dir, entry))
}

const missing = []
for (const required of requiredFiles) {
  const candidates = await globManual(required)
  let found = false
  for (const candidate of candidates) {
    try {
      const fileStat = await stat(path.join(root, candidate))
      if (fileStat.isFile() && fileStat.size > 0) found = true
    } catch {
      // handled below
    }
  }
  if (!found) missing.push(required)
}

if (missing.length > 0) {
  throw new Error(`Missing required technical documentation files:\n${missing.join('\n')}`)
}

const combined = await readFile(path.join(root, 'docs/generated/MANUAL_SOURCE_COMBINED.md'), 'utf8')
const requiredText = [
  "Gathetr Owner's Technical Operations, Development, Maintenance and Repair Manual",
  'Firestore Data Model',
  'Permission Matrix',
  'requires no Firebase deployment',
  'CODEX_DEMO',
  'CPB',
]

const absentText = requiredText.filter((text) => !combined.includes(text))
if (absentText.length > 0) {
  throw new Error(`Combined manual is missing required content markers: ${absentText.join(', ')}`)
}

const pdfPath = path.join(root, 'docs/generated/Gathetr_Technical_Operations_Maintenance_and_Repair_Manual.pdf')
const pdf = await readFile(pdfPath)
const pdfStat = await stat(pdfPath)
if (!pdf.subarray(0, 4).equals(Buffer.from('%PDF')) || pdfStat.size < 10000) {
  throw new Error('Generated PDF is missing, invalid, or unexpectedly small.')
}

console.log(`Technical documentation validation passed. Checked ${requiredFiles.length} required entries.`)
