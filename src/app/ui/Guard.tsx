import { Component, type ReactNode } from 'react'

// Error boundary around every screen, sheet and overlay: a crash in one logs `[slack-mobile] <name> crashed` and draws
// a small notice in its place, and the rest of the app keeps running.

interface Props {
  name: string
  children: ReactNode
  fallback?: ReactNode
}

export class Guard extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error(`[slack-mobile] ${this.props.name} crashed:`, error)
    ;(window as unknown as { __crashes?: string[] }).__crashes?.push(`${this.props.name}: ${error.message}`)
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback !== undefined) return this.props.fallback
    return (
      <div className="ios-guard" role="alert">
        <strong>{this.props.name} crashed</strong>
        <span>{this.state.error.message}</span>
        <button type="button" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    )
  }
}
