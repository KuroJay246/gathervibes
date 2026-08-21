/* global process, console, mermaid */
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import MarkdownIt from 'markdown-it'
import markdownItAnchor from 'markdown-it-anchor'
import { chromium } from '@playwright/test'

const root = process.cwd()
const docsRoot = path.join(root, 'docs')
const generatedDir = path.join(docsRoot, 'generated')
const generatedDiagramsDir = path.join(generatedDir, 'diagrams')
const generatedDataDir = path.join(generatedDir, 'data')
const generatedScreenshotDir = path.join(generatedDir, 'screenshots', 'current')
const screenshotOutputDir = path.join(docsRoot, 'screenshots', 'current')
const htmlPath = path.join(generatedDir, 'Gathetr_Technical_Operations_Maintenance_and_Repair_Manual.html')
const pdfPath = path.join(generatedDir, 'Gathetr_Technical_Operations_Maintenance_and_Repair_Manual.pdf')
const combinedPath = path.join(generatedDir, 'MANUAL_SOURCE_COMBINED.md')

const generationDate = new Date().toISOString()
const documentationCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const currentBranch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim()
const applicationCommit = '5234f87d467d1331909c75e2443f8efb641b7dde'

const ownerManualRoot = 'C:\\Users\\Jaylan\\Documents\\Development Documentation\\Gathetr Technical Manual'
const supersededManualDir = path.join(ownerManualRoot, 'superseded')
const currentManualDir = path.join(ownerManualRoot, 'current')
const oldOwnerCopy = 'C:\\Users\\Jaylan\\Documents\\Development Documentation\\gathetr-phase-3-technical-manual-2026-08-21\\Gathetr_Technical_Operations_Maintenance_and_Repair_Manual.pdf'

const screenshotSources = [
  {
    source: path.join(root, 'output', 'organizer-experience', 'phase-1', '01-desktop-overview.png'),
    target: 'overview-emulator.png',
    title: 'Overview workspace',
    route: '/dashboard',
    dataSource: 'Local emulator synthetic event',
    redaction: 'Synthetic only',
    section: 'Application Overview',
  },
  {
    source: path.join(root, 'output', 'organizer-experience-after', 'initial-baseline', 'desktop-1440x900_settings.png'),
    target: 'settings-organizer-access.png',
    title: 'Settings workspace and organizer account view',
    route: '/settings',
    dataSource: 'CODEX_DEMO production-safe synthetic event',
    redaction: 'Protected Owner visible; no secrets',
    section: 'Settings and staff access',
  },
  {
    source: path.join(root, 'output', 'organizer-experience-after', 'initial-baseline', 'desktop-1440x900_imports.png'),
    target: 'import-center-codex-demo.png',
    title: 'Import Center staged workflow',
    route: '/imports',
    dataSource: 'CODEX_DEMO production-safe synthetic event',
    redaction: 'Synthetic only',
    section: 'Imports, Exports, and QR Systems',
  },
]

