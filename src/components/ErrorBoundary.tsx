import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0d14] text-white flex items-center justify-center p-4 dir-rtl" dir="rtl">
          <div className="max-w-md w-full bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">حدث خطأ غير متوقع</h2>
            <p className="text-xs text-white/60 leading-relaxed">
              تم رصد خطأ أثناء تشغيل هذه الواجهة. يمكنك إعادة تحميل الصفحة للمتابعة.
            </p>
            {this.state.error?.message && (
              <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-left font-mono text-[11px] text-red-300 break-all max-h-24 overflow-y-auto" dir="ltr">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تحميل التطبيق</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
