import React from 'react';

export interface FloatingNavItem {
  name: string;
  link?: string;
  id?: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface FloatingNavProps {
  navItems: FloatingNavItem[];
  activeId?: string;
  onSelect?: (item: FloatingNavItem) => void;
  className?: string;
  rightContent?: React.ReactNode;
}

/**
 * FloatingNav 胶囊浮动导航栏组件
 * 参考 Aceternity UI 规范，支持毛玻璃拟态、极简圆角、选中态动效与插槽扩展
 */
export function FloatingNav({
  navItems,
  activeId,
  onSelect,
  className = '',
  rightContent,
}: FloatingNavProps) {
  return (
    <div
      className={`w-full flex items-center justify-between gap-3 p-1.5 rounded-full border border-neutral-200/90 dark:border-white/[0.15] bg-white/85 dark:bg-black/85 backdrop-blur-md shadow-[0px_2px_12px_rgba(0,0,0,0.06),0px_1px_2px_rgba(0,0,0,0.04)] transition-all ${className}`}
    >
      {/* 左侧/中间：胶囊导航项组 */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-refined max-w-full py-0.5 px-1">
        {navItems.map((item, idx) => {
          const isSelected = activeId ? activeId === (item.id || item.name) : idx === 0;

          return (
            <button
              key={item.id || item.name || idx}
              type="button"
              onClick={() => onSelect && onSelect(item)}
              className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none ${
                isSelected
                  ? 'bg-[#171A21] text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 hover:bg-neutral-100/80 dark:hover:bg-white/10'
              }`}
            >
              {item.icon && (
                <span
                  className={`shrink-0 transition-colors ${
                    isSelected ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {item.icon}
                </span>
              )}
              <span>{item.name}</span>

              {item.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-colors ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 右侧扩展区（如搜索框、操作按钮） */}
      {rightContent && (
        <div className="shrink-0 pl-1 pr-1 flex items-center">
          {rightContent}
        </div>
      )}
    </div>
  );
}
