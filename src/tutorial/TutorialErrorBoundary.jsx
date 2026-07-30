import { Component } from 'react'

export class TutorialErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error('[Tutorial] Overlay error:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed bottom-4 right-4 z-[140] max-w-sm rounded-xl border border-[#F2C98C] bg-[#FFF8EA] p-4 text-sm text-[#7A5818] shadow-xl">
          The guided tour closed because its overlay hit an error. The app is still usable.
          <button type="button" onClick={() => this.setState({ error: null })} className="mt-3 block rounded-lg border border-[#D7B26B] px-3 py-2 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
