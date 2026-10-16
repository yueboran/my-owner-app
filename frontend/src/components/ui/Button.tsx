import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // 基础样式
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

    // 变体样式
    const variantStyles: Record<string, string> = {
      primary:
        'bg-[#2b5aed] hover:bg-[#1d4ed8] text-white shadow-sm hover:shadow active:scale-[0.98] focus-visible:ring-[#2b5aed]',
      gradient:
        'bg-gradient-to-r from-[#2b5aed] to-[#6345ed] hover:opacity-95 text-white shadow-md hover:shadow-lg active:scale-[0.98] focus-visible:ring-[#6345ed]',
      secondary:
        'bg-[#ffffff] hover:bg-[#f1f5f9] text-[#334155] border border-[#e2e8f0] shadow-xs active:scale-[0.98] focus-visible:ring-[#cbd5e1]',
      outline:
        'bg-transparent hover:bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1] active:scale-[0.98]',
      ghost:
        'bg-transparent hover:bg-[#f1f5f9] text-[#475569] hover:text-[#0f172a] active:scale-[0.98]',
      danger:
        'bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-sm active:scale-[0.98] focus-visible:ring-[#ef4444]',
    };

    // 尺寸样式
    const sizeStyles: Record<string, string> = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-3.5 py-2 gap-2 h-9',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-11',
      icon: 'h-9 w-9 p-0 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
