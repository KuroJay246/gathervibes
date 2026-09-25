import assert from 'node:assert/strict'
import test from 'node:test'
import { mobileLandingRouteForAccess } from '../packages/contracts/src/accessRoles.js'
import { EVENT_HUB_ROUTE_MANIFEST } from '../src/app/routeManifest.js'
import { MOBILE_PARITY_MANIFEST } from '../apps/mobile/src/app/mobileParityManifest.js'

test('mobile landing keeps scanner-only staff in scanner and organizers in home', () => {
  assert.equal(mobileLandingRouteForAccess({ level: 'staff', role: 'scanner' }, true), '/scanner')
  assert.equal(mobileLandingRouteForAccess({ level: 'admin', role: 'owner-admin' }, true), '/home')
  assert.equal(mobileLandingRouteForAccess({ level: 'staff', role: 'scanner' }, false), '/events')
})

test('mobile parity manifest covers every operational web route or explicitly defers it', () => {
  const mobileFeatures = new Set(MOBILE_PARITY_MANIFEST.map((entry) => entry.webRoute))
  for (const route of EVENT_HUB_ROUTE_MANIFEST.filter((entry) => entry.requiresAuth && entry.path !== '/')) {
    assert.ok(mobileFeatures.has(route.path), `Missing mobile parity entry for ${route.path}`)
  }
})
