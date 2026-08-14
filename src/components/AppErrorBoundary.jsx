import { Component } from 'react'
import { auth, firebaseProjectId, isFirebaseConfigured } from '../lib/firebase'
import { captureAppError } from '../lib/monitoring'
import { CACHE_BUST_RELOAD_KEY, CACHE_BUST_RELOAD_WINDOW_MS, appErrorContentForCategory, categorizeAppError, failedFileFromError } from '../utils/appErrorDiagnostics'

// Support anchor for stale deployment diagnostics: Failed to fetch dynamically imported module; browser may be holding an older page.
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
    const category = this.state.errorCategory || categorizeAppError(this.state.error)
    const content = appErrorContentForCategory(category)

    return [
      'Simple explanation',
      content.supportExplanation,
      '',
      'Technical information',
      `Error category: ${category}`,
      `Page/path: ${path}`,
      `Time: ${this.state.timestamp || new Date().toISOString()}`,
      `Online/offline state: ${online ? 'online' : 'offline'}`,
      `Sign-in state: ${authState}`,
      `Firebase project: ${firebaseProjectId || 'not configured'}`,
      `Firebase configured: ${isFirebaseConfigured ? 'yes' : 'no'}`,
      `Error type: ${this.state.error?.name || 'Error'}`,
      `Error code: ${this.state.error?.code || 'not provided'}`,
      `Original error message: ${this.state.error?.message || 'Unknown render error'}`,
      `Build commit/version: ${buildCommit}`,
      `Failed file or request: ${failedFileFromError(this.state.error)}`,
      `Browser information: ${userAgent}`,
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

  returnToDashboard = () => {
    window.location.assign('/dashboard')
  }

  actionConfig() {
    return {
      'try-again': ['Try Again', this.tryAgain, 'primary'],
      'reload-latest': ['Reload Latest Version', this.reloadLatestVersion, 'primary'],
      'check-connection': ['Check Connection', this.checkConnection, 'secondary'],
      'sign-in': ['Sign In Again', this.signInAgain, 'primary'],
      dashboard: ['Return to Dashboard', this.returnToDashboard, 'primary'],
    }
  }

  render() {
    if (this.state.hasError) {
      const details = this.diagnosticDetails()
      const category = this.state.errorCategory || categorizeAppError(this.state.error)
      const content = appErrorContentForCategory(category)
      const actions = content.actions || ['try-again', 'dashboard']
      const actionConfig = this.actionConfig()

      return (
        <main className="flex min-h-dvh items-center justify-center bg-[#FFF8F2] px-4 py-10 text-[#2B1723]">
          <section className="w-full max-w-2xl rounded-2xl border border-[#EEDFD6] bg-white p-6 shadow-[0_18px_48px_rgba(43,23,35,0.08)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Gather & Savor Hub</p>
            <h1 className="mt-3 font-serif text-2xl">{content.title}</h1>
            <p className="mt-3 text-sm leading-6 text-[#7B665C]">
              {content.body}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {actions.map((action) => {
                const [label, onClick, tone] = actionConfig[action] || actionConfig['try-again']
                return (
                  <button
                    key={action}
                    type="button"
                    onClick={onClick}
                    className={tone === 'primary'
                      ? 'rounded-xl bg-[#2B1723] px-4 py-2 text-sm font-bold text-white'
                      : 'rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-sm font-bold text-[#2B1723]'}
                  >
                    {label}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={this.copyDetails}
                className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-sm font-bold text-[#2B1723]"
              >
                {this.state.detailsCopied ? 'Support details copied' : 'Copy Support Details'}
              </button>
            </div>
            <details className="mt-5 rounded-xl border border-[#EFE2DA] bg-[#FFF8F2] p-4">
              <summary className="cursor-pointer text-sm font-bold text-[#2B1723]">Details for support</summary>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[#5F493F]">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A3F4B]">Simple explanation</h2>
                  <p className="mt-1">{content.supportExplanation}</p>
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A3F4B]">Technical information</h2>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs leading-5 text-[#6B564C]">
                    {details}
                  </pre>
                </div>
              </div>
            </details>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
