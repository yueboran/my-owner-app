import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  if (!message) return null;

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />,
    error: <AlertCircle className="w-4 h-4 text-[#dc2626]" />,
    info: <Info className="w-4 h-4 text-[#2563eb]" />,
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#0f172a] text-white text-xs font-medium rounded-xl shadow-xl border border-slate-800 animate-in slide-in-from-bottom-5 duration-200">
      {iconMap[type]}
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};
