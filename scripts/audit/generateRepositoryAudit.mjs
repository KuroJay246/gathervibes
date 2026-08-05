/* global console, process */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const auditDir = path.join(root, 'audit')
mkdirSync(auditDir, { recursive: true })

const posix = (value) => value.split(path.sep).join('/')
const relPath = (absolutePath) => posix(path.relative(root, absolutePath))

const runGit = (args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

const tracked = new Set(runGit(['ls-files']).split(/\r?\n/).filter(Boolean).map(posix))
const ignored = new Set(runGit(['ls-files', '-o', '-i', '--exclude-standard']).split(/\r?\n/).filter(Boolean).map(posix))
const untracked = new Set(runGit(['ls-files', '-o', '--exclude-standard']).split(/\r?\n/).filter(Boolean).map(posix))

const generatedTops = new Set(['dist', 'build', 'coverage', 'test-results', 'playwright-report', '.firebase'])
const sourceTops = new Set(['src', 'scripts', 'tests', 'e2e', 'integrations', 'public'])
const sourceExts = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'])
const styleExts = new Set(['.css', '.scss', '.sass', '.less', '.pcss'])
const docExts = new Set(['.md', '.mdx'])
const textExts = new Set([...sourceExts, ...styleExts, ...docExts, '.json', '.jsonc', '.yml', '.yaml', '.txt', '.html', '.css', '.csv'])
const binaryExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.xlsx', '.xls', '.pdf', '.zip', '.woff', '.woff2'])

const activeDocs = new Set([
  'README.md',
  'AI_AGENT_RULES.md',
  'PROJECT_HANDOFF.md',
  'docs/GSV_MASTER_SYSTEM_REFERENCE.md',
  'docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md',
  'docs/HISTORICAL_ARCHIVE_INDEX.md',
  'docs/PRODUCT_GUIDE.md',
  'docs/ROUTE_MAP.md',
  'docs/PROTOTYPE_DEMO_GUIDE.md',
  'docs/DEPLOYMENT_GUIDE.md',
  'docs/QA_GUIDE.md',
  'docs/KNOWN_LIMITATIONS.md',
  'docs/ORGANIZER_QUICK_START.md',
  'docs/NEW_EVENT_SETUP_GUIDE.md',
  'docs/EVENT_LIFECYCLE_GUIDE.md',
  'docs/EVENT_DAY_GUIDE.md',
  'docs/OPERATIONS_GUIDE.md',
  'docs/BAKER_PAYMENT_GUIDE.md',
  'docs/FINANCE_EVIDENCE_GUIDE.md',
  'docs/CODEX_DEMO_FULL_SYSTEM_WALKTHROUGH_STANDARD.md',
  'docs/PROTECTED_OWNER_APPLICATION_ACCESS_STANDARD.md',
  'docs/PROTECTED_OWNER_SUPER_ADMIN_AND_MAINTENANCE_STANDARD.md',
  'docs/TUTORIAL_AND_IN_APP_GUIDANCE_MAINTENANCE_STANDARD.md',
  'docs/ORGANIZER_UNDERSTANDABILITY_AND_USABILITY_STANDARD.md',
  'docs/AUDIT_LOG_BUSINESS_WRITE_STANDARD.md',
  'docs/EVENT_TASK_AND_DEADLINE_STANDARD.md',
  'docs/EQUIPMENT_AND_SUPPLIES_WORKFLOW_STANDARD.md',
  'docs/EVENT_DAY_RUN_OF_SHOW_STANDARD.md',
  'docs/EVENT_DAY_TICKET_AND_CHECKIN_STANDARD.md',
  'docs/EVENT_READINESS_STANDARD_2026-08.md',
  'docs/DOCUMENT_REFERENCE_DATA_STANDARD.md',
  'docs/CONTACT_AND_EVENT_RELATIONSHIP_STANDARD.md',
  'docs/REGISTRATION_PAYMENT_STATUS_STANDARD.md',
  'docs/REGISTRATION_PAYMENT_REVIEW_AND_ACTION_STANDARD.md',
  'docs/OPERATIONS_LEDGER_ENTRY_STANDARD.md',
  'docs/MESSAGE_BUILDER_COPY_ONLY_STANDARD.md',
  'docs/SYSTEM_QA_PRESENTATION_STANDARD.md',
  'docs/ORGANIZER_PAGE_EXPLANATION_STANDARD.md',
  'docs/RESPONSE_INBOX_REVIEW_STANDARD.md',
  'docs/BULK_OPERATION_RECOVERY_MODEL.md',
  'docs/EVENT_REPORT_AND_RECONCILIATION_STANDARD.md',
  'docs/EVENT_SETUP_STAGE_STANDARD.md',
  'docs/FINANCIAL_SOURCE_AND_CALCULATION_MAP_2026-08.md',
  'docs/GATHER_SAVOR_VISUAL_SYSTEM_STANDARD.md',
  'docs/GOOGLE_FORMS_RESPONSE_INBOX_WORKFLOW.md',
  'docs/IMPORT_CENTER_DAILY_WORKFLOW_STANDARD.md',
  'docs/IMPORT_SOURCE_AND_RECORD_TYPE_STANDARD.md',
  'docs/IMPORT_TEMPLATE_AND_HEADER_MAPPING_STANDARD.md',
  'docs/OPERATIONS_PRESENTATION_AND_COMMITMENT_STANDARD.md',
  'docs/ORGANIZER_ACTION_HIERARCHY_STANDARD.md',
  'docs/ORGANIZER_STATUS_AND_TERMINOLOGY_STANDARD.md',
  'docs/PDF_TABLE_IMPORT_LIMITATIONS.md',
  'docs/PRODUCT_QA_EMULATOR_RUNNER_STANDARD.md',
  'docs/PROTECTED_OWNER_AUTHORIZATION_MATRIX_2026-08.md',
  'docs/RUN_OF_SHOW_RESOURCES_EXISTING_DATA_COMPATIBILITY_2026-08.md',
  'docs/SETTINGS_AND_ACCESS_PRESENTATION_STANDARD.md',
  'docs/TASK_STATUS_AND_PRIORITY_STANDARD.md',
  'docs/TUTORIAL_V3_ARCHITECTURE.md',
  'docs/TUTORIAL_V3_FINAL_STANDARD_2026-08.md',
  'docs/WORKING_EVENT_OVERVIEW_STANDARD.md',
  'integrations/google-forms/REMOVE.md',
  'integrations/google-forms/SETUP.md',
])

const manualReviewDocs = new Set([])

const entries = []
const directorySizes = new Map()
const aggregateChildren = new Set(['node_modules'])

const addDirectorySize = (rel, size) => {
  let cursor = rel
  while (cursor && cursor !== '.') {
    directorySizes.set(cursor, (directorySizes.get(cursor) || 0) + size)
    cursor = posix(path.dirname(cursor))
  }
  directorySizes.set('.', (directorySizes.get('.') || 0) + size)
}

const getTreeSize = (absolutePath) => {
  let total = 0
  for (const item of readdirSync(absolutePath, { withFileTypes: true })) {
    const current = path.join(absolutePath, item.name)
    const stats = statSync(current)
    if (item.isDirectory()) total += getTreeSize(current)
    else total += stats.size
  }
  return total
}

const gitStateFor = (rel) => {
  if (tracked.has(rel)) return 'tracked'
  if (ignored.has(rel)) return 'ignored'
  if (untracked.has(rel)) return 'untracked'
  if (rel === '.git' || rel.startsWith('.git/')) return 'git-internal'
  return 'untracked'
}

const classifyFile = (rel, isDirectory) => {
  const ext = path.extname(rel).toLowerCase()
  const parts = rel.split('/')
  const top = parts[0]
  const filename = path.basename(rel)

  if (top === '.git') return 'GIT_INTERNAL'
  if (top === 'node_modules') return 'VENDOR / THIRD PARTY'
  if (generatedTops.has(top)) return 'GENERATED'
  if (top === 'output') return 'REVIEW REQUIRED EVIDENCE'
  if (rel === 'firestore.rules') return 'ACTIVE FIRESTORE SECURITY RULES'
  if (rel === 'firestore.indexes.json') return 'ACTIVE FIRESTORE INDEX CONFIG'
  if (rel === 'firebase.json' || rel === '.firebaserc') return 'ACTIVE FIREBASE CONFIGURATION'
  if (rel.startsWith('docs/archive/')) return 'ARCHIVED DOCUMENTATION'
  if (docExts.has(ext) || /handoff|agent|rules|instructions/i.test(filename)) return 'ACTIVE DOCUMENTATION'
  if (sourceExts.has(ext) && sourceTops.has(top)) return top === 'tests' || top === 'e2e' ? 'ACTIVE TEST' : 'ACTIVE SOURCE'
  if (styleExts.has(ext)) return 'ACTIVE STYLE'
  if (top === '.github' || filename.startsWith('.') || /config|firebase|firestore|eslint|vite|playwright|package/i.test(filename)) return 'ACTIVE CONFIGURATION'
  if (ext === '.xlsx' || ext === '.xls') return 'REVIEW REQUIRED EVIDENCE'
  if (binaryExts.has(ext)) return tracked.has(rel) ? 'ACTIVE ASSET' : 'GENERATED'
  return isDirectory ? 'PROJECT DIRECTORY' : 'ACTIVE PROJECT FILE'
}

const purposeFor = (rel, classification, isDirectory) => {
  if (isDirectory) return `Directory for ${classification.toLowerCase()} entries.`
  if (rel === 'README.md') return 'Primary repository entrypoint and current project summary.'
  if (rel === 'AI_AGENT_RULES.md') return 'Current AI-agent operating rules.'
  if (rel === 'PROJECT_HANDOFF.md') return 'Current coding-agent handoff and guardrails.'
  if (rel === 'docs/GSV_MASTER_SYSTEM_REFERENCE.md') return 'Canonical current product, route, access, and Firebase reference.'
  if (rel === 'docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md') return 'Canonical repository shape, cleanup, audit, and maintenance reference.'
  if (rel === 'docs/HISTORICAL_ARCHIVE_INDEX.md') return 'Index and interpretation rules for archived historical evidence.'
  if (rel.startsWith('docs/archive/')) return 'Archived historical evidence; not current operating instruction.'
  if (rel.startsWith('src/')) return 'React application source.'
  if (rel.startsWith('tests/')) return 'Node test coverage.'
  if (rel.startsWith('e2e/')) return 'Playwright browser coverage.'
  if (rel.startsWith('scripts/')) return 'Repository, product QA, admin, or audit automation.'
  if (rel.startsWith('public/')) return 'Static public asset included in the app build.'
  if (rel.startsWith('integrations/')) return 'Integration source or deployment plan; do not activate without approval.'
  return classification.toLowerCase()
}

const recommendationFor = (rel, classification, gitState) => {
  if (classification === 'VENDOR / THIRD PARTY') return 'Recreate with npm ci; do not manually edit.'
  if (classification === 'GENERATED') return gitState === 'tracked' ? 'Tracked generated/static artifact; verify intentional.' : 'Safe cleanup candidate when stale and no longer needed.'
  if (classification === 'REVIEW REQUIRED EVIDENCE') return 'Manual review before deletion; may contain unique evidence.'
  if (classification === 'ARCHIVED DOCUMENTATION') return 'Retain as historical evidence.'
  if (classification.includes('DOCUMENTATION')) return 'Keep current or archive if superseded.'
  return 'Keep and validate through standard repository checks.'
}

const walk = (absoluteDirectory) => {
  for (const item of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const absolutePath = path.join(absoluteDirectory, item.name)
    const rel = relPath(absolutePath)
    const stats = statSync(absolutePath)
    const isDirectory = item.isDirectory()
    const classification = classifyFile(rel, isDirectory)
    const gitState = gitStateFor(rel)

    if (isDirectory && aggregateChildren.has(rel)) {
      const size = getTreeSize(absolutePath)
      entries.push({
        path: rel,
        filename: item.name,
        directory: posix(path.dirname(rel)),
        extension: '',
        kind: 'directory',
        aggregation: 'children-aggregated',
        size,
        modified: stats.mtime.toISOString(),
        gitState,
        classification,
        purpose: purposeFor(rel, classification, true),
        recommendation: recommendationFor(rel, classification, gitState),
      })
      addDirectorySize(rel, size)
      continue
    }

    entries.push({
      path: rel,
      filename: item.name,
      directory: posix(path.dirname(rel)),
      extension: isDirectory ? '' : path.extname(item.name).toLowerCase(),
      kind: isDirectory ? 'directory' : 'file',
      aggregation: 'none',
      size: isDirectory ? 0 : stats.size,
      modified: stats.mtime.toISOString(),
      gitState,
      classification,
      purpose: purposeFor(rel, classification, isDirectory),
      recommendation: recommendationFor(rel, classification, gitState),
    })

    if (!isDirectory) addDirectorySize(rel, stats.size)
    if (isDirectory) walk(absolutePath)
  }
}

walk(root)

const fileEntries = entries.filter((entry) => entry.kind === 'file')
const projectFiles = fileEntries.filter((entry) =>
  !entry.path.startsWith('.git/') &&
  !entry.path.startsWith('node_modules/') &&
  !entry.path.startsWith('dist/') &&
  !entry.path.startsWith('test-results/') &&
  !entry.path.startsWith('playwright-report/') &&
  !entry.path.startsWith('.firebase/')
)

const markdownFiles = projectFiles.filter((entry) => docExts.has(entry.extension))
const readableProjectFiles = projectFiles.filter((entry) => {
  if (entry.size > 1_000_000) return false
  return textExts.has(entry.extension) || entry.filename.startsWith('.') || entry.path === 'package-lock.json'
})

const docBasenames = markdownFiles.map((entry) => path.basename(entry.path))
const references = new Map()
for (const entry of readableProjectFiles) {
  let text = ''
  try {
    text = readFileSync(path.join(root, entry.path), 'utf8')
  } catch {
    continue
  }
  for (const basename of docBasenames) {
    if (path.basename(entry.path) === basename) continue
    if (!text.includes(basename)) continue
    for (const doc of markdownFiles.filter((candidate) => path.basename(candidate.path) === basename)) {
      if (!references.has(doc.path)) references.set(doc.path, [])
      references.get(doc.path).push(entry.path)
    }
  }
}

const classifyDocument = (entry, content) => {
  if (entry.path.startsWith('docs/archive/')) return 'ARCHIVED'
  if (activeDocs.has(entry.path)) {
    if (/STANDARD\.md$/i.test(entry.path)) return 'ACTIVE SPECIALIZED STANDARD'
    if (entry.path === 'README.md' || entry.path === 'AI_AGENT_RULES.md' || entry.path === 'PROJECT_HANDOFF.md' || entry.path.includes('GSV_')) return 'ACTIVE AUTHORITATIVE'
    return 'ACTIVE OPERATIONAL'
  }
  if (manualReviewDocs.has(entry.path)) return 'UNKNOWN / MANUAL REVIEW'
  if (/PHASE_|_RESULT_|_AUDIT_|RELEASE|MIGRATION|DRY_RUN|HANDOFF/i.test(path.basename(entry.path))) return 'HISTORICAL'
  if (/obsolete|duplicate/i.test(content)) return 'DUPLICATE'
  return 'UNKNOWN / MANUAL REVIEW'
}

const documentRegistry = markdownFiles.map((entry) => {
  let content = ''
  try {
    content = readFileSync(path.join(root, entry.path), 'utf8')
  } catch {
    content = ''
  }
  const classification = classifyDocument(entry, content)
  const isCurrent = classification.startsWith('ACTIVE')
  const staleFacts = []
  const contradictions = []
  if (isCurrent && /CODEX_TEST Live Verification Event|xPfa0b3KZyLSDnAD2uGI/.test(content) && !/older QA fixture|Retired historical|retired historical|retired `CODEX_TEST`|Historical archived files/.test(content)) {
    staleFacts.push('Retired CODEX_TEST appears outside explicit historical/retired context.')
  }
  if (isCurrent && /copy-only command center|Communications Pro|Phase \d+/.test(content)) {
    staleFacts.push('Legacy product or phase wording appears in active documentation.')
  }
  const cpbProtectionMention = /CPB-specific|CPB lock|protected CPB|zero-write/.test(content)
  const negatedCpbProtectionMention = /do not preserve CPB-specific|do not add CPB-specific|do not create CPB-specific|Remove CPB-specific/i.test(content)
  if (isCurrent && entry.path !== 'docs/HISTORICAL_ARCHIVE_INDEX.md' && cpbProtectionMention && !negatedCpbProtectionMention) {
    contradictions.push('Active doc may imply CPB-specific protection rather than standard real-event safeguards.')
  }
  const action = classification === 'ARCHIVED'
    ? 'Moved or retained under docs/archive as historical evidence.'
    : isCurrent
      ? 'Retained as active current documentation.'
      : 'Manual review required before deletion or archive.'
  return {
    path: entry.path,
    title: (content.match(/^#\s+(.+)$/m)?.[1] || path.basename(entry.path)).trim(),
    classification,
    purpose: purposeFor(entry.path, entry.classification, false),
    referencedBy: references.get(entry.path) || [],
    current: isCurrent,
    staleFacts,
    contradictions,
    action,
    canonicalSource: isCurrent ? entry.path : 'docs/HISTORICAL_ARCHIVE_INDEX.md',
    archivedLocation: entry.path.startsWith('docs/archive/') ? entry.path : null,
  }
})

const cleanupCandidates = fileEntries.filter((entry) =>
  (entry.classification === 'GENERATED' && entry.gitState !== 'tracked') ||
  entry.path === 'firestore-debug.log' ||
  entry.path === 'audit/gsv-markdown-verification.json'
)

const summary = {
  generatedAt: new Date().toISOString(),
  root,
  branch: runGit(['branch', '--show-current']),
  headAtGeneration: runGit(['rev-parse', 'HEAD']),
  originMainAtGeneration: runGit(['rev-parse', 'origin/main']),
  gitMetadataMode: 'stable-current-state',
  gitMetadataNote: 'Use git rev-parse HEAD and git rev-parse origin/main for authoritative final hashes; embedding the enclosing inventory commit hash would create infinite churn.',
  repositoryBytes: directorySizes.get('.') || 0,
  totalEntries: entries.length,
  totalFiles: fileEntries.length,
  totalDirectories: entries.filter((entry) => entry.kind === 'directory').length,
  humanMaintainedFiles: projectFiles.length,
  markdownMdxFiles: markdownFiles.length,
  activeDocs: documentRegistry.filter((doc) => doc.classification.startsWith('ACTIVE')).length,
  historicalDocs: documentRegistry.filter((doc) => doc.classification === 'HISTORICAL').length,
  archivedDocs: documentRegistry.filter((doc) => doc.classification === 'ARCHIVED').length,
  unknownDocs: documentRegistry.filter((doc) => doc.classification === 'UNKNOWN / MANUAL REVIEW').length,
  staleActiveDocs: documentRegistry.filter((doc) => doc.current && (doc.staleFacts.length || doc.contradictions.length)).length,
  jsTsFiles: projectFiles.filter((entry) => sourceExts.has(entry.extension)).length,
  cssStyleFiles: projectFiles.filter((entry) => styleExts.has(entry.extension)).length,
  generatedFiles: fileEntries.filter((entry) => entry.classification === 'GENERATED').length,
  cleanupCandidates: cleanupCandidates.length,
  sizes: {
    nodeModulesBytes: directorySizes.get('node_modules') || 0,
    gitBytes: directorySizes.get('.git') || 0,
    distBytes: directorySizes.get('dist') || 0,
    testResultsBytes: directorySizes.get('test-results') || 0,
    playwrightReportBytes: directorySizes.get('playwright-report') || 0,
    firebaseCacheBytes: directorySizes.get('.firebase') || 0,
    outputBytes: directorySizes.get('output') || 0,
  },
}

const largestFiles = fileEntries.sort((a, b) => b.size - a.size).slice(0, 50)
const largestDirectories = [...directorySizes.entries()]
  .map(([directory, size]) => ({ directory, size }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 50)

writeFileSync(path.join(auditDir, 'gsv-file-inventory.json'), `${JSON.stringify({ summary, largestFiles, largestDirectories, cleanupCandidates, entries }, null, 2)}\n`)
writeFileSync(path.join(auditDir, 'gsv-document-registry.json'), `${JSON.stringify({ summary: { generatedAt: summary.generatedAt, totalDocuments: documentRegistry.length }, documents: documentRegistry }, null, 2)}\n`)

if (!existsSync(path.join(auditDir, 'gsv-cleanup-log.json'))) {
  writeFileSync(path.join(auditDir, 'gsv-cleanup-log.json'), `${JSON.stringify({ generatedAt: summary.generatedAt, bytesReclaimed: 0, entries: [] }, null, 2)}\n`)
}

console.log(JSON.stringify(summary, null, 2))
