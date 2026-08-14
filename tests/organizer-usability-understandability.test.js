import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { MOBILE_PRIMARY_NAV_ITEMS } from '../src/utils/navigation.js'
import { organizerSaveErrorMessage } from '../src/utils/organizerErrors.js'
import { pageGuidance } from '../src/utils/pageGuidance.js'

async function source(path) {
  return readFile(path, 'utf8')
}

test('organizer shell explains every major route without changing route paths', async () => {
  const shell = await source('src/layout/AppShell.jsx')
  const requiredRoutes = [
    '/dashboard',
    '/events',
    '/tasks',
    '/registrations',
    '/payments',
    '/payments/reconciliation',
    '/tickets',
    '/check-in',
    '/operations',
    '/run-of-show',
    '/resources',
    '/documents',
    '/contacts',
    '/communications',
    '/event-review',
    '/imports',
    '/settings',
    '/qa',
  ]

  for (const route of requiredRoutes) {
    assert.ok(pageGuidance[route], `missing shell guidance for ${route}`)
    assert.ok(pageGuidance[route].primaryAction, `missing primary action for ${route}`)
  }

  assert.match(shell, /data-tour-id="page-purpose"/)
  assert.match(shell, /Primary action/)
  assert.match(shell, /Automatic boundary/)
  assert.match(pageGuidance['/events'].purpose, /Completed real events remain editable by approved organizers/)
  assert.match(pageGuidance['/communications'].boundary, /Messages are not sent automatically/)
  assert.match(pageGuidance['/tickets'].boundary, /QR payload remains GSV:TICKET:\{ticketCode\}/)
  assert.match(shell, /Training event · safe to practice with example data/)
  assert.doesNotMatch(shell, /Demo \/ training event: example data only/)
  assert.match(pageGuidance['/payments'].boundary, /Registration payments are not merged into Operations Ledger totals automatically/)
})

test('mobile navigation keeps event-day actions primary and System QA behind More', () => {
  assert.deepEqual(MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.label), [
    'Home',
    'Guests',
    'Tickets',
    'Check-In',
  ])
  assert.equal(MOBILE_PRIMARY_NAV_ITEMS.some((item) => item.to === '/qa'), false)
  assert.equal(MOBILE_PRIMARY_NAV_ITEMS.some((item) => item.to === '/communications'), false)
})

test('demo editability guidance points to account, selected event, and System QA instead of vague permissions', () => {
  const message = organizerSaveErrorMessage({ code: 'permission-denied' }, 'registration')

  assert.match(message, /approved organizer/)
  assert.match(message, /correct Working Event/)
  assert.match(message, /System QA shows Protected Owner = PASS/)
  assert.doesNotMatch(message, /Check your permissions/)
})

test('organizer usability standards and demo maintenance docs exist', async () => {
  const audit = await source('docs/archive/audits/ORGANIZER_COMPREHENSION_AND_USABILITY_AUDIT_2026-08.md')
  const understandability = await source('docs/ORGANIZER_UNDERSTANDABILITY_AND_USABILITY_STANDARD.md')
  const terminology = await source('docs/ORGANIZER_STATUS_AND_TERMINOLOGY_STANDARD.md')
  const explanation = await source('docs/ORGANIZER_PAGE_EXPLANATION_STANDARD.md')
  const hierarchy = await source('docs/ORGANIZER_ACTION_HIERARCHY_STANDARD.md')
  const tutorial = await source('docs/TUTORIAL_AND_IN_APP_GUIDANCE_MAINTENANCE_STANDARD.md')
  const demo = await source('docs/CODEX_DEMO_FULL_SYSTEM_WALKTHROUGH_STANDARD.md')

  assert.match(audit, /A reversible note-only edit/)
  assert.match(understandability, /what the page does not change automatically/)
  assert.match(terminology, /Registration payments and Operations Ledger records are separate/)
  assert.match(explanation, /Message Builder creates copyable messages only/)
  assert.match(hierarchy, /System QA remains available under More/)
  assert.match(tutorial, /harmless reversible CODEX_DEMO edit saves and persists/)
  assert.match(demo, /verify the account, Working Event selection, and System QA protected-owner status/)
})
