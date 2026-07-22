export const CPB_EVENT_ID = 'zhaPxi31cpqLAW0cuS20'

export const EVIDENCE_CLASSES = [
  'Directly Verified',
  'Amount Inferred',
  'Organizer Reported',
  'Confirmed In-Kind',
  'Organizer-Reported In-Kind',
  'Unverified / Outstanding',
  'Historical / Excluded',
  'Control Exception',
  'Needs External Evidence',
]

export const CPB_FINANCIAL_EVIDENCE_AUDIT = {
  eventId: CPB_EVENT_ID,
  auditStatus: 'Qualified / Incomplete Reconciliation',
  auditDate: 'July 21, 2026',
  finalProfitStatus: 'Not Yet Determinable',
  ticketIncome: {
    directlyVerifiedTickets: 44,
    directlyVerifiedAmount: 4115,
    inferredTickets: 13,
    inferredAmount: 1300,
    gmailSupportedTickets: 57,
    documentSupportedTickets: 57,
    maximumGmailSupportedValue: 5415,
    maximumDocumentSupportedValue: 5415,
    appPaymentsReceived: 5420,
    documentaryToAppVariance: 5,
  },
  attendance: {
    appRegistrations: 71,
    appGuests: 71,
    approximateAttendance: 70,
    gmailSupportedTicketSpaces: 57,
    documentSupportedTicketSpaces: 57,
    attendanceToGmailGap: 13,
    attendanceEvidenceGap: 13,
    appRegistrationToAttendanceDifference: 1,
    systemCheckInNote: 'Approximate historical attendance is not the same as a recorded system check-in.',
  },
  sponsorship: [
    {
      sponsor: 'Roberts Manufacturing',
      type: 'In-kind support',
      quantity: 'two cases',
      item: '1 kg coconut spread',
      evidenceClass: 'Confirmed In-Kind',
      cashReceived: 0,
      estimatedValue: null,
    },
    {
      sponsor: 'Bajan Pure/NPURE',
      type: 'In-kind support',
      quantity: 'five cases',
      item: '355 ml bottled water',
      evidenceClass: 'Confirmed In-Kind',
      cashReceived: 0,
      estimatedValue: null,
    },
    {
      sponsor: 'Massey Distributions',
      type: 'In-kind support',
      quantity: 'unknown',
      item: 'coffee/cappuccino support',
      evidenceClass: 'Organizer-Reported In-Kind',
      cashReceived: 0,
      estimatedValue: null,
    },
  ],
  operations: {
    venuePaid: 1227.88,
    venueEvidenceClass: 'Directly Verified',
    bakerGrossObligation: 2275,
    bakerPaidOrganizerReported: 1225,
    bakerOutstandingOrganizerReported: 1050,
    bakerDirectPaid: 175,
    bakerDirectOutstanding: 150,
    bakerVariance: 25,
    cakeBoxesPrinting: 175,
    cashSponsorshipVerified: 0,
  },
  correctiveActions: [
    'Obtain complete CIBC statement.',
    'Export complete 1stPay report.',
    'Reconcile every booking to one payment reference.',
    'Match all attendees to payment, complimentary, sponsor, media, staff or baker allocation.',
    'Obtain final payment acknowledgement from each baker.',
    'Resolve BBD $25 baker variance.',
    'Confirm youth baker settlement.',
    'Obtain missing invoices and receipts.',
    'Obtain sponsor values.',
    'Retain outside-food approval.',
    'Retain music-licence evidence.',
    'Prepare final income and expenditure statement.',
    'Do not declare final profit until variances are resolved.',
  ],
}

export function getEventFinancialEvidenceAudit(eventId) {
  return eventId === CPB_EVENT_ID ? CPB_FINANCIAL_EVIDENCE_AUDIT : null
}

export function countEvidenceClasses(audit = null) {
  if (!audit) return []
  return [
    ['Directly Verified', audit.ticketIncome.directlyVerifiedAmount],
    ['Amount Inferred', audit.ticketIncome.inferredAmount],
    ['Organizer Reported', audit.operations.bakerPaidOrganizerReported],
    ['Confirmed In-Kind', audit.sponsorship.filter((item) => item.evidenceClass === 'Confirmed In-Kind').length],
    ['Organizer-Reported In-Kind', audit.sponsorship.filter((item) => item.evidenceClass === 'Organizer-Reported In-Kind').length],
    ['Unverified / Outstanding', audit.operations.cakeBoxesPrinting],
    ['Needs External Evidence', audit.correctiveActions.length],
  ]
}
