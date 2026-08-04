/* global console, process */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const auditDir = path.join(root, 'audit');
mkdirSync(auditDir, { recursive: true });

const posix = (value) => value.split(path.sep).join('/');

const runGit = (args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

const tracked = new Set(runGit(['ls-files']).split(/\r?\n/).filter(Boolean).map(posix));
const ignored = new Set(runGit(['ls-files', '-o', '-i', '--exclude-standard']).split(/\r?\n/).filter(Boolean).map(posix));
const untracked = new Set(runGit(['ls-files', '-o', '--exclude-standard']).split(/\r?\n/).filter(Boolean).map(posix));

const generatedDirs = new Set([
  'dist',
  'build',
  'coverage',
  'test-results',
  'playwright-report',
  'node_modules',
  '.firebase',
  'output',
]);

const sourceRoots = ['src', 'scripts', 'tests', 'e2e', 'integrations', 'public'];
const docExtensions = new Set(['.md', '.mdx', '.rst']);
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);
const styleExtensions = new Set(['.css', '.scss', '.sass', '.less', '.pcss']);
const configExtensions = new Set(['.json', '.jsonc', '.yaml', '.yml', '.toml', '.ini', '.conf']);
const binaryExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.xlsx', '.pdf', '.zip']);

const entries = [];
const directorySizes = new Map();

const classifyPath = (rel, stats, isDirectory) => {
  const ext = path.extname(rel).toLowerCase();
  const parts = rel.split('/');
  const top = parts[0];
  const filename = path.basename(rel);

  if (top === '.git') return 'GIT_INTERNAL';
  if (top === 'node_modules') return 'VENDOR / THIRD PARTY';
  if (generatedDirs.has(top)) {
    if (top === 'output') return 'HISTORICAL EVIDENCE';
    return 'GENERATED';
  }
  if (docExtensions.has(ext) || filename.toLowerCase().includes('handoff') || filename.toLowerCase().includes('agent')) return 'ACTIVE DOCUMENTATION';
  if (sourceExtensions.has(ext) && sourceRoots.includes(top)) return top === 'tests' || top === 'e2e' ? 'ACTIVE TEST' : 'ACTIVE HUMAN-MAINTAINED SOURCE';
  if (styleExtensions.has(ext)) return 'ACTIVE HUMAN-MAINTAINED SOURCE';
  if (top === '.github' || top === '.vscode' || filename.startsWith('.') || configExtensions.has(ext) || /config|firebase|firestore|eslint|vite|playwright|package/i.test(filename)) return 'ACTIVE CONFIGURATION';
  if (binaryExtensions.has(ext)) return tracked.has(rel) ? 'HISTORICAL EVIDENCE' : 'GENERATED';
  return isDirectory ? 'PROJECT DIRECTORY' : 'ACTIVE HUMAN-MAINTAINED SOURCE';
};

const purposeFor = (rel, classification, isDirectory) => {
  if (isDirectory) return `Directory containing ${classification.toLowerCase()} items.`;
  if (rel === 'README.md') return 'Primary project overview and entrypoint for maintainers.';
  if (rel === 'AI_AGENT_RULES.md') return 'Operational AI-agent rules expected at repository root.';
  if (rel === 'PROJECT_HANDOFF.md') return 'Operational project handoff expected at repository root.';
  if (rel === 'firebase.json' || rel === '.firebaserc' || rel.startsWith('firestore.')) return 'Firebase project, Hosting, Firestore Rules, or index configuration.';
  if (rel.startsWith('src/')) return 'React application source.';
  if (rel.startsWith('tests/') || rel.startsWith('e2e/')) return 'Automated test coverage.';
  if (rel.startsWith('scripts/')) return 'Repository automation or maintenance script.';
  if (rel.startsWith('docs/archive/')) return 'Archived historical documentation retained for evidence.';
  if (rel.startsWith('docs/')) return 'Project documentation or operating standard.';
  if (rel.startsWith('public/')) return 'Public static asset copied into the production build.';
  return classification.toLowerCase();
};

const recommendationFor = (rel, classification, gitState) => {
  if (classification === 'VENDOR / THIRD PARTY') return 'Do not edit manually; recreate with npm ci.';
  if (classification === 'GENERATED') return gitState === 'tracked' ? 'Tracked generated/static artifact; verify intentional.' : 'Safe cleanup candidate when not needed for current evidence.';
  if (classification === 'HISTORICAL EVIDENCE') return rel.startsWith('docs/archive/') ? 'Retain as archived evidence.' : 'Classify as active evidence or archive under docs/archive/.';
  if (classification.includes('DOCUMENTATION')) return 'Keep current or archive if superseded.';
  if (classification.includes('SOURCE') || classification === 'ACTIVE TEST') return 'Keep; validate with lint/test/build and targeted product checks.';
  return 'Keep if referenced; review when related behavior changes.';
};

