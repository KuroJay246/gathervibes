/* global console, process */
import { readFile } from 'node:fs/promises'

const app = await readFile('src/App.jsx', 'utf8')
const shell = await readFile('src/layout/AppShell.jsx', 'utf8')

const expectedRoutes = [
  '/login',
  '/dashboard',
  '/events',
  '/registrations',
  '/imports',
  '/payments',
  '/payments/reconciliation',
  '/tickets',
  '/check-in',
  '/scanner',
  '/operations',
  '/event-review',
  '/communications',
  '/settings',
  '/qa',
]

const missing = expectedRoutes.filter((route) => {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return !new RegExp(`path="${escaped}"`).test(app)
})

if (!/<Route index element=\{<Navigate to="\/dashboard" replace \/>}/.test(app)) {
  missing.push('/ index redirect to /dashboard')
}

const navigationLabels = [
  'Overview',
  'Events',
  'Guests & Registrations',
  'Payments',
  'Tickets',
  'Check-In',
  'Operations',
  'Message Builder',
  'Reports',
  'Import Center',
  'Settings',
  'System QA',
]

const missingLabels = navigationLabels.filter((label) => !shell.includes(label))

if (missing.length || missingLabels.length) {
  if (missing.length) console.error(`Missing routes: ${missing.join(', ')}`)
  if (missingLabels.length) console.error(`Missing navigation labels: ${missingLabels.join(', ')}`)
  process.exitCode = 1
} else {
  console.log(`Route inventory passed: ${expectedRoutes.length} routes and ${navigationLabels.length} navigation labels.`)
}
