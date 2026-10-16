import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'purple' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-md whitespace-nowrap select-none';

  const variantStyles: Record<string, string> = {
    brand: 'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]',
    success: 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]',
    warning: 'bg-[#fffbeb] text-[#92400e] border border-[#fde68a]',
    danger: 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]',
    purple: 'bg-[#f5f3ff] text-[#5b21b6] border border-[#ddd6fe]',
    neutral: 'bg-[#f8fafc] text-[#475569] border border-[#e2e8f0]',
    outline: 'bg-transparent text-[#64748b] border border-[#cbd5e1]',
  };

  const dotColorStyles: Record<string, string> = {
    brand: 'bg-[#2b5aed]',
    success: 'bg-[#16a34a]',
    warning: 'bg-[#d97706]',
    danger: 'bg-[#dc2626]',
    purple: 'bg-[#7c3aed]',
    neutral: 'bg-[#94a3b8]',
    outline: 'bg-[#64748b]',
  };

  const sizeStyles: Record<string, string> = {
    sm: 'text-[11px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5',
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`} {...props}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColorStyles[variant]}`} />}
      {children}
    </span>
  );
};