const walk = (absDir) => {
  for (const item of readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, item.name);
    const rel = posix(path.relative(root, abs));
    const stats = statSync(abs);
    const isDirectory = item.isDirectory();
    const gitState = tracked.has(rel) ? 'tracked' : ignored.has(rel) ? 'ignored' : untracked.has(rel) ? 'untracked' : rel.startsWith('.git/') ? 'git-internal' : 'untracked';
    const classification = classifyPath(rel, stats, isDirectory);
    entries.push({
      path: rel,
      filename: item.name,
      directory: posix(path.dirname(rel)),
      extension: isDirectory ? '' : path.extname(item.name).toLowerCase(),
      kind: isDirectory ? 'directory' : 'file',
      size: isDirectory ? 0 : stats.size,
      modified: stats.mtime.toISOString(),
      gitState,
      classification,
      currentStatus: classification.includes('ARCHIVE') || rel.startsWith('docs/archive/') ? 'historical' : classification === 'GENERATED' || classification === 'VENDOR / THIRD PARTY' ? 'generated/current' : 'current-or-review',
      purpose: purposeFor(rel, classification, isDirectory),
      referencedBy: [],
      recommendation: recommendationFor(rel, classification, gitState),
    });
    let cursor = rel;
    while (cursor && cursor !== '.') {
      directorySizes.set(cursor, (directorySizes.get(cursor) || 0) + (isDirectory ? 0 : stats.size));
      cursor = posix(path.dirname(cursor));
    }
    directorySizes.set('.', (directorySizes.get('.') || 0) + (isDirectory ? 0 : stats.size));
    if (isDirectory) walk(abs);
  }
};

walk(root);

const humanMaintained = entries.filter((entry) =>
  entry.kind === 'file' &&
  !entry.path.startsWith('.git/') &&
  !entry.path.startsWith('node_modules/') &&
  !entry.path.startsWith('dist/') &&
  !entry.path.startsWith('test-results/') &&
  !entry.path.startsWith('output/') &&
  !entry.path.startsWith('.firebase/')
);

const docs = entries.filter((entry) => {
  if (entry.kind !== 'file') return false;
  const lower = entry.path.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.mdx') || lower.includes('handoff') || lower.includes('agent') || lower.endsWith('.txt');
});

const activeDocPaths = new Set([
  'README.md',
  'AI_AGENT_RULES.md',
  'PROJECT_HANDOFF.md',
  'docs/GSV_MASTER_SYSTEM_REFERENCE.md',
  'docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md',
  'docs/DEPLOYMENT_GUIDE.md',
  'docs/QA_GUIDE.md',
  'docs/PRODUCT_GUIDE.md',
  'docs/PROTOTYPE_DEMO_GUIDE.md',
  'docs/ROUTE_MAP.md',
  'docs/CODEX_DEMO_FULL_SYSTEM_WALKTHROUGH_STANDARD.md',
  'docs/PROTECTED_OWNER_APPLICATION_ACCESS_STANDARD.md',
  'docs/PROTECTED_OWNER_SUPER_ADMIN_AND_MAINTENANCE_STANDARD.md',
  'docs/TUTORIAL_AND_IN_APP_GUIDANCE_MAINTENANCE_STANDARD.md',
  'docs/ORGANIZER_UNDERSTANDABILITY_AND_USABILITY_STANDARD.md',
  'docs/AUDIT_LOG_BUSINESS_WRITE_STANDARD.md',
  'docs/EVENT_TASK_AND_DEADLINE_STANDARD.md',
  'docs/EQUIPMENT_AND_SUPPLIES_WORKFLOW_STANDARD.md',
  'docs/EVENT_DAY_RUN_OF_SHOW_STANDARD.md',
  'docs/DOCUMENT_REFERENCE_DATA_STANDARD.md',
  'docs/CONTACT_AND_EVENT_RELATIONSHIP_STANDARD.md',
  'docs/REGISTRATION_PAYMENT_STATUS_STANDARD.md',
  'docs/REGISTRATION_PAYMENT_REVIEW_AND_ACTION_STANDARD.md',
  'docs/OPERATIONS_LEDGER_ENTRY_STANDARD.md',
  'docs/MESSAGE_BUILDER_COPY_ONLY_STANDARD.md',
  'docs/SYSTEM_QA_PRESENTATION_STANDARD.md',
]);

const trackedTextFiles = humanMaintained
  .filter((entry) => !binaryExtensions.has(entry.extension))
  .map((entry) => entry.path);

