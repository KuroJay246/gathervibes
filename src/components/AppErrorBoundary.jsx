import { Component } from 'react'
import { auth, firebaseProjectId, isFirebaseConfigured } from '../lib/firebase'
import { captureAppError } from '../lib/monitoring'
import { CACHE_BUST_RELOAD_KEY, CACHE_BUST_RELOAD_WINDOW_MS, appErrorContentForCategory, categorizeAppError } from '../utils/appErrorDiagnostics'

const STALE_DEPLOYMENT_ERROR_EXAMPLE = 'Failed to fetch dynamically imported module'
const STALE_DEPLOYMENT_ORGANIZER_COPY = 'The browser may be holding an older page that references a JavaScript file replaced during deployment.'

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      detailsCopied: false,
      error: null,
      hasError: false,
      timestamp: null,
    }
  }

  static getDerivedStateFromError(error) {
    const category = categorizeAppError(error)
    return {
      error: {
        code: typeof error?.code === 'string' ? error.code : '',
        message: typeof error?.message === 'string' ? error.message : 'Unknown render error',
        name: typeof error?.name === 'string' ? error.name : 'Error',
      },
      errorCategory: category,
      hasError: true,
      timestamp: new Date().toISOString(),
    }
  }

  componentDidCatch(error, errorInfo) {
    captureAppError(error, {
      componentStack: errorInfo?.componentStack,
    })
    console.error('Gather & Savor Hub render error', { error, errorInfo })
  }

  diagnosticDetails() {
    const path = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : 'unknown'
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    const online = typeof navigator !== 'undefined' ? navigator.onLine : 'unknown'
    const buildCommit = import.meta.env.VITE_BUILD_COMMIT || 'not configured'
    const authUser = auth?.currentUser
    const authState = authUser
      ? `Signed in as ${authUser.email || 'email unavailable'} (${authUser.emailVerified ? 'email verified' : 'email not verified'})`
      : 'No current Firebase Auth user'

    return [
      'Gather & Savor Hub loading error',
      `Time: ${this.state.timestamp || new Date().toISOString()}`,
      `Error category: ${this.state.errorCategory || categorizeAppError(this.state.error)}`,
      `Path: ${path}`,
      `Online: ${online}`,
      `Firebase configured: ${isFirebaseConfigured ? 'yes' : 'no'}`,
      `Firebase project: ${firebaseProjectId || 'not configured'}`,
      `Authentication state: ${authState}`,
      `Error: ${this.state.error?.name || 'Error'}`,
      `Error code: ${this.state.error?.code || 'not provided'}`,
      `Message: ${this.state.error?.message || 'Unknown render error'}`,
      `Build commit: ${buildCommit}`,
      `Mode: ${import.meta.env.MODE}`,
      `Browser: ${userAgent}`,
    ].join('\n')
  }

  copyDetails = async () => {
    const details = this.diagnosticDetails()

    try {
      await navigator.clipboard.writeText(details)
      this.setState({ detailsCopied: true })
    } catch {
      this.setState({ detailsCopied: false })
    }
  }

  tryAgain = () => {
    window.location.reload()
  }

  reloadLatestVersion = () => {
    const now = Date.now()
    const previous = Number(window.sessionStorage?.getItem(CACHE_BUST_RELOAD_KEY) || 0)
    const category = this.state.errorCategory || categorizeAppError(this.state.error)
    if (category === 'stale-deployment' && now - previous < CACHE_BUST_RELOAD_WINDOW_MS) return
    window.sessionStorage?.setItem(CACHE_BUST_RELOAD_KEY, String(now))
    const url = new URL(window.location.href)
    url.searchParams.set('reloadLatest', String(now))
    window.location.replace(url.toString())
  }

  checkConnection = () => {
    if (typeof window !== 'undefined') {
      window.open('https://gathervibeshub.web.app/__/firebase/init.json', '_blank', 'noopener,noreferrer')
    }
  }

  signInAgain = () => {
    const target = encodeURIComponent(`${window.location.pathname}${window.location.search}`)
    window.location.assign(`/login?returnUrl=${target}`)
  }

  render() {
    if (this.state.hasError) {
      const details = this.diagnosticDetails()
      const category = this.state.errorCategory || categorizeAppError(this.state.error)
      const content = appErrorContentForCategory(category)

      return (
        <main className="flex min-h-dvh items-center justify-center bg-[#FFF8F2] px-4 py-10 text-[#2B1723]">
          <section className="w-full max-w-2xl rounded-2xl border border-[#EEDFD6] bg-white p-6 shadow-[0_18px_48px_rgba(43,23,35,0.08)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Gather & Savor Hub</p>
            <h1 className="mt-3 font-serif text-2xl">{content.title}</h1>
            <p className="mt-3 text-sm leading-6 text-[#7B665C]">
              {content.body}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={this.tryAgain}
                className="rounded-xl bg-[#2B1723] px-4 py-2 text-sm font-bold text-white"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.reloadLatestVersion}
                className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-sm font-bold text-[#2B1723]"
              >
                Reload Latest Version
              </button>
              <button
                type="button"
                onClick={this.checkConnection}
                className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-sm font-bold text-[#2B1723]"
              >
                Check Connection
              </button>
              <button
                type="button"
                onClick={this.signInAgain}
                className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-sm font-bold text-[#2B1723]"
              >
                Sign In Again
              </button>
              <button
                type="button"
                onClick={this.copyDetails}
                className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-sm font-bold text-[#2B1723]"
              >
                {this.state.detailsCopied ? 'Details copied' : 'Copy Technical Details'}
              </button>
            </div>
            <details className="mt-5 rounded-xl border border-[#EFE2DA] bg-[#FFF8F2] p-4">
              <summary className="cursor-pointer text-sm font-bold text-[#2B1723]">Show Technical Details</summary>
              <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-[#6B564C]">
                {details}
              </pre>
            </details>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
