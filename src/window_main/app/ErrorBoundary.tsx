import React, { ReactNode } from "react";

interface ErrorState {
  error: any;
  errorInfo: any;
}

export default class ErrorBoundary extends React.Component<{}, ErrorState> {
  constructor(props: {}) {
    super(props);
    this.state = { error: null, errorInfo: null } as ErrorState;
  }

  componentDidCatch(error: any, errorInfo: any): void {
    // Catch errors in any components below and re-render with error message
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    // You can also log error messages to an error reporting service here
  }

  render(): ReactNode {
    if (this.state.errorInfo) {
      // Error path
      return (
        <div>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: "pre-wrap" }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    // Normally, just render children
    return this.props.children;
  }
}
