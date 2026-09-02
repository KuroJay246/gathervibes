import {
  buildOperationsControlSummary,
  buildOperationsEntryCounts,
  buildOperationsSettlementSummary,
  buildOperationsTotals,
  findPossibleRegistrationPaymentOverlap,
} from '../../../utils/operationsReport.js'
import { buildFinanceSummary } from '../../../utils/financeUtils.js'

export function filterOperationsEntries(entries = [], filters = {}) {
  return entries.filter((entry) => {
    if (filters.type && filters.type !== 'all' && entry.entryType !== filters.type) return false
    if (filters.status && filters.status !== 'all' && entry.status !== filters.status) return false
    if (filters.category && !String(entry.category || '').toLowerCase().includes(filters.category.toLowerCase())) return false
    if (filters.search) {
      const query = filters.search.toLowerCase()
      const haystack = [
        entry.label,
        entry.category,
        entry.paidByOrPaidTo,
        entry.paymentReference,
        entry.notes,
        entry.date,
        entry.entryType,
        entry.status,
      ].map((value) => String(value || '').toLowerCase())
      if (!haystack.some((value) => value.includes(query))) return false
    }
    return true
  })
}

export function buildOperationsSummaryModel({
  entries = [],
  registrations = [],
  event = {},
  filters = { type: 'all', category: '', status: 'all', search: '' },
} = {}) {
  const filteredEntries = filterOperationsEntries(entries, filters)
  return {
    filteredEntries,
    filteredTotals: buildOperationsTotals(filteredEntries),
    filteredCounts: buildOperationsEntryCounts(filteredEntries),
    filteredControl: buildOperationsControlSummary(filteredEntries),
    operationsTotals: buildOperationsTotals(entries),
    operationsSettlement: buildOperationsSettlementSummary(entries),
    operationsControl: buildOperationsControlSummary(entries),
    registrationFinanceSummary: buildFinanceSummary(registrations, event),
    possibleRegistrationOverlaps: findPossibleRegistrationPaymentOverlap(entries, registrations),
  }
}
