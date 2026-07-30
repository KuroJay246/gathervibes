/**
 * Onboarding Flow Tests
 *
 * Verifies the onboarding hook reads and writes to the dedicated
 * subcollection path: staffProfiles/{uid}/preferences/onboarding
 *
 * Uses node:test + node:assert (project standard).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { walkthroughSteps } from '../src/components/onboarding/onboardingSteps.js'

const JAYLAN_UID = 'WcDU2jmbopdAgDlMMWvD3TkqqbC3'
const ANICA_UID = 'WM2UOQtSeuOglCI5uMZQKrYYqP53'
const OTHER_UID = 'non-target-uid-xyzabc'

// ── TARGET_UIDS ───────────────────────────────────────────────────────────────

test('[onboarding-flow] TARGET_UIDS includes Jaylan UID', async () => {
  const src = await readFile('src/components/onboarding/useOnboarding.js', 'utf8')
  assert.match(src, new RegExp(JAYLAN_UID), 'Jaylan UID should be in TARGET_UIDS')
})

test('[onboarding-flow] TARGET_UIDS includes Anica UID', async () => {
  const src = await readFile('src/components/onboarding/useOnboarding.js', 'utf8')
  assert.match(src, new RegExp(ANICA_UID), 'Anica UID should be in TARGET_UIDS')
})

// ── ONBOARDING_VERSION ────────────────────────────────────────────────────────

test('[onboarding-flow] ONBOARDING_VERSION is exported and valid length', async () => {
  const src = await readFile('src/components/onboarding/useOnboarding.js', 'utf8')
  assert.match(src, /export const ONBOARDING_VERSION = '[^']+'/)
})

// ── walkthroughSteps ──────────────────────────────────────────────────────────

test('[onboarding-flow] walkthroughSteps contains exactly 16 steps', () => {
  assert.equal(walkthroughSteps.length, 16)
})

test('[onboarding-flow] every step has a non-empty id, title, content, route, target, and practical example', () => {
  const VALID_ROUTES = [
    '/dashboard', '/events', '/registrations', '/payments',
    '/tickets', '/check-in', '/operations', '/event-review',
    '/communications', '/imports', '/settings', '/qa',
  ]
  for (const [i, step] of walkthroughSteps.entries()) {
    assert.ok(step.id, `step ${i} must have id`)
    assert.ok(step.title, `step ${i} must have title`)
    assert.ok(step.content, `step ${i} must have content`)
    assert.ok(step.when, `step ${i} must explain when to use it`)
    assert.ok(step.example, `step ${i} must include an example`)
    assert.ok(step.route, `step ${i} must have route`)
    assert.ok(step.targetId, `step ${i} must have targetId`)
    assert.ok(step.route.startsWith('/'), `step ${i} route must start with /`)
    assert.ok(VALID_ROUTES.includes(step.route), `step ${i} route "${step.route}" must be a valid app path`)
  }
})

test('[onboarding-flow] step sequence matches required order', () => {
  const expectedIds = [
    'working-event', 'overview', 'create-event', 'event-capabilities', 'event-planning',
    'guests', 'payments', 'tickets', 'check-in', 'operations', 'partners',
    'communications', 'reports', 'imports', 'settings', 'system-qa',
  ]
  assert.deepEqual(walkthroughSteps.map((s) => s.id), expectedIds)
})

// ── useOnboarding.js path and merge contract ──────────────────────────────────

test('[onboarding-flow] useOnboarding reads and writes to the preferences subcollection, not the root profile doc', async () => {
  const src = await readFile('src/components/onboarding/useOnboarding.js', 'utf8')
  assert.match(src, /'staffProfiles', user\.uid, 'preferences', 'onboarding'/)
  // Must NOT reference the root staffProfiles/{uid} document for onboarding writes
  assert.doesNotMatch(src, /doc\(db, 'staffProfiles', user\.uid\)\s*\n\s*await (setDoc|updateDoc)/)
})

test('[onboarding-flow] useOnboarding uses setDoc with merge: true, not updateDoc', async () => {
  const src = await readFile('src/components/onboarding/useOnboarding.js', 'utf8')
  assert.match(src, /setDoc\(/)
  assert.match(src, /\{ merge: true \}/)
  assert.doesNotMatch(src, /updateDoc\(/)
})

test('[onboarding-flow] useOnboarding preserves original completedAt on replay', async () => {
  const src = await readFile('src/components/onboarding/useOnboarding.js', 'utf8')
  assert.match(src, /state\?\.completedAt/, 'completedAt guard must reference state?.completedAt')
})

// ── WelcomeCelebration portal and logo ────────────────────────────────────────

test('[onboarding-flow] WelcomeCelebration renders via React Portal to document.body', async () => {
  const src = await readFile('src/components/onboarding/WelcomeCelebration.jsx', 'utf8')
  assert.match(src, /createPortal/)
  assert.match(src, /document\.body/)
})

test('[onboarding-flow] WelcomeCelebration uses BrandMark with light={false} for cream background', async () => {
  const src = await readFile('src/components/onboarding/WelcomeCelebration.jsx', 'utf8')
  assert.match(src, /BrandMark light=\{false\}/, 'Must use dark-background-safe BrandMark treatment')
})

test('[onboarding-flow] WelcomeCelebration delegates organizer greeting to trusted display helper', async () => {
  const src = await readFile('src/components/onboarding/WelcomeCelebration.jsx', 'utf8')
  assert.match(src, /welcomeGreeting\(user, staffProfile\)/)
  assert.doesNotMatch(src, /Welcome, Anica/)
  assert.doesNotMatch(src, /WM2UOQtSeuOglCI5uMZQKrYYqP53/)
})

// ── AppWalkthrough portal and navigation ─────────────────────────────────────

test('[onboarding-flow] AppWalkthrough renders via React Portal to document.body', async () => {
  const src = await readFile('src/components/onboarding/AppWalkthrough.jsx', 'utf8')
  assert.match(src, /createPortal/)
  assert.match(src, /document\.body/)
})

test('[onboarding-flow] AppWalkthrough does not contain the manual "Open This Page" link', async () => {
  const src = await readFile('src/components/onboarding/AppWalkthrough.jsx', 'utf8')
  assert.doesNotMatch(src, /Open This Page/)
})

test('[onboarding-flow] AppWalkthrough contains "Retry Navigation" action', async () => {
  const src = await readFile('src/components/onboarding/AppWalkthrough.jsx', 'utf8')
  assert.match(src, /Retry Navigation/)
})

test('[onboarding-flow] AppWalkthrough uses route-specific header title matching (not only generic h1)', async () => {
  const src = await readFile('src/components/onboarding/AppWalkthrough.jsx', 'utf8')
  assert.match(src, /ROUTE_HEADER_TITLES/)
  assert.match(src, /ROUTE_READY_MARKERS/)
})

test('[onboarding-flow] AppWalkthrough recovers when history changes before route content renders', async () => {
  const src = await readFile('src/components/onboarding/AppWalkthrough.jsx', 'utf8')
  assert.match(src, /window\.setTimeout\(check, 100\)/)
  assert.match(src, /new PopStateEvent\('popstate'/)
  assert.match(src, /window\.location\.pathname === nextStep\.route/)
})

test('[onboarding-flow] AppWalkthrough uses anchored spotlight targets with arrowed tooltip copy', async () => {
  const src = await readFile('src/components/onboarding/AppWalkthrough.jsx', 'utf8')
  assert.match(src, /targetSelector/)
  assert.match(src, /data-tour-id/)
  assert.match(src, /scrollIntoView/)
  assert.match(src, /shadow-\[0_0_0_9999px/)
  assert.match(src, /ArrowIcon/)
  assert.match(src, /When to use it/)
  assert.match(src, /Example:/)
})

test('[onboarding-flow] AppWalkthrough does not contain the weak "Finish Tour" text button', async () => {
  const src = await readFile('src/components/onboarding/AppWalkthrough.jsx', 'utf8')
  assert.doesNotMatch(src, /Finish Tour/)
})

// ── Firestore rules contain subcollection path ───────────────────────────────

test('[onboarding-flow] firestore.rules references dedicated onboarding subcollection path', async () => {
  const rules = await readFile('firestore.rules', 'utf8')
  assert.match(rules, /\/staffProfiles\/\{uid\}\/preferences\/onboarding/)
  assert.match(rules, /validOnboardingData/)
})
