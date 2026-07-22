import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('repository scripts stay scoped to the active app', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))

  assert.equal(pkg.scripts.lint, 'eslint src tests scripts e2e eslint.config.js vite.config.js playwright.config.js')
  assert.equal(pkg.scripts.test, 'node --test tests/*.test.js')
  assert.doesNotMatch(pkg.scripts.lint, /eslint\s+\./)
  assert.doesNotMatch(pkg.scripts.test, /^node --test$/)
})

test('repository ignore rules exclude accidental nested archives and evidence', async () => {
  const gitignore = await readFile('.gitignore', 'utf8')

  assert.match(gitignore, /GSV_Phase\*\//)
  assert.match(gitignore, /gathetr-\*\//)
  assert.match(gitignore, /\*\*\/dist\//)
  assert.match(gitignore, /\*\*\/node_modules\//)
})
