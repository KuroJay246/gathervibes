import { buildEventDaySummary, getDoorListRegistrations, getMissingTicketRegistrations, getPendingPaymentRegistrations } from '../../../utils/eventDayUtils.js'
import { buildRegistrationMetrics } from '../../../utils/registrationMetrics.js'
import { canCompleteCheckIn, checkInWarnings, searchableRegistrationText } from '../../../utils/ticketUtils.js'
import { filterCheckInRegistrations } from '../../../utils/checkInUtils.js'
import { calculateRegistrationFinance } from '../../../utils/financeUtils.js'

export function buildCheckInQueueModel({
  registrations = [],
  event = {},
  activeView = 'search',
  helperView = 'door',
  searchQuery = '',
  selectedId = '',
} = {}) {
  const visibleRegistrations = filterCheckInRegistrations(registrations, activeView, event)
  const query = searchQuery.trim().toLowerCase()
  const matches = query
    ? registrations.filter((registration) => searchableRegistrationText(registration).includes(query)).slice(0, 20)
    : []
  const selectedRegistration = registrations.find((registration) => registration.registrationId === selectedId) || matches[0] || null
  const helperRows = helperView === 'missing-ticket'
    ? getMissingTicketRegistrations(registrations)
    : helperView === 'pending-payment'
      ? getPendingPaymentRegistrations(registrations)
      : getDoorListRegistrations(registrations)

  return {
    summary: buildEventDaySummary(registrations),
    visibleRegistrations,
    visibleMetrics: buildRegistrationMetrics(visibleRegistrations, event),
    matches,
    selectedRegistration,
    selectedWarnings: selectedRegistration ? checkInWarnings(selectedRegistration) : [],
    selectedFinance: selectedRegistration ? calculateRegistrationFinance(selectedRegistration, event) : null,
    checkInState: selectedRegistration ? canCompleteCheckIn(selectedRegistration) : { allowed: false, reason: '' },
    helperRows,
    recentCheckIns: [...registrations]
      .filter((registration) => registration.checkedIn)
      .sort((left, right) => String(right.checkInTime || '').localeCompare(String(left.checkInTime || '')))
      .slice(0, 6),
  }
}
