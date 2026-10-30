import { reportFailure } from '../diagnostics/reporting.js';
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { getErrorBoundaryFallback } from './errorBoundaryFallback.js';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    reportFailure(error, 'react.render');
    console.error(error);
  }

  render() {
    if (this.state.error) {
      const fallback = getErrorBoundaryFallback(this.state.error);
      return (
        <section className="detail-surface error-boundary" role="alert">
          <AlertTriangle size={22} />
          <div>
            <h2>{fallback.title}</h2>
            <p>{fallback.message}</p>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
