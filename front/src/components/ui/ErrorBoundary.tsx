import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Route-level error boundary: a crashing page shows a recoverable card instead of a
 * blank screen. Mounted around each layout's <Outlet/> (see AppLayout / PublicLayout).
 */
export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    // Visible in devtools; the API envelope stays untouched (no business data is logged).
    console.error('[jahez] route render failed:', error);
  }

  private retry = (): void => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6" role="alert">
        <div className="w-full max-w-md rounded-2xl border border-[#E6EAF0] bg-white p-6 text-center shadow-sm">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#FDECEF] text-[#E45B6A]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-base font-extrabold text-[#172033]">تعذّر عرض هذه الصفحة</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#667085]">
            حدث خطأ غير متوقع أثناء العرض. أعد تحميل الصفحة، وإن تكرر تواصل مع الدعم.
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#002E4A] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#002E4A]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            إعادة تحميل الصفحة
          </button>
        </div>
      </div>
    );
  }
}

