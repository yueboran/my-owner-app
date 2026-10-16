import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局通用 React 错误边界组件
 * 捕获子组件渲染生命周期中的异常，防止整个应用卸载或全白屏
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('【ErrorBoundary 捕获到运行时异常】:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[460px] p-8 text-center bg-white/80 backdrop-blur-md rounded-2xl border border-rose-100 shadow-sm m-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4 shadow-inner">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            {this.props.fallbackTitle || '页面加载遇到一点小意外'}
          </h2>
          <p className="text-sm text-slate-500 max-w-md mb-4 leading-relaxed">
            {this.state.error?.message || '组件在渲染过程中捕获到异常，已为您隔离错误，不影响其他功能使用。'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <RotateCcw size={15} />
            <span>刷新恢复</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
