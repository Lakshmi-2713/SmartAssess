import { Component } from "react";

/**
 * Catches render-time crashes so a single bad component shows a recoverable
 * panel instead of a blank white page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Render error:", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleHardReset = () => {
    // Corrupt persisted state is the usual cause; clearing it is the escape hatch.
    try {
      localStorage.clear();
    } catch {
      /* storage unavailable */
    }
    window.location.assign("/");
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="app-error-screen">
        <div className="app-error-card">
          <div className="app-error-icon" aria-hidden="true">
            !
          </div>
          <h1>Something broke on this screen</h1>
          <p>
            The page hit an unexpected error. You can try rendering it again, or
            reset local data if the problem keeps coming back.
          </p>
          <pre className="app-error-detail">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div className="app-error-actions">
            <button className="btn btn-primary" onClick={this.handleReset}>
              Try again
            </button>
            <button className="btn btn-secondary" onClick={this.handleHardReset}>
              Reset local data
            </button>
          </div>
        </div>
      </div>
    );
  }
}
