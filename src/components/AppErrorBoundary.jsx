import { Component } from 'react'
import { captureAppError } from '../lib/monitoring'

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
    return {
      error: {
        message: typeof error?.message === 'string' ? error.message : 'Unknown render error',
        name: typeof error?.name === 'string' ? error.name : 'Error',
      },
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
    const buildCommit = import.meta.env.VITE_BUILD_COMMIT || 'not configured'

    return [
      'Gather & Savor Hub loading error',
      `Time: ${this.state.timestamp || new Date().toISOString()}`,
      `Path: ${path}`,
      `Error: ${this.state.error?.name || 'Error'}`,
      `Message: ${this.state.error?.message || 'Unknown render error'}`,
      `Build commit: ${buildCommit}`,
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

  render() {
    if (this.state.hasError) {
      const details = this.diagnosticDetails()

      return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F2] px-4 py-10 text-[#2B1723]">
          <section className="w-full max-w-2xl rounded-2xl border border-[#EEDFD6] bg-white p-6 shadow-[0_18px_48px_rgba(43,23,35,0.08)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B76E79]">Gather & Savor Hub</p>
            <h1 className="mt-3 font-serif text-2xl">Something went wrong loading Gather & Savor Hub.</h1>
            <p className="mt-3 text-sm leading-6 text-[#7B665C]">
              Refresh the page first. If this account still gets stuck, try an Incognito or Private window, then clear
              site data for gathervibeshub.web.app and sign in again.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl bg-[#2B1723] px-4 py-2 text-sm font-bold text-white"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={this.copyDetails}
                className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-sm font-bold text-[#2B1723]"
              >
                {this.state.detailsCopied ? 'Details copied' : 'Copy technical details'}
              </button>
            </div>
            <details className="mt-5 rounded-xl border border-[#EFE2DA] bg-[#FFF8F2] p-4">
              <summary className="cursor-pointer text-sm font-bold text-[#2B1723]">Show technical details</summary>
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
