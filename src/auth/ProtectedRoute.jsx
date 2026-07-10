import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { LoadingScreen } from '../components/LoadingScreen'
import { canViewRoute } from '../utils/accessRoles'

export function ProtectedRoute() {
  const { user, loading, access, defaultRoute, isAuthorized } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace state={{ from: location, accessDenied: true }} />
  }

  if (!canViewRoute(access, location.pathname)) {
    return <Navigate to={defaultRoute || '/dashboard'} replace />
  }

  return <Outlet />
}
