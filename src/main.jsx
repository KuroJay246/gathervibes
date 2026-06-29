import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { ActiveEventProvider } from './events/ActiveEventProvider'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ActiveEventProvider>
            <App />
          </ActiveEventProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}
