import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppShell } from './layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { EventsPage } from './pages/EventsPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PhasePage } from './pages/PhasePage'
import { SettingsPage } from './pages/SettingsPage'

const futureRoutes = [
  { path: 'registrations', title: 'Registrations', phase: 'Phase 3', description: 'Import and manage guest registrations.' },
  { path: 'tickets', title: 'Tickets', phase: 'Phase 4', description: 'Assign and track externally created ticket codes.' },
  { path: 'check-in', title: 'Check-In', phase: 'Phase 5', description: 'Run fast, reliable event-day admissions.' },
  { path: 'imports', title: 'Sheets Import', phase: 'Phase 3', description: 'Preview and safely import Google Forms CSV data.' },
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
