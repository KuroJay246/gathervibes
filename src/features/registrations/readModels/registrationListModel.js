import { deriveAttendanceRecordType } from '../../../utils/attendanceUtils.js'
import { calculateRegistrationFinance, financeFilterMatches, buildFinanceSummary, formatCurrency } from '../../../utils/financeUtils.js'
import { buildRegistrationMetrics, formatRegistrationGuestSummary } from '../../../utils/registrationMetrics.js'
import { paymentStatusMatches } from '../../../utils/paymentStatus.js'
import { REGISTRATION_CARD_FILTERS } from '../contracts/registrationFilters.js'

export function attendeeNamesText(registration = {}) {
  return Array.isArray(registration.attendeeNames) ? registration.attendeeNames.join(', ') : ''
}

export function registrationNeedsReview(registration = {}, event = {}) {
  const finance = calculateRegistrationFinance(registration, event)
  return Boolean(finance.needsFinanceReview || registration.financeReviewRequired || !registration.ticketCode)
}

export function duplicateContactKeys(registrations = []) {
  const emailCounts = new Map()
  const phoneCounts = new Map()

  registrations.forEach((registration) => {
    const email = String(registration.email || '').trim().toLowerCase()
    const phone = String(registration.phone || '').trim().toLowerCase()
    if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
    if (phone) phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1)
  })

  return { emailCounts, phoneCounts }
}

export function hasDuplicateContact(registration = {}, contactKeys = duplicateContactKeys([])) {
  const email = String(registration.email || '').trim().toLowerCase()
  const phone = String(registration.phone || '').trim().toLowerCase()
  return Boolean(
    (email && (contactKeys.emailCounts.get(email) || 0) > 1)
    || (phone && (contactKeys.phoneCounts.get(phone) || 0) > 1),
  )
}

export function matchesRegistrationCardFilter(registration = {}, key, event = {}) {
  const finance = calculateRegistrationFinance(registration, event)
  if (!key) return true
  if (key === REGISTRATION_CARD_FILTERS.financeWarning) return finance.needsFinanceReview || registration.financeReviewRequired
  if (key === REGISTRATION_CARD_FILTERS.missingTicket) return !registration.ticketCode
  if (key === REGISTRATION_CARD_FILTERS.outstanding) return (finance.balanceDue || 0) > 0
  if (key === REGISTRATION_CARD_FILTERS.door) return paymentStatusMatches(registration.paymentStatus, 'door')
  if (key === REGISTRATION_CARD_FILTERS.doorList) return paymentStatusMatches(registration.paymentStatus, 'door-list')
  if (key === REGISTRATION_CARD_FILTERS.checkedIn) return Boolean(registration.checkedIn)
  if (key === REGISTRATION_CARD_FILTERS.notCheckedIn) return !registration.checkedIn
  if (key === REGISTRATION_CARD_FILTERS.reviewNeeded) return registrationNeedsReview(registration, event)
  return true
}

