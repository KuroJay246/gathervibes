import test from 'node:test'
import assert from 'node:assert/strict'

import {
  COMMUNICATION_TEMPLATES,
  buildMessagePreview,
  extractAvailableGroups,
  filterCommunicationsRegistrations,
  buildCommunicationsExport,
} from '../src/utils/communicationsUtils.js'

test('COMMUNICATION_TEMPLATES exist and have correct placeholders', () => {
  assert.ok(COMMUNICATION_TEMPLATES.length > 0)
  assert.ok(COMMUNICATION_TEMPLATES.find((t) => t.id === 'ticket-reminder').content.includes('{{ticketCode}}'))
})

test('buildMessagePreview substitutes placeholders safely', () => {
  const template = 'Hi {{guestName}} at {{eventName}} in {{location}}. Ticket: {{ticketCode}}. {{eventDate}}'
  
  const output = buildMessagePreview(
    template,
    { fullName: 'Jane Doe', ticketCode: 'T-123' },
    { eventName: 'My Event', location: 'The Park', eventDate: { toDate: () => new Date('2025-01-01T12:00:00Z') } }
  )

  assert.ok(output.includes('Jane Doe'))
  assert.ok(output.includes('My Event'))
  assert.ok(output.includes('The Park'))
  assert.ok(output.includes('T-123'))
})

test('buildMessagePreview handles missing values safely', () => {
  const template = 'Hi {{guestName}} at {{eventName}}. Ticket: {{ticketCode}}'
  const output = buildMessagePreview(template, null, null)
  
  assert.ok(output.includes('Guest'))
  assert.ok(output.includes('your event'))
  assert.ok(output.includes('your ticket code'))
})

test('extractAvailableGroups finds unique non-empty groups and sorts them', () => {
  const regs = [
    { groupName: 'Alpha' },
    { groupName: 'Beta ' },
    { groupName: ' Alpha' },
    { groupName: '' },
    { groupName: null },
    { groupName: 'Gamma' },
  ]
  const groups = extractAvailableGroups(regs)
  assert.deepEqual(groups, ['Alpha', 'Beta', 'Gamma'])
})

test('filterCommunicationsRegistrations applies status filters correctly', () => {
  const regs = [
    { id: '1', paymentStatus: 'paid', checkedIn: true, ticketCode: 'T-1' },
    { id: '2', paymentStatus: 'pending', checkedIn: false, ticketCode: null },
    { id: '3', paymentStatus: 'complimentary', checkedIn: true, ticketCode: null },
  ]

  const f1 = { paymentStatus: 'all', checkInStatus: 'all', ticketStatus: 'all', groupName: '' }
  assert.equal(filterCommunicationsRegistrations(regs, f1, '').length, 3)

  const f2 = { paymentStatus: 'paid', checkInStatus: 'all', ticketStatus: 'all', groupName: '' }
  assert.equal(filterCommunicationsRegistrations(regs, f2, '').length, 1)
  assert.equal(filterCommunicationsRegistrations(regs, f2, '')[0].id, '1')

  const f3 = { paymentStatus: 'all', checkInStatus: 'not-checked-in', ticketStatus: 'all', groupName: '' }
  assert.equal(filterCommunicationsRegistrations(regs, f3, '').length, 1)
  assert.equal(filterCommunicationsRegistrations(regs, f3, '')[0].id, '2')

  const f4 = { paymentStatus: 'all', checkInStatus: 'all', ticketStatus: 'assigned', groupName: '' }
  assert.equal(filterCommunicationsRegistrations(regs, f4, '').length, 1)
  assert.equal(filterCommunicationsRegistrations(regs, f4, '')[0].id, '1')
})

test('filterCommunicationsRegistrations applies group and search filters', () => {
  const regs = [
    { id: '1', paymentStatus: 'paid', groupName: 'VIP Guests', fullName: 'Jane Doe', email: 'jane@example.com' },
    { id: '2', paymentStatus: 'paid', groupName: 'Staff', fullName: 'John Smith', email: 'john@example.com' },
  ]
  const baseFilter = { paymentStatus: 'all', checkInStatus: 'all', ticketStatus: 'all', groupName: '' }

  assert.equal(filterCommunicationsRegistrations(regs, { ...baseFilter, groupName: 'vip' }, '').length, 1)
  assert.equal(filterCommunicationsRegistrations(regs, baseFilter, 'jane@example.com').length, 1)
})

test('buildCommunicationsExport formats multiple registrations into copyable text', () => {
  const regs = [
    { fullName: 'Jane Doe', email: 'jane@example.com', phone: '123' },
    { fullName: 'John Smith', email: 'john@example.com', phone: '456' },
  ]
  const template = 'Hi {{guestName}}'
  
  const output = buildCommunicationsExport(regs, template, null)
  
  assert.ok(output.includes('To: Jane Doe'))
  assert.ok(output.includes('Hi Jane Doe'))
  assert.ok(output.includes('To: John Smith'))
  assert.ok(output.includes('Hi John Smith'))
  assert.ok(output.includes('---'))
})
