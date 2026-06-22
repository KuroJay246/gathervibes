import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppShell } from './layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { EventsPage } from './pages/EventsPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PhasePage } from './pages/PhasePage'
import { SettingsPage } from './pages/SettingsPage'
import { QaPage } from './pages/QaPage'

import { RegistrationsPage } from './pages/RegistrationsPage'
import { ImportsPage } from './pages/ImportsPage'
import { TicketsPage } from './pages/TicketsPage'
import { CheckInPage } from './pages/CheckInPage'

const futureRoutes = [
  { path: 'communications', title: 'Communication Center', phase: 'Phase 6', description: 'Filter guest lists and prepare copy-ready messages.' },
  { path: 'ai-writing', title: 'AI Writing Assistant', phase: 'Phase 7', description: 'Create editable writing drafts for admin review.' },
]

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/registrations" element={<RegistrationsPage />} />
          <Route path="/imports" element={<ImportsPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/check-in" element={<CheckInPage />} />
          <Route path="/qa" element={<QaPage />} />
          {futureRoutes.map((route) => (
            <Route
              key={route.path}
              path={`/${route.path}`}
              element={<PhasePage title={route.title} phase={route.phase} description={route.description} />}
            />
          ))}
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
