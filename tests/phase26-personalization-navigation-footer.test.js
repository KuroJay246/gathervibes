import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getUserAccessLevel } from '../src/utils/accessRoles.js'
import { mobilePrimaryNavigationForAccess } from '../src/utils/navigation.js'
import { trustedOrganizerFirstName, welcomeAboardMessage } from '../src/utils/organizerDisplay.js'

const JAYLAN_UID = 'WcDU2jmbopdAgDlMMWvD3TkqqbC3'
const ANICA_UID = 'WM2UOQtSeuOglCI5uMZQKrYYqP53'

function routesFor(access) {
  return mobilePrimaryNavigationForAccess(access).map((item) => item.to)
}

test('personalized onboarding copy uses trusted display names without email or UID display', () => {
  assert.equal(
    welcomeAboardMessage({ uid: JAYLAN_UID, displayName: 'Jaylan Maynard', email: 'ignored@example.com' }),
    'Welcome aboard, Jaylan.',
  )
  assert.equal(
    welcomeAboardMessage({ uid: ANICA_UID }, { displayName: 'Anica Maynard' }),
    'Welcome aboard, Anica.',
  )
  assert.equal(
    welcomeAboardMessage({ uid: 'other-user', email: 'person@example.com' }),
    'Welcome aboard. Your Event Hub is ready.',
  )
  assert.equal(trustedOrganizerFirstName({ uid: 'other-user', email: 'person@example.com' }), '')
})

test('mobile primary navigation is role filtered and deduplicated', () => {
  const protectedOwner = getUserAccessLevel({ uid: JAYLAN_UID, email: 'jaylanspencer99@gmail.com' })
  const approvedOrganizer = getUserAccessLevel(
    { uid: ANICA_UID, email: 'gathersavorvibes@gmail.com' },
    { approvedEmails: ['gathersavorvibes@gmail.com'] },
  )
  const eventManager = { level: 'staff', role: 'event-manager' }
  const scanner = { level: 'staff', role: 'scanner' }
  const viewer = { level: 'staff', role: 'viewer' }
  const operationsHelper = { level: 'staff', role: 'operations-helper' }

  assert.deepEqual(routesFor(protectedOwner), ['/dashboard', '/registrations', '/tickets', '/check-in'])
  assert.deepEqual(routesFor(approvedOrganizer), ['/dashboard', '/registrations', '/tickets', '/check-in'])
  assert.deepEqual(routesFor(eventManager), ['/dashboard', '/check-in'])
  assert.deepEqual(routesFor(scanner), [])
  assert.deepEqual(routesFor(viewer), ['/dashboard'])
  assert.deepEqual(routesFor(operationsHelper), [])

  for (const access of [protectedOwner, approvedOrganizer, eventManager, scanner, viewer, operationsHelper]) {
    const routes = routesFor(access)
    assert.equal(routes.length, new Set(routes).size, `duplicate mobile route for ${access.role}`)
    assert.equal(routes.includes('/qa'), false, 'System QA must not be a mobile primary action')
  }
})

test('product footer copy is semantic and appears in authenticated and login shells', async () => {
  const footer = await readFile('src/components/ProductFooter.jsx', 'utf8')
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const login = await readFile('src/pages/LoginPage.jsx', 'utf8')

  assert.match(footer, /<footer/)
  assert.match(footer, /Gather &amp; Savor Event Hub\. All rights reserved\./)
  assert.match(footer, /Created and developed by Jaylan Maynard/)
  assert.match(footer, /2026-\$\{currentYear\}/)
  assert.match(shell, /<ProductFooter \/>/)
  assert.match(login, /<ProductFooter compact \/>/)
  assert.doesNotMatch(footer, /Privacy|Terms|Support/)
})
