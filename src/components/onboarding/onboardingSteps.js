export const walkthroughSteps = [
  {
    id: 'working-event',
    title: 'Working Event',
    content: 'The app works with one selected event at a time. This selected event is called the Working Event. Most information shown belongs to that selected event. You can switch events when necessary.',
    example: '',
    route: '/dashboard'
  },
  {
    id: 'overview',
    title: 'Overview',
    content: 'Overview is the main event summary. It shows important numbers, attention items, progress, and quick actions to help identify what needs to be done next.',
    example: '',
    route: '/dashboard'
  },
  {
    id: 'events',
    title: 'Events',
    content: 'Create and plan a new event. Enter date, time, venue, capacity, ticket prices, and planning details. You can switch between active and completed events, which remain available for reference.',
    example: '',
    route: '/events'
  },
  {
    id: 'guests',
    title: 'Guests & Registrations',
    content: 'Add the buyer or primary registration, along with individual guests or group members. You can edit registration information and review payment, ticket, and attendance status here.',
    example: '',
    route: '/registrations'
  },
  {
    id: 'payments',
    title: 'Payments',
    content: 'Record money received and review full, partial, complimentary, and outstanding registrations. Distinguish registration payments from event expenses, and use payment follow-up only for real unpaid balances.',
    example: '',
    route: '/payments'
  },
  {
    id: 'tickets',
    title: 'Tickets',
    content: 'Create and assign tickets, view ticket codes and QR codes, and see which registrations still need tickets. Review assigned and used tickets here.',
    example: '',
    route: '/tickets'
  },
  {
    id: 'check-in',
    title: 'Check-In and Scanner',
    content: 'Look up a guest or ticket, scan a QR code where supported, and record attendance on event day. Scanner access remains limited to the appropriate event.',
    example: '',
    route: '/check-in'
  },
  {
    id: 'operations',
    title: 'Operations',
    content: 'Record paid event expenses and track unpaid commitments. Manage bakers, vendors, suppliers, sponsors, and partners while keeping cash sponsorship and in-kind support separate.',
    example: '',
    route: '/operations'
  },
  {
    id: 'tasks',
    title: 'Tasks and Event Readiness',
    content: 'Add planning tasks, assign due dates and priorities, and mark tasks complete. Review whether the event is ready and use attention items to identify missing essentials.',
    example: '',
    route: '/dashboard' // Tasks/Readiness is on dashboard
  },
  {
    id: 'communications',
    title: 'Communications',
    content: 'Select an audience, prepare a message, preview it, and copy it for WhatsApp, email, or another service. Note that the app does not automatically send messages unless that feature currently exists.',
    example: '',
    route: '/communications'
  },
  {
    id: 'reports',
    title: 'Reports',
    content: 'Review registrations, guests, payments, tickets, attendance, event expenses, and commitments. Use reports for event closeout and reference.',
    example: '',
    route: '/event-review'
  },
  {
    id: 'imports',
    title: 'Import Center',
    content: 'Import information from pasted tables or supported files. Review the preview before confirming, and check carefully to prevent duplicate registrations.',
    example: '',
    route: '/imports'
  },
  {
    id: 'settings',
    title: 'Settings, Help, and System QA',
    content: 'Settings contains account and organizer options, and you can replay the welcome tour here. System QA displays technical health and is not required for normal daily planning. Contact Jaylan when a technical issue is unclear.',
    example: '',
    route: '/settings'
  }
]
