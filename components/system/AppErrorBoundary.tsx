'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
          <div className="rounded-2xl border border-rose-700 bg-rose-950/20 p-6 text-center">
            <p className="mb-3">خطایی رخ داد.</p>
            <button className="rounded bg-rose-700 px-3 py-2" onClick={() => window.location.reload()}>
              بارگذاری مجدد
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
