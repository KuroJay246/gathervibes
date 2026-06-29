import { Component } from 'react'

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Gather & Savor Hub render error', { error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F2] px-4 py-10 text-[#2B1723]">
          <section className="w-full max-w-lg rounded-2xl border border-[#EEDFD6] bg-white p-6 shadow-[0_18px_48px_rgba(43,23,35,0.08)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B76E79]">Gather & Savor Hub</p>
            <h1 className="mt-3 font-serif text-2xl">Something went wrong loading Gather & Savor Hub.</h1>
            <p className="mt-3 text-sm leading-6 text-[#7B665C]">
              Refresh, try an incognito window, or contact the organizer.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-[#2B1723] px-4 py-2 text-sm font-bold text-white"
            >
              Refresh
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
