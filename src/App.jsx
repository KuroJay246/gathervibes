import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { LoadingScreen } from './components/LoadingScreen'
import { AssignedEventGate } from './components/AssignedEventGate'
import { AppShell } from './layout/AppShell'

function lazyPage(loader, exportName) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] })))
}

const DashboardPage = lazyPage(() => import('./pages/DashboardPage'), 'DashboardPage')
const EventsPage = lazyPage(() => import('./pages/EventsPage'), 'EventsPage')
const LoginPage = lazyPage(() => import('./pages/LoginPage'), 'LoginPage')
const NotFoundPage = lazyPage(() => import('./pages/NotFoundPage'), 'NotFoundPage')
const SettingsPage = lazyPage(() => import('./pages/SettingsPage'), 'SettingsPage')
const QaPage = lazyPage(() => import('./pages/QaPage'), 'QaPage')
const RegistrationsPage = lazyPage(() => import('./pages/RegistrationsPage'), 'RegistrationsPage')
const ImportsPage = lazyPage(() => import('./pages/ImportsPage'), 'ImportsPage')
const TicketsPage = lazyPage(() => import('./pages/TicketsPage'), 'TicketsPage')
const CheckInPage = lazyPage(() => import('./pages/CheckInPage'), 'CheckInPage')
const CommunicationsPage = lazyPage(() => import('./pages/CommunicationsPage'), 'CommunicationsPage')
const OperationsPage = lazyPage(() => import('./pages/OperationsPage'), 'OperationsPage')
const PaymentsPage = lazyPage(() => import('./pages/PaymentsPage'), 'PaymentsPage')
const PaymentReconciliationPage = lazyPage(() => import('./pages/PaymentReconciliationPage'), 'PaymentReconciliationPage')
const ScannerPage = lazyPage(() => import('./pages/ScannerPage'), 'ScannerPage')
const EventReviewPage = lazyPage(() => import('./pages/EventReviewPage'), 'EventReviewPage')

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/security" element={<Navigate to="/settings" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/scanner" element={<AssignedEventGate purpose="Scanner" autoSelectSingle><ScannerPage /></AssignedEventGate>} />
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/registrations" element={<RegistrationsPage />} />
            <Route path="/payments" element={<AssignedEventGate purpose="Payments"><PaymentsPage /></AssignedEventGate>} />
            <Route path="/payments/reconciliation" element={<PaymentReconciliationPage />} />
            <Route path="/imports" element={<ImportsPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/check-in" element={<AssignedEventGate purpose="Check-In"><CheckInPage /></AssignedEventGate>} />
            <Route path="/operations" element={<AssignedEventGate purpose="Operations"><OperationsPage /></AssignedEventGate>} />
            <Route path="/event-review" element={<EventReviewPage />} />
            <Route path="/qa" element={<QaPage />} />
            <Route path="/communications" element={<CommunicationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