const referenceMap = new Map();
const docBaseNames = docs.filter((entry) => !entry.path.startsWith('node_modules/')).map((entry) => path.basename(entry.path));
for (const file of trackedTextFiles) {
  let text = '';
  try {
    text = readFileSync(path.join(root, file), 'utf8');
  } catch {
    continue;
  }
  for (const base of docBaseNames) {
    if (file.endsWith(base)) continue;
    if (text.includes(base)) {
      const matches = docs.filter((entry) => path.basename(entry.path) === base).map((entry) => entry.path);
      for (const match of matches) {
        if (!referenceMap.has(match)) referenceMap.set(match, []);
        referenceMap.get(match).push(file);
      }
    }
  }
}

const documentRegistry = docs
  .filter((entry) => !entry.path.startsWith('node_modules/'))
  .map((entry) => {
    let title = '';
    let content = '';
    try {
      content = readFileSync(path.join(root, entry.path), 'utf8');
      title = (content.match(/^#\s+(.+)$/m)?.[1] || path.basename(entry.path)).trim();
    } catch {
      title = path.basename(entry.path);
    }
    const lower = `${entry.path}\n${content.slice(0, 4000)}`.toLowerCase();
    const isHistorical = entry.path.startsWith('docs/archive/') || /^phase_|audit_phase|qa_report|.*_result_|.*_audit_/i.test(path.basename(entry.path));
    const contradictions = [];
    if (lower.includes('codex_test') && !entry.path.includes('CODEX_TEST_RETIREMENT') && !entry.path.startsWith('docs/archive/')) contradictions.push('References retired CODEX_TEST wording; verify context.');
    if (lower.includes('phase ') || lower.includes('phase_')) contradictions.push('Contains phase/history wording; keep active only if operationally necessary.');
    if (lower.includes('copy-only command center')) contradictions.push('Uses retired Message Builder wording.');
    return {
      path: entry.path,
      title,
      purpose: purposeFor(entry.path, entry.classification, false),
      status: activeDocPaths.has(entry.path) ? 'active' : isHistorical ? 'historical' : 'review-required',
      referencedBy: referenceMap.get(entry.path) || [],
      contradictions,
      staleFacts: contradictions,
      actionTaken: 'Inventoried during full repository audit.',
      canonicalReplacement: activeDocPaths.has(entry.path) ? entry.path : isHistorical ? 'docs/HISTORICAL_ARCHIVE_INDEX.md' : 'docs/GSV_MASTER_SYSTEM_REFERENCE.md',
    };
  });

const largestFiles = entries.filter((entry) => entry.kind === 'file').sort((a, b) => b.size - a.size).slice(0, 50);
const largestDirectories = [...directorySizes.entries()]
  .map(([directory, size]) => ({ directory, size }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 50);

const summary = {
  generatedAt: new Date().toISOString(),
  root,
  head: runGit(['rev-parse', 'HEAD']),
  originMain: runGit(['rev-parse', 'origin/main']),
  totalEntries: entries.length,
  totalFiles: entries.filter((entry) => entry.kind === 'file').length,
  totalDirectories: entries.filter((entry) => entry.kind === 'directory').length,
  humanMaintainedFiles: humanMaintained.length,
  markdownDocuments: documentRegistry.length,
  sourceFiles: entries.filter((entry) => entry.kind === 'file' && sourceExtensions.has(entry.extension) && !entry.path.startsWith('node_modules/')).length,
  styleFiles: entries.filter((entry) => entry.kind === 'file' && styleExtensions.has(entry.extension) && !entry.path.startsWith('node_modules/')).length,
  generatedOrVendorFiles: entries.filter((entry) => entry.kind === 'file' && ['GENERATED', 'VENDOR / THIRD PARTY', 'HISTORICAL EVIDENCE'].includes(entry.classification)).length,
  sizes: {
    repositoryBytes: directorySizes.get('.') || 0,
    nodeModulesBytes: directorySizes.get('node_modules') || 0,
    gitBytes: directorySizes.get('.git') || 0,
    distBytes: directorySizes.get('dist') || 0,
    outputBytes: directorySizes.get('output') || 0,
    testResultsBytes: directorySizes.get('test-results') || 0,
    firebaseCacheBytes: directorySizes.get('.firebase') || 0,
  },
  largestFiles,
  largestDirectories,
};

writeFileSync(path.join(auditDir, 'gsv-file-inventory.json'), `${JSON.stringify({ summary, entries }, null, 2)}\n`);
writeFileSync(path.join(auditDir, 'gsv-document-registry.json'), `${JSON.stringify({ summary: { generatedAt: summary.generatedAt, totalDocuments: documentRegistry.length }, documents: documentRegistry }, null, 2)}\n`);

console.log(JSON.stringify(summary, null, 2));
