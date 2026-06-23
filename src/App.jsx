import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppShell } from './layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { EventsPage } from './pages/EventsPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SettingsPage } from './pages/SettingsPage'
import { QaPage } from './pages/QaPage'

import { RegistrationsPage } from './pages/RegistrationsPage'
import { ImportsPage } from './pages/ImportsPage'
import { TicketsPage } from './pages/TicketsPage'
import { CheckInPage } from './pages/CheckInPage'
import { CommunicationsPage } from './pages/CommunicationsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/security" element={<Navigate to="/settings" replace />} />
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
          <Route path="/communications" element={<CommunicationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