const sectionGroups = [
  {
    groupTitle: 'Front Matter',
    files: [
      'manual/00-cover-and-document-control.md',
      'manual/01-quick-start-and-emergency-reference.md',
    ],
  },
  {
    groupTitle: 'Main Manual',
    files: [
      'manual/02-application-overview.md',
      'manual/03-system-architecture.md',
      'manual/04-project-file-map.md',
      'manual/05-frontend-react-and-tailwind.md',
      'manual/06-routing-and-navigation.md',
      'manual/07-firebase-authentication.md',
      'manual/08-firestore-data-model.md',
      'manual/09-permissions-and-security-rules.md',
      'manual/10-events-guests-tickets-and-checkin.md',
      'manual/11-imports-exports-and-qr-systems.md',
      'manual/12-testing-and-quality-assurance.md',
      'manual/13-build-deployment-and-recovery.md',
      'manual/14-troubleshooting-and-repairs.md',
      'manual/15-legacy-systems-and-technical-debt.md',
      'manual/16-change-management.md',
      'manual/17-reference-and-glossary.md',
      'manual/18-future-app-development-reference.md',
    ],
  },
  {
    groupTitle: 'Runbook Section',
    files: [
      'runbooks/01-application-and-session-failures.md',
      'runbooks/02-permission-and-access-failures.md',
      'runbooks/03-scanner-ticket-and-checkin-failures.md',
      'runbooks/04-import-and-data-repair.md',
      'runbooks/05-development-build-and-test-failures.md',
      'runbooks/06-deployment-firebase-and-project-targeting.md',
      'runbooks/07-git-worktree-and-local-recovery.md',
      'runbooks/08-documentation-generation-and-pdf-repair.md',
    ],
  },
  {
    groupTitle: 'Appendices',
    files: [
      'data-dictionary/FIRESTORE_DATA_DICTIONARY.md',
      'permissions/PERMISSION_MATRIX.md',
      'appendices/01-field-level-firestore-dictionary.md',
      'appendices/02-command-safety-reference.md',
      'appendices/03-route-and-feature-indexes.md',
      'appendices/04-error-index-and-search-keywords.md',
      'appendices/05-documentation-maintenance-procedure.md',
      'screenshots/SCREENSHOT_CATALOG.md',
      'problem-register/PROBLEM_AND_REPAIR_REGISTER.md',
      'changelog/DOCUMENTATION_CHANGELOG.md',
    ],
  },
]

function slugify(text = '') {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
  breaks: false,
})
md.use(markdownItAnchor, { slugify })

async function ensureDirectories() {
  await Promise.all([
    mkdir(generatedDir, { recursive: true }),
    mkdir(generatedDiagramsDir, { recursive: true }),
    mkdir(generatedDataDir, { recursive: true }),
    mkdir(generatedScreenshotDir, { recursive: true }),
    mkdir(screenshotOutputDir, { recursive: true }),
    mkdir(currentManualDir, { recursive: true }),
    mkdir(supersededManualDir, { recursive: true }),
  ])
}

async function copyScreenshots() {
  const copied = []
  for (const item of screenshotSources) {
    if (!existsSync(item.source)) continue
    const catalogTarget = path.join(screenshotOutputDir, item.target)
    const generatedTarget = path.join(generatedScreenshotDir, item.target)
    await copyFile(item.source, catalogTarget)
    await copyFile(item.source, generatedTarget)
    copied.push({ ...item, target: catalogTarget, generatedTarget })
  }
  return copied
}

async function updateScreenshotCatalog(copiedScreenshots) {
  const table = copiedScreenshots.length === 0
    ? '| No verified screenshots were copied during Phase 3B. |'
    : [
        '| Filename | Date captured | Route/interface | Data source | Redaction status | Manual section | Replacement policy |',
        '| --- | --- | --- | --- | --- | --- | --- |',
        ...copiedScreenshots.map((shot) => `| ${path.basename(shot.target)} | 2026-08-21 or earlier archived safe capture | ${shot.route} | ${shot.dataSource} | ${shot.redaction} | ${shot.section} | Replace when layout, labels, or workflow materially change |`),
      ].join('\n')
  const gallery = copiedScreenshots
    .map((shot) => `## ${shot.title}\n\n![${shot.title}](./screenshots/current/${path.basename(shot.target)})\n\nCaption: ${shot.title}. Route: \`${shot.route}\`. Data source: ${shot.dataSource}.\n`)
    .join('\n')
  const content = `# Screenshot Catalog\n\nThis catalogue tracks screenshots intentionally included in the technical manual. Only synthetic, redacted, or otherwise safe captures belong here.\n\n${table}\n\n${gallery}`.trimEnd() + '\n'
  await writeFile(path.join(docsRoot, 'screenshots', 'SCREENSHOT_CATALOG.md'), content, 'utf8')
}

