import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary:${this.props.label || 'unknown'}]`, error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-aether-bg p-4">
          <div className="text-2xl text-amber-500">⚠</div>
          <p className="font-display text-sm font-semibold text-white">
            {this.props.label || 'Component'} encountered an error
          </p>
          <p className="max-w-md text-center font-mono text-xs text-aether-muted">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 rounded-md border border-aether-border bg-aether-surface px-4 py-1.5 font-body text-xs text-aether-text transition hover:border-aether-violet"
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