export function filterRegistrationRows({
  registrations = [],
  event = {},
  activeTab = 'All',
  cardFilter = '',
  filters = {},
  duplicateContactLookup = duplicateContactKeys(registrations),
} = {}) {
  return registrations.filter((registration) => {
    const finance = calculateRegistrationFinance(registration, event)
    if (!matchesRegistrationCardFilter(registration, cardFilter, event)) return false
    if (activeTab === 'Checked In' && !registration.checkedIn) return false
    if (activeTab === 'Missing Ticket Code' && registration.ticketCode) return false
    if (activeTab === 'Door Paid' && !paymentStatusMatches(registration.paymentStatus, 'door')) return false
    if (activeTab === 'To Pay at Door' && !paymentStatusMatches(registration.paymentStatus, 'door-list')) return false
    if (activeTab === 'Needs Review' && !registrationNeedsReview(registration, event)) return false
    if (['Paid', 'Pending', 'Complimentary', 'Outstanding Balance'].includes(activeTab)) {
      if (!financeFilterMatches(registration, activeTab, event)) return false
    }

    if (filters.keyword) {
      const query = filters.keyword.toLowerCase()
      if (![registration.fullName, registration.buyerName, attendeeNamesText(registration), registration.email, registration.phone, registration.ticketCode].some((value) => value?.toLowerCase().includes(query))) return false
    }
    if (filters.guestName && !registration.fullName?.toLowerCase().includes(filters.guestName.toLowerCase())) return false
    if (filters.buyerName && !registration.buyerName?.toLowerCase().includes(filters.buyerName.toLowerCase())) return false
    if (filters.attendeeName && !attendeeNamesText(registration).toLowerCase().includes(filters.attendeeName.toLowerCase())) return false
    if (filters.contact && !(registration.email?.toLowerCase().includes(filters.contact.toLowerCase()) || registration.phone?.toLowerCase().includes(filters.contact.toLowerCase()))) return false
    if (filters.group && !registration.groupName?.toLowerCase().includes(filters.group.toLowerCase())) return false
    if (filters.ticketCode && !registration.ticketCode?.toLowerCase().includes(filters.ticketCode.toLowerCase())) return false
    if (filters.priceTier && !registration.priceTier?.toLowerCase().includes(filters.priceTier.toLowerCase())) return false
    if (filters.paymentStatus && !paymentStatusMatches(registration.paymentStatus, filters.paymentStatus)) return false
    if (filters.paymentMethod && registration.paymentMethod !== filters.paymentMethod) return false
    if (filters.source && registration.source !== filters.source) return false
    if (filters.ticketState === 'assigned' && registration.ticketStatus !== 'assigned') return false
    if (filters.ticketState === 'missing' && registration.ticketCode) return false
    if (filters.ticketState === 'partial' && registration.ticketStatus !== 'partially-assigned') return false
    if (filters.attendanceState === 'checked-in' && !registration.checkedIn) return false
    if (filters.attendanceState === 'not-checked-in' && registration.checkedIn) return false
    if (filters.attendanceState === 'historical' && deriveAttendanceRecordType(registration) !== 'organizer-confirmed-historical') return false
    if (filters.balanceDue && (!finance.balanceDue || finance.balanceDue <= 0)) return false
    if (filters.missingTicket && registration.ticketCode) return false
    if (filters.missingAmount && finance.amountDue !== null && finance.amountPaid !== null) return false
    if (filters.reviewNeeded && !registrationNeedsReview(registration, event)) return false
    if (filters.duplicateContacts && !hasDuplicateContact(registration, duplicateContactLookup)) return false
    return true
  })
}

