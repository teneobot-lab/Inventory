
import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Fixed: Inheriting from React.Component explicitly to ensure context for this.setState and this.props
export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleCopyError = () => {
    if (this.state.error) {
        navigator.clipboard.writeText(`${this.state.error.toString()}\n${this.state.errorInfo?.componentStack}`);
        alert("Error log copied to clipboard.");
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-scale-in">
            
            {/* Header */}
            <div className="bg-red-50 dark:bg-red-900/20 p-6 flex flex-col items-center justify-center border-b border-red-100 dark:border-red-900/30">
               <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <AlertTriangle size={32} className="text-red-600 dark:text-red-400" />
               </div>
               <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center">Terjadi Kesalahan Kritis</h2>
               <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
                 Sistem mengalami masalah yang tidak terduga saat merender halaman ini.
               </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                 <p className="text-xs font-mono text-red-600 dark:text-red-400 break-words max-h-32 overflow-y-auto">
                    {this.state.error?.toString()}
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                 <button 
                   onClick={this.handleReload}
                   className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
                 >
                    <RefreshCw size={18} /> Reload Halaman
                 </button>
                 <button 
                   onClick={this.handleCopyError}
                   className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-colors"
                 >
                    <Copy size={18} /> Salin Log
                 </button>
              </div>
              
              <div className="text-center pt-2">
                 <button onClick={this.handleGoHome} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline flex items-center justify-center gap-1 w-full">
                    <Home size={14}/> Kembali ke Awal
                 </button>
              </div>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