async function renderMermaidDiagrams() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent('<div id="root"></div>', { waitUntil: 'load' })
  await page.addScriptTag({ path: path.join(root, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js') })
  await page.evaluate(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose', fontFamily: 'Arial, Helvetica, sans-serif' })
  })

  const diagramMap = new Map()
  const diagramFiles = (await readdir(path.join(docsRoot, 'diagrams'))).filter((file) => file.endsWith('.mmd')).sort()
  for (const file of diagramFiles) {
    const source = (await readFile(path.join(docsRoot, 'diagrams', file), 'utf8')).trim()
    const id = `diagram-${slugify(file)}`
    const svg = await page.evaluate(async ({ diagramId, sourceText }) => {
      const rendered = await mermaid.render(diagramId, sourceText)
      return rendered.svg
    }, { diagramId: id, sourceText: source })
    const target = path.join(generatedDiagramsDir, file.replace('.mmd', '.svg'))
    await writeFile(target, svg, 'utf8')
    diagramMap.set(source, { file, target })
  }
  await browser.close()
  return diagramMap
}

async function loadSourceDocuments() {
  const documents = []
  for (const group of sectionGroups) {
    for (const relativePath of group.files) {
      const absolutePath = path.join(docsRoot, relativePath)
      if (!existsSync(absolutePath)) continue
      documents.push({
        groupTitle: group.groupTitle,
        relativePath,
        absolutePath,
        content: await readFile(absolutePath, 'utf8'),
      })
    }
  }
  return documents
}

function preprocessMarkdown(content, diagramMap, copiedScreenshots) {
  let next = content.replace(/<!--[\s\S]*?-->/g, '').replace(/\n---\n/g, '\n\n')
  next = next
    .replaceAll('{{GENERATION_DATE}}', generationDate)
    .replaceAll('{{APPLICATION_COMMIT}}', applicationCommit)
    .replaceAll('{{DOCUMENTATION_COMMIT}}', documentationCommit)
    .replaceAll('{{CURRENT_BRANCH}}', currentBranch)
  next = next.replace(/```mermaid\s*([\s\S]*?)```/g, (_match, code) => {
    const key = code.trim()
    const diagram = diagramMap.get(key)
    if (!diagram) return '```text\nUNKNOWN - REQUIRES FUTURE VERIFICATION: Mermaid render source not found.\n```'
    const title = diagram.file.replace('.mmd', '').replace(/-/g, ' ')
    return `\n\n![Diagram: ${title}](./diagrams/${path.basename(diagram.target)})\n\nCaption: ${title} diagram.\n\n`
  })
  for (const shot of copiedScreenshots) {
    next = next.replaceAll(`{SCREENSHOT:${path.basename(shot.target)}}`, `![${shot.title}](./screenshots/current/${path.basename(shot.target)})`)
  }
  return next
}

function renderDocument(doc, diagramMap, copiedScreenshots) {
  const prepared = preprocessMarkdown(doc.content, diagramMap, copiedScreenshots)
  const html = md.render(prepared)
  const tokens = md.parse(prepared, {})
  const headings = []
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].type === 'heading_open') {
      const level = Number(tokens[index].tag.replace('h', ''))
      const inline = tokens[index + 1]
      const title = inline?.content || 'Untitled'
      headings.push({ level, title, slug: slugify(title) })
    }
  }
  return { prepared, html, headings }
}

function buildToc(entries, pageMap = new Map()) {
  const items = entries.map((entry) => `<li class="toc-item toc-level-${entry.level}"><a href="#${entry.slug}">${entry.title}</a><span class="toc-page">${pageMap.get(entry.title) || '000'}</span></li>`).join('\n')
  return `<section class="manual-section toc-section" id="table-of-contents"><h1>Table of Contents</h1><ul class="toc-list">${items}</ul></section>`
}