export function buildRegistrationListModel({
  registrations = [],
  event = {},
  activeTab = 'All',
  cardFilter = '',
  filters = {},
  selectedIds = new Set(),
} = {}) {
  const duplicateContactLookup = duplicateContactKeys(registrations)
  const filteredRegistrations = filterRegistrationRows({
    registrations,
    event,
    activeTab,
    cardFilter,
    filters,
    duplicateContactLookup,
  })
  const allMetrics = buildRegistrationMetrics(registrations, event)
  const filteredMetrics = buildRegistrationMetrics(filteredRegistrations, event)
  const financeSummary = buildFinanceSummary(registrations, event)
  const isFiltering = activeTab !== 'All' || Boolean(cardFilter) || Object.values(filters).some(Boolean)
  const activeFilterCount = [
    activeTab !== 'All',
    Boolean(cardFilter),
    ...Object.values(filters).map(Boolean),
  ].filter(Boolean).length
  const selectedRegistrations = filteredRegistrations.filter((registration) => selectedIds.has(registration.registrationId))

  return {
    duplicateContactLookup,
    filteredRegistrations,
    allMetrics,
    filteredMetrics,
    financeSummary,
    isFiltering,
    activeFilterCount,
    showingText: isFiltering
      ? `Showing ${filteredMetrics.totalRegistrations} registration${filteredMetrics.totalRegistrations === 1 ? '' : 's'} covering ${filteredMetrics.totalPersons} guest${filteredMetrics.totalPersons === 1 ? '' : 's'}.`
      : 'Showing all registrations.',
    selectedRegistrations,
    allVisibleSelected: filteredRegistrations.length > 0 && filteredRegistrations.every((registration) => selectedIds.has(registration.registrationId)),
    metricCards: [
      { label: 'Total Registrations', value: allMetrics.totalRegistrations, help: 'Registration records for this Working Event.', key: '' },
      { label: 'Total Guests', value: allMetrics.totalPersons, help: 'Guests represented by those registrations, including groups.', key: '' },
      { label: 'Expected Registration Income', value: formatCurrency(financeSummary.totalExpected), help: 'Registration totals from explicit ticket price or amount due only.' },
      { label: 'Recorded Registration Payments', value: formatCurrency(financeSummary.totalCollected), help: 'Confirmed amountPaid across registrations.' },
      { label: 'Outstanding Balance', value: formatCurrency(financeSummary.totalOutstanding), help: 'Click to see rows with balance due.', tab: 'Outstanding Balance', card: REGISTRATION_CARD_FILTERS.outstanding },
      { label: 'Needs Review', value: registrations.filter((registration) => registrationNeedsReview(registration, event)).length, help: 'Registrations with finance review, ticket review, or missing ticket information.', tab: 'Needs Review', card: REGISTRATION_CARD_FILTERS.reviewNeeded },
      { label: 'Paid', value: formatRegistrationGuestSummary(allMetrics.paidRegistrations, allMetrics.paidPersons), help: 'Registrations marked paid.', tab: 'Paid' },
      { label: 'Pending', value: formatRegistrationGuestSummary(allMetrics.pendingRegistrations, allMetrics.pendingPersons), help: 'Registrations still pending payment review or collection.', tab: 'Pending' },
      { label: 'Complimentary', value: formatRegistrationGuestSummary(allMetrics.complimentaryRegistrations, allMetrics.complimentaryPersons), help: 'Registrations marked complimentary.', tab: 'Complimentary' },
      { label: 'Door Paid', value: formatRegistrationGuestSummary(allMetrics.doorRegistrations, allMetrics.doorPersons), help: 'Paid at door or late payment confirmed.', tab: 'Door Paid', card: REGISTRATION_CARD_FILTERS.door },
      { label: 'To Pay at Door', value: formatCurrency(financeSummary.doorTotal), help: 'Expected door balances, not confirmed paid.', tab: 'To Pay at Door', card: REGISTRATION_CARD_FILTERS.doorList },
      { label: 'Complimentary Value', value: formatCurrency(financeSummary.complimentaryValue), help: 'Value of complimentary tickets when prices are explicit.' },
      { label: 'Finance Review', value: financeSummary.financeWarningCount, help: 'Click to see registrations needing finance review.', card: REGISTRATION_CARD_FILTERS.financeWarning },
      { label: 'Checked In', value: formatRegistrationGuestSummary(allMetrics.checkedInRegistrations, allMetrics.checkedInPersons), help: 'Checked-in registrations and guests represented.', card: REGISTRATION_CARD_FILTERS.checkedIn },
      { label: 'Not Checked In', value: formatRegistrationGuestSummary(allMetrics.remainingRegistrations, allMetrics.remainingPersons), help: 'Registrations and guests not checked in yet.', card: REGISTRATION_CARD_FILTERS.notCheckedIn },
      { label: 'Missing Ticket Code', value: allMetrics.missingTicketRegistrations, help: 'Registrations with no ticket code assigned.', tab: 'Missing Ticket Code', card: REGISTRATION_CARD_FILTERS.missingTicket },
      { label: 'Selected Registrations', value: selectedIds.size, help: 'Registrations currently selected for bulk actions.' },
    ],
  }
}
