import { readFile } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'

test('normal organizer errors avoid backend jargon and explain what to do', async () => {
  const tasks = await readFile('src/pages/TasksPage.jsx', 'utf8')
  const documents = await readFile('src/pages/DocumentsPage.jsx', 'utf8')
  const runOfShow = await readFile('src/pages/RunOfShowPage.jsx', 'utf8')
  const imports = await readFile('src/pages/ImportsPage.jsx', 'utf8')
  const login = await readFile('src/pages/LoginPage.jsx', 'utf8')
  const normalCopy = [tasks, documents, runOfShow, imports, login].join('\n')

  assert.match(tasks, /Confirm you are signed in as an approved organizer and the correct Working Event is selected/)
  assert.match(documents, /could not be saved\. Confirm you are signed in as an approved organizer/)
  assert.match(runOfShow, /Nothing was changed on this device; confirm organizer access and try again/)
  assert.match(imports, /No rows were imported\. Confirm you are signed in as an approved organizer/)
  assert.match(login, /Could not reach the sign-in service/)

  assert.doesNotMatch(normalCopy, /Firestore rejected|Firestore authorization|workspace rules|current workspace rules|confirmed import payload|Firebase Authentication|Firebase sign-in state|Firebase project/)
})

test('Settings keeps technical values available without leading with implementation wording', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')

  assert.match(settings, /Staff account ID/)
  assert.match(settings, /These accounts can use the organizer workspace/)
  assert.match(settings, /Private credentials are not shown in Settings/)
  assert.match(settings, /This owner account is permanent/)
  assert.doesNotMatch(settings, /label="Firebase UID"/)
})