function buildHtml(renderedDocs, tocEntries, pageMap = new Map()) {
  const nav = tocEntries.map((entry) => `<li><a href="#${entry.slug}">${entry.title}</a></li>`).join('\n')
  const sections = renderedDocs.map(({ doc, html }, index) => `<section class="manual-section ${index === 0 ? 'cover-section' : ''}" data-source="${doc.relativePath}">${html}</section>`)
  const body = [sections[0], buildToc(tocEntries, pageMap), ...sections.slice(1)].join('\n')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Gathetr Technical Operations, Development, Maintenance and Repair Manual</title>
  <style>
    @page { size: Letter; margin: 0.72in 0.58in 0.72in 0.58in; }
    :root { --ink: #271820; --accent: #7a4b59; --line: #e5d7cd; --muted: #6b564c; --bg: #fffdfa; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: var(--ink); background: var(--bg); margin: 0; line-height: 1.45; font-size: 11pt; }
    .layout { display: grid; grid-template-columns: 2.7in 1fr; min-height: 100vh; }
    aside { position: fixed; inset: 0 auto 0 0; width: 2.7in; padding: 0.45in 0.28in 0.45in 0.32in; border-right: 1px solid var(--line); background: #fbf5ef; }
    aside h2 { margin: 0 0 0.16in; font-size: 12pt; color: var(--accent); }
    aside ul { list-style: none; padding: 0; margin: 0; font-size: 9.2pt; }
    aside li { margin: 0 0 0.08in; }
    aside a { color: var(--muted); text-decoration: none; }
    main { margin-left: 2.7in; padding: 0.28in 0.3in 0.6in; }
    .manual-section { page-break-before: always; break-before: page; margin: 0 0 0.3in; }
    .manual-section:first-of-type { page-break-before: auto; break-before: auto; }
    .cover-section { display: flex; flex-direction: column; min-height: 9.5in; justify-content: center; }
    h1 { font-size: 22pt; margin: 0 0 0.14in; color: var(--ink); }
    h2 { font-size: 15.5pt; margin: 0.28in 0 0.08in; color: var(--accent); padding-bottom: 0.04in; border-bottom: 1px solid var(--line); }
    h3 { font-size: 12pt; margin: 0.22in 0 0.06in; color: var(--accent); }
    p, li { margin: 0 0 0.08in; }
    ul, ol { margin: 0 0 0.15in 0.24in; }
    code, pre { font-family: Consolas, "Courier New", monospace; }
    pre { background: #fbf4ef; border: 1px solid var(--line); border-radius: 8px; padding: 0.12in; font-size: 8.8pt; overflow-wrap: anywhere; white-space: pre-wrap; }
    table { width: 100%; border-collapse: collapse; margin: 0.1in 0 0.18in; font-size: 8.9pt; }
    th, td { border: 1px solid var(--line); padding: 0.08in 0.09in; vertical-align: top; text-align: left; }
    th { background: #f4ebe4; color: var(--ink); font-weight: 700; }
    tr:nth-child(even) td { background: #fffaf6; }
    img { max-width: 100%; height: auto; border: 1px solid var(--line); border-radius: 8px; background: white; }
    figure { margin: 0.14in 0 0.22in; }
    figcaption { font-size: 9pt; color: var(--muted); margin-top: 0.06in; }
    .manual-section[data-source="screenshots/SCREENSHOT_CATALOG.md"] h2 { break-before: page; page-break-before: always; }
    .manual-section[data-source="screenshots/SCREENSHOT_CATALOG.md"] img { display: block; width: 100%; max-width: 6.3in; }
    .toc-list { list-style: none; padding: 0; margin: 0; }
    .toc-item { display: grid; grid-template-columns: 1fr auto; gap: 0.12in; border-bottom: 1px dotted var(--line); padding: 0.03in 0; }
    .toc-level-2 { padding-left: 0.16in; }
    .toc-page { color: var(--muted); font-variant-numeric: tabular-nums; min-width: 0.32in; text-align: right; }
    blockquote { margin: 0.12in 0; padding: 0.08in 0.12in; border-left: 4px solid #244866; background: #f4f8fb; }
    hr { border: 0; border-top: 1px solid var(--line); margin: 0.2in 0; }
    @media print { aside { display: none; } main { margin-left: 0; padding: 0; } }
  </style>
</head>
<body>
  <div class="layout">
    <aside>
      <h2>Manual Navigation</h2>
      <ul>${nav}</ul>
    </aside>
    <main>
      ${body}
    </main>
  </div>
</body>
</html>`
}

function extractTocEntries(renderedDocs) {
  return renderedDocs
    .flatMap(({ headings }, index) => headings.filter((heading) => heading.level === 1 && !(index === 0 && heading.title === "Gathetr Owner's Technical Operations, Development, Maintenance and Repair Manual")))
}

function execPython(...args) {
  return execFileSync('python', [path.join(root, 'scripts', 'docs', 'pdfTools.py'), ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PYTHONPATH: [path.join(root, 'tmp', 'pdfdeps'), process.env.PYTHONPATH || ''].filter(Boolean).join(path.delimiter),
    },
  }).trim()
}

async function buildPdf(htmlFilePath, targetPath) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(pathToFileURL(htmlFilePath).href, { waitUntil: 'load' })
  await page.pdf({
    path: targetPath,
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:8px;color:#6b564c;width:100%;padding:0 32px;">Gathetr Technical Manual</div>',
    footerTemplate: '<div style="font-size:8px;color:#6b564c;width:100%;padding:0 32px;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: '0.65in', right: '0.55in', bottom: '0.68in', left: '0.55in' },
  })
  await browser.close()
}

async function main() {
  await ensureDirectories()
  await rm(generatedDiagramsDir, { recursive: true, force: true })
  await mkdir(generatedDiagramsDir, { recursive: true })
  await rm(generatedScreenshotDir, { recursive: true, force: true })
  await mkdir(generatedScreenshotDir, { recursive: true })
  const copiedScreenshots = await copyScreenshots()
  await updateScreenshotCatalog(copiedScreenshots)
  const diagramMap = await renderMermaidDiagrams()
  const docs = await loadSourceDocuments()
  const renderedDocs = docs.map((doc) => ({ doc, ...renderDocument(doc, diagramMap, copiedScreenshots) }))
  const combined = renderedDocs.map(({ doc, prepared }) => `# Source File\n\n${doc.relativePath}\n\n${prepared.trim()}`).join('\n\n')
  await writeFile(combinedPath, combined.trimEnd() + '\n', 'utf8')

  const tocEntries = extractTocEntries(renderedDocs)
  const draftHtml = buildHtml(renderedDocs, tocEntries)
  await writeFile(htmlPath, draftHtml, 'utf8')
  const draftPdf = path.join(generatedDir, 'technical-manual-draft.pdf')
  await buildPdf(htmlPath, draftPdf)

  const mapFile = path.join(generatedDataDir, 'toc-map.json')
  await writeFile(mapFile, JSON.stringify(tocEntries, null, 2), 'utf8')
  const mappedEntries = JSON.parse(execPython('section-map', draftPdf, mapFile))
  const pageMap = new Map(mappedEntries.filter((entry) => entry.page).map((entry) => [entry.title, entry.page]))

  const finalHtml = buildHtml(renderedDocs, tocEntries, pageMap)
  await writeFile(htmlPath, finalHtml, 'utf8')
  const finalDraftPdf = path.join(generatedDir, 'technical-manual-final-draft.pdf')
  await buildPdf(htmlPath, finalDraftPdf)
  await writeFile(mapFile, JSON.stringify(mappedEntries, null, 2), 'utf8')
  execPython('add-bookmarks', finalDraftPdf, mapFile, pdfPath)
  await rm(draftPdf, { force: true })
  await rm(finalDraftPdf, { force: true })
  await rm(mapFile, { force: true })

  const currentOwnerCopy = path.join(currentManualDir, 'Gathetr_Technical_Operations_Maintenance_and_Repair_Manual.pdf')
  await copyFile(pdfPath, currentOwnerCopy)
  if (existsSync(oldOwnerCopy)) {
    const supersededTarget = path.join(supersededManualDir, 'Gathetr_Technical_Operations_Maintenance_and_Repair_Manual_SUPERSEDED_PHASE3_INITIAL_TECHNICAL_SUMMARY.pdf')
    if (!existsSync(supersededTarget)) await copyFile(oldOwnerCopy, supersededTarget)
  }
  const currentStat = await stat(pdfPath)
  console.log(`Generated expanded technical manual at ${pdfPath} (${currentStat.size} bytes)`)
}

await main()
