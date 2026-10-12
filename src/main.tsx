import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl">
              ⚠️
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Exam Intelligence Assistant
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                An unexpected error occurred while loading this view.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 max-h-36 overflow-auto">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex space-x-2 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-xs"
              >
                Reload & Reset Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
