import test from 'node:test'
import assert from 'node:assert/strict'
import { EVENT_HUB_ROUTE_MANIFEST, getEventHubPageTitles, getEventHubRouteMetadata } from '../src/app/routeManifest.js'
import { CHECKIN_LIFECYCLE, IMPORT_LIFECYCLE, PROVIDER_LIFECYCLE, createLifecycleSnapshot, createRequestVersion, isLifecycleState } from '../src/features/workflows/lifecycle.js'

test('Event Hub route manifest covers every current App route and key workflow metadata', () => {
  assert.equal(EVENT_HUB_ROUTE_MANIFEST.length, 18)
  assert.equal(getEventHubRouteMetadata('/check-in').requiresWorkingEvent, true)
  assert.equal(getEventHubRouteMetadata('/check-in').readModel, 'buildCheckInQueueModel')
  assert.equal(getEventHubRouteMetadata('/imports').privilegedMutation, true)
  assert.equal(getEventHubPageTitles()['/dashboard'][0], 'Event Overview')
})

test('workflow lifecycle contracts expose explicit operational states', () => {
  assert.ok(IMPORT_LIFECYCLE.includes('previewReady'))
  assert.ok(CHECKIN_LIFECYCLE.includes('duplicate'))
  assert.ok(PROVIDER_LIFECYCLE.includes('reconnectRequired'))
  assert.equal(isLifecycleState(CHECKIN_LIFECYCLE, 'success'), true)
  assert.equal(isLifecycleState(CHECKIN_LIFECYCLE, 'unknown'), false)
  const snapshot = createLifecycleSnapshot('previewReady', { eventId: 'codex_demo_full_system_walkthrough' })
  assert.equal(snapshot.state, 'previewReady')
  assert.equal(snapshot.eventId, 'codex_demo_full_system_walkthrough')
  assert.ok(snapshot.updatedAt)
})

test('request version contract rejects stale asynchronous results', () => {
  const request = createRequestVersion()
  const first = request.next()
  const second = request.next()
  assert.equal(request.isCurrent(first), false)
  assert.equal(request.isCurrent(second), true)
  assert.equal(request.current(), second)
})
