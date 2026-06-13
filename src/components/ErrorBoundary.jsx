import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Cinzel, serif' }}>
          <h2 style={{ color: '#8b1a1a', marginBottom: '1rem' }}>Something went wrong</h2>
          <p style={{ marginBottom: '1rem', color: '#3d2b0a' }}>{this.state.error?.message}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
