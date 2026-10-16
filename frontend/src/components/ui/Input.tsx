import React, { forwardRef, InputHTMLAttributes } from 'react';
import { X } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  onClear?: () => void;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, rightElement, onClear, error, value, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1">
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <span className="absolute left-3 text-[#94a3b8] flex items-center justify-center pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            value={value}
            className={`w-full bg-white border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] placeholder-[#94a3b8] transition-all duration-150 focus:outline-none focus:border-[#2b5aed] focus:ring-3 focus:ring-[#2b5aed]/10 disabled:bg-[#f8fafc] disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : 'pl-3.5'
            } ${rightElement || onClear ? 'pr-9' : 'pr-3.5'} py-2 h-9 ${
              error ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/10' : ''
            } ${className}`}
            {...props}
          />

          {onClear && value && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 text-[#94a3b8] hover:text-[#475569] p-0.5 rounded cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          )}

          {!onClear && rightElement && (
            <div className="absolute right-3 text-[#94a3b8] flex items-center">{rightElement}</div>
          )}
        </div>

        {error && <span className="text-xs text-[#ef4444] font-medium">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
