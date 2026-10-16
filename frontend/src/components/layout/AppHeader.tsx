/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 现代浅色高透玻璃拟态头部组件 (Light Glassmorphism Header)
 */

import React, { useState } from 'react';
import { Search, User, ChevronDown, LayoutGrid, BookOpen, LogOut } from 'lucide-react';
import type { UserProfile } from '../../hooks/useAuth';

interface AppHeaderProps {
  activeTabTitle: string;
  currentUser: UserProfile | null;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  onOpenSearch: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTabTitle,
  currentUser,
  onNavigate,
  onLogout,
  onOpenSearch,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-14 px-6 bg-white/90 backdrop-blur-xl border-b border-[#E5E7EB] shadow-xs flex items-center justify-between sticky top-0 z-40 select-none">
      {/* 左侧面包屑与当前页面标识 */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#64748b]">
        <span>华鲲元启</span>
        <span className="text-[#94a3b8]">/</span>
        <span className="text-[#0f172a] font-semibold">{activeTabTitle}</span>
      </div>

      {/* 右侧操作区：玻璃拟态搜索框与个人信息卡片 */}
      <div className="flex items-center gap-3">
        {/* 全局快捷搜索玻璃药丸 */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="h-8 px-3 rounded-full bg-white/60 border border-white/80 hover:bg-white/85 hover:border-white flex items-center gap-2 text-xs text-[#64748b] shadow-xs backdrop-blur-md transition-all cursor-pointer"
        >
          <Search size={14} className="text-[#64748b]" />
          <span>快捷搜索或命令...</span>
          <kbd className="text-[10px] font-mono bg-white/80 px-1.5 py-0.5 rounded border border-white/90 text-[#64748b] shadow-xs">
            ⌘K
          </kbd>
        </button>

        {/* 用户头像与下拉菜单 */}
        <div className="relative">
          <div
            className="flex items-center gap-2 p-1.5 px-2.5 rounded-full bg-white/50 border border-white/80 hover:bg-white/80 backdrop-blur-md shadow-xs cursor-pointer transition-all"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt="Avatar"
                className="w-6 h-6 rounded-full object-cover border border-white/80 shadow-xs"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <User size={13} />
              </div>
            )}
            <span className="text-xs font-medium text-[#1e293b]">
              {currentUser?.username || currentUser?.email?.split('@')[0] || 'yueboran'}
            </span>
            <ChevronDown size={13} className="text-[#94a3b8]" />
          </div>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-48 bg-white/85 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/90 p-1.5 flex flex-col gap-0.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              onClick={() => setMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => onNavigate('marketplace')}
                className="w-full px-3 py-2 text-left text-xs font-medium text-[#334155] hover:bg-white/80 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LayoutGrid size={14} className="text-[#6366f1]" /> 应用广场
              </button>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="w-full px-3 py-2 text-left text-xs font-medium text-[#334155] hover:bg-white/80 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <User size={14} className="text-[#8b5cf6]" /> 个人中心
              </button>

              <div className="h-px bg-slate-200/60 my-1" />

              <button
                type="button"
                onClick={onLogout}
                className="w-full px-3 py-2 text-left text-xs font-medium text-[#ef4444] hover:bg-red-50/80 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut size={14} /> 退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
