/* global process, console */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = process.cwd()
const pdfPath = path.join(root, 'docs', 'generated', 'Gathetr_Technical_Operations_Maintenance_and_Repair_Manual.pdf')
const outputDir = path.join(root, 'output', 'pdf-validation', 'phase-3b')
const python = 'python'

function runHelper(...args) {
  return execFileSync(python, [path.join(root, 'scripts', 'docs', 'pdfTools.py'), ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PYTHONPATH: [path.join(root, 'tmp', 'pdfdeps'), process.env.PYTHONPATH || ''].filter(Boolean).join(path.delimiter),
    },
  }).trim()
}

async function runRenderWithRetry(retries = 3, delayMs = 750) {
  let lastError
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      runHelper('render', pdfPath, outputDir)
      return
    } catch (error) {
      lastError = error
      if (attempt < retries) await delay(delayMs)
    }
  }
  throw lastError
}

const inspection = JSON.parse(runHelper('inspect', pdfPath))
if (inspection.page_count < 10) throw new Error(`Expected an expanded manual; got only ${inspection.page_count} pages.`)
if (inspection.bookmark_count <= 0) throw new Error('Expected PDF bookmarks, but none were found.')
if (inspection.text_char_count < 10000) throw new Error('Expected searchable text content, but extracted text was unexpectedly short.')
if (inspection.internal_link_count <= 0) throw new Error('Expected internal PDF links, but none were detected.')
if (inspection.raw_comment_hits.length > 0) throw new Error(`Visible source comments remain in the PDF: ${inspection.raw_comment_hits.join(', ')}`)
if (inspection.raw_table_hits.length > 0) throw new Error(`Visible Markdown table syntax remains in the PDF: ${inspection.raw_table_hits.join(', ')}`)
if (inspection.raw_mermaid_hits.length > 0) throw new Error(`Visible Mermaid syntax remains in the PDF: ${inspection.raw_mermaid_hits.join(', ')}`)
if (inspection.near_empty_pages.length > 0) throw new Error(`Unexpected near-empty pages detected: ${inspection.near_empty_pages.join(', ')}`)

await runRenderWithRetry()

console.log(`PDF check passed. ${inspection.page_count} pages, ${inspection.bookmark_count} bookmarks, ${inspection.internal_link_count} internal links.`)
