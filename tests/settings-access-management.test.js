import { readFile } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'
import { listApprovedAccessEntries, normalizeAccessStatus, resolveAccessRole } from '../src/utils/accessRoles.js'

test('approved organizer statuses are visible but only active records authorize', () => {
  const accessControl = {
    approvedEmails: ['gathersavorvibes@gmail.com', 'disabled@example.com'],
    rolesByEmail: {
      'gathersavorvibes@gmail.com': 'admin',
      'disabled@example.com': 'admin',
    },
    approvedOrganizerRecords: {
      'gathersavorvibes@gmail.com': { accessType: 'admin', status: 'active', addedBy: 'owner@example.com', lastChangedBy: 'owner@example.com' },
      'disabled@example.com': { accessType: 'admin', status: 'disabled', addedBy: 'owner@example.com', lastChangedBy: 'owner@example.com' },
      'removed@example.com': { accessType: 'admin', status: 'removed', addedBy: 'owner@example.com', lastChangedBy: 'owner@example.com' },
    },
  }
  assert.equal(resolveAccessRole(accessControl, 'gathersavorvibes@gmail.com'), 'admin')
  assert.equal(resolveAccessRole(accessControl, 'disabled@example.com'), null)
  assert.equal(resolveAccessRole(accessControl, 'removed@example.com'), null)
  assert.equal(normalizeAccessStatus('inactive'), 'disabled')
  assert.equal(normalizeAccessStatus('revoked'), 'revoked')
  const entries = listApprovedAccessEntries(accessControl)
  assert.ok(entries.some((entry) => entry.email === 'gathersavorvibes@gmail.com' && entry.status === 'active'))
  assert.ok(entries.some((entry) => entry.email === 'disabled@example.com' && entry.status === 'disabled'))
  assert.ok(entries.some((entry) => entry.email === 'removed@example.com' && entry.status === 'removed'))
})

test('Settings exposes owner-only organizer management from settings/accessControl', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const accessService = await readFile('src/services/accessManagementService.js', 'utf8')
  assert.match(settings, /settings\/accessControl|same Firebase source used by authorization/)
  assert.match(settings, /Account & Access/)
  assert.match(settings, /Approved Organizers/)
  assert.match(settings, /Staff & Event Assignments/)
  assert.match(settings, /Access History/)
  assert.match(settings, /Add Organizer/)
  assert.match(settings, /Disable/)
  assert.match(settings, /Restore/)
  assert.match(settings, /Remove Approval|Remove/)
  assert.match(settings, /role="dialog"/)
  assert.match(settings, /htmlFor=\{id\}/)
  assert.match(accessService, /runTransaction/)
  assert.match(accessService, /settings', 'accessControl', 'history'/)
  assert.match(accessService, /isProtectedOwnerUser/)
  assert.match(accessService, /PROTECTED_OWNER_EMAIL/)
})

test('staff and integration management preserve product boundaries', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const staffService = await readFile('src/services/staffManagementService.js', 'utf8')
  const integrationService = await readFile('src/services/integrationSettingsService.js', 'utf8')
  assert.match(settings, /Staff profiles are not approved organizers/)
  assert.match(settings, /Payment records are tracked manually\. No online payment gateway is connected/)
  assert.match(staffService, /staffProfiles/)
  assert.match(staffService, /staffAssignments/)
  assert.match(staffService, /staffAssignmentHistory/)
  assert.match(integrationService, /Packaged but Not Deployed/)
  assert.match(integrationService, /Disconnected/)
  assert.doesNotMatch(integrationService, /secret|token|password/i)
})

test('rules allow only protected owner organizer and integration mutations', async () => {
  const rules = await readFile('firestore.rules', 'utf8')
  assert.match(rules, /match \/settings\/accessControl \{[\s\S]*allow update: if isProtectedOwner\(\)[\s\S]*validAccessControlDocument/)
  assert.match(rules, /match \/settings\/accessControl\/history\/\{historyId\}/)
  assert.match(rules, /match \/settings\/integrations \{[\s\S]*allow create, update: if isProtectedOwner\(\)[\s\S]*validIntegrationSettings/)
  assert.match(rules, /match \/staffHistory\/\{historyId\}/)
  assert.match(rules, /match \/events\/\{eventId\}\/staffAssignmentHistory\/\{historyId\}/)
  assert.match(rules, /match \/staffProfiles\/\{uid\} \{[\s\S]*allow delete: if false;/)
  assert.match(rules, /match \/events\/\{eventId\}\/staffAssignments\/\{uid\} \{[\s\S]*allow delete: if false;/)
})
