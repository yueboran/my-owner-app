/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 现代浅色通透玻璃拟态侧边栏组件 (Light Glassmorphism Sidebar)
 * 具备发光药丸胶囊选中态、14px标准字号、浅色微光升级卡片与晶莹磨砂质感
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  LayoutGrid,
  ListTodo,
  Workflow,
  BookmarkPlus,
  Compass,
  Bot,
  ChevronDown,
  Brain,
  PenLine,
  Wrench,
  Briefcase,
  Target,
  Boxes,
  Scroll,
  TrendingUp,
  Search,
  PanelLeftClose,
  PanelLeft,
  Zap,
  MapPin,
  Layout,
  Network,
  BookOpen,
} from 'lucide-react';
import type { UserProfile } from '../../hooks/useAuth';

export interface SubNavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface NavGroupItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isGroup?: boolean;
  children?: SubNavItem[];
}

// 侧边栏导航结构配置
export const NAV_ITEMS: NavGroupItem[] = [
  { key: 'marketplace', label: '应用广场', icon: LayoutGrid },
  { key: 'agent-chat', label: '对话智能体', icon: Bot },
  { key: 'free-canvas', label: '自由画布', icon: Layout },
  { key: 'explore', label: '知识图谱', icon: Network },
  { key: 'personal-knowledge', label: '个人知识库', icon: BookOpen },
  { key: 'todos', label: '事件跟踪', icon: Workflow },
  { key: 'prompt-skills', label: '提示词与工具Skill', icon: Sparkles },
  {
    key: 'apps',
    label: '应用合集',
    icon: Boxes,
    isGroup: true,
    children: [
      { key: 'footprint-map', label: '华夏足迹', icon: MapPin },
      { key: 'page-studio', label: '书页工坊', icon: BookOpen },
    ],
  },
  {
    key: 'tools',
    label: '常用工具',
    icon: Wrench,
    isGroup: true,
    children: [
      { key: 'personality-test', label: '性格测试', icon: Brain },
      { key: 'ai-navigation', label: 'AI导航', icon: Compass },
      { key: 'career-navigation', label: '求职导航', icon: Briefcase },
    ],
  },
];


interface AppSidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentUser?: UserProfile | null;
  onOpenSearch?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onNavigate,
  collapsed,
  onToggleCollapse,
  currentUser,
  onOpenSearch,
}) => {
  // 控制一级菜单展开状态（默认展开个人助理、应用合集与常用工具）
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    assistant: true,
    apps: true,
    tools: true,
  });

  // 当外部导航到子项时，自动展开对应的一级分组
  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      if (item.isGroup && item.children) {
        if (item.children.some((child) => child.key === activeTab)) {
          setExpandedGroups((prev) => ({ ...prev, [item.key]: true }));
        }
      }
    });
  }, [activeTab]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // 获取用户头像首字母展示（与截图左下方棕红底白字“ZZ”一致）
  const getAvatarInitials = () => {
    const name = currentUser?.username || currentUser?.email?.split('@')[0] || 'Zenilma Zr';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = currentUser?.username || currentUser?.email?.split('@')[0] || 'Zenilma Zr';

  return (
    <aside
      className={`app-sidebar ${
        collapsed ? 'collapsed' : ''
      } transition-all duration-200 border-r border-[#E5E7EB] bg-white text-[#171A21] flex flex-col justify-between select-none shrink-0 sticky top-0 h-screen z-40`}
      style={{
        width: collapsed ? '64px' : '260px',
      }}
    >
      {/* 顶部 Header：标题、搜索与侧边栏折叠按钮 */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-[#E5E7EB] shrink-0">
        {!collapsed ? (
          <>
            {/* 工作区下拉标题 */}
            <button
              type="button"
              onClick={() => onNavigate('marketplace')}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-white/80 border border-transparent hover:border-white/80 transition-all cursor-pointer text-[#0f172a]"
              title="切换工作区 / 应用广场"
            >
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] flex items-center justify-center text-white shadow-xs">
                <Sparkles size={12} />
              </div>
              <span className="font-semibold text-[15px] tracking-tight">璀璨星图</span>
              <ChevronDown size={14} className="text-[#94a3b8]" />
            </button>

            {/* 右侧快捷操作：搜索与折叠侧边栏 */}
            <div className="flex items-center gap-1">
              {onOpenSearch && (
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-[#0f172a] hover:bg-white/80 transition-all cursor-pointer border border-transparent hover:border-white/80"
                  title="全局搜索 (⌘K)"
                >
                  <Search size={17} />
                </button>
              )}
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-[#0f172a] hover:bg-white/80 transition-all cursor-pointer border border-transparent hover:border-white/80"
                title="收起侧边栏"
              >
                <PanelLeftClose size={17} />
              </button>
            </div>
          </>
        ) : (
          /* 折叠态顶部展开按钮 */
          <div className="w-full flex justify-center">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#64748b] hover:text-[#0f172a] hover:bg-white/80 transition-all cursor-pointer border border-transparent hover:border-white/80 shadow-xs"
              title="展开侧边栏"
            >
              <PanelLeft size={18} />
            </button>
          </div>
        )}
      </div>

      {/* 导航菜单列表（统一 14px 字号、18px 图标、浅色微光发光药丸激活态） */}
      <div className="p-2.5 flex-1 overflow-y-auto flex flex-col gap-1 overflow-x-hidden">
        {/* 顶部直达导航项 */}
        {NAV_ITEMS.filter((item) => !item.isGroup).map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.key ||
            (item.key === 'personal-knowledge' &&
              ['personal-knowledge', 'journal', 'knowledge-collector', 'biography', 'business-analysis'].includes(activeTab));

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              title={item.label}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-0' : 'justify-start px-3'
              } py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#EEF0FD] text-[#171A21] font-semibold relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#5146D8] before:rounded-r'
                  : 'text-[#4B5563] hover:bg-slate-100/70 hover:text-[#171A21] font-normal'
              }`}
            >
              <div
                className={`shrink-0 flex items-center justify-center ${
                  isActive ? 'text-[#5146D8]' : 'text-[#6B7280]'
                }`}
              >
                <Icon size={18} />
              </div>
              {!collapsed && (
                <span className="ml-3 truncate leading-5 text-[14px]">{item.label}</span>
              )}
            </button>
          );
        })}

        {/* 分组小标题与二级折叠菜单 */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1 text-xs text-[#9CA3AF] font-normal select-none">
            功能分类
          </div>
        )}

        {NAV_ITEMS.filter((item) => item.isGroup).map((item) => {
          const Icon = item.icon;
          const isChildActive = item.children?.some((c) => c.key === activeTab) ?? false;
          const isExpanded = expandedGroups[item.key] ?? false;

          return (
            <div key={item.key} className="flex flex-col gap-0.5 my-0.5">
              {/* 分组展开/折叠主按钮 */}
              <button
                type="button"
                onClick={() => {
                  if (collapsed) {
                    onToggleCollapse();
                    setExpandedGroups((prev) => ({ ...prev, [item.key]: true }));
                  } else {
                    toggleGroup(item.key);
                  }
                }}
                title={item.label}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-0' : 'justify-between px-3'
                } py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
                  isChildActive
                    ? 'text-[#171A21] font-medium'
                    : 'text-[#4B5563] hover:bg-slate-100/70 hover:text-[#171A21] font-normal'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`shrink-0 flex items-center justify-center ${
                      isChildActive ? 'text-[#5146D8]' : 'text-[#6B7280]'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  {!collapsed && (
                    <span className="truncate leading-5 text-[14px]">{item.label}</span>
                  )}
                </div>

                {!collapsed && (
                  <div className="text-[#9CA3AF] transition-transform duration-200">
                    <ChevronDown
                      size={14}
                      className={`transform transition-transform duration-200 ${
                        isExpanded ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </div>
                )}
              </button>

              {/* 二级子菜单列表 */}
              {!collapsed && isExpanded && item.children && (
                <div className="ml-3 pl-2.5 py-0.5 flex flex-col gap-1 border-l border-[#E5E7EB] my-0.5">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isSubActive = activeTab === child.key;

                    return (
                      <button
                        key={child.key}
                        type="button"
                        onClick={() => onNavigate(child.key)}
                        title={child.label}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
                          isSubActive
                            ? 'bg-[#EEF0FD] text-[#171A21] font-semibold relative before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-[#5146D8] before:rounded-r'
                            : 'text-[#4B5563] hover:bg-slate-100/70 hover:text-[#171A21] font-normal'
                        }`}
                      >
                        <div
                          className={`shrink-0 flex items-center justify-center ${
                            isSubActive ? 'text-[#5146D8]' : 'text-[#6B7280]'
                          }`}
                        >
                          <ChildIcon size={16} />
                        </div>
                        <span className="truncate leading-5 text-[14px]">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部功能区：对应用户资料与 Pro 入口 */}
      <div className="p-2.5 border-t border-[#E5E7EB] shrink-0 flex flex-col gap-2">
        {/* 未折叠时展示“星图智囊 Pro”浅灰微晶卡片 */}
        {!collapsed && (
          <div
            onClick={() => onNavigate('analysis')}
            className="p-2.5 rounded-lg bg-slate-50 border border-[#E5E7EB] hover:bg-slate-100/80 transition-all cursor-pointer group flex items-center gap-2.5"
            title="体验星图智囊 Pro"
          >
            <div className="w-7 h-7 rounded-lg bg-[#EEF0FD] text-[#5146D8] flex items-center justify-center shrink-0">
              <Zap size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[#171A21] truncate flex items-center gap-1.5">
                星图智囊 Pro
                <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-50 text-[#5146D8] font-bold">PRO</span>
              </div>
              <div className="text-[11px] text-[#6B7280] truncate leading-tight">
                深度数据洞察与分析
              </div>
            </div>
          </div>
        )}

        {/* 用户信息栏 */}
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center p-1.5' : 'gap-2.5 p-2'
          } rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-left`}
          title={`用户：${displayName}`}
        >
          {/* 头像 */}
          {currentUser?.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover shrink-0 border border-white shadow-xs"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white flex items-center justify-center font-semibold text-xs shrink-0 select-none shadow-[0_2px_8px_rgba(99,102,241,0.25)]">
              {getAvatarInitials()}
            </div>
          )}

          {/* 用户名与订阅/级别信息 */}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-[#0f172a] truncate leading-tight">
                {displayName}
              </div>
              <div className="text-[12px] text-[#8b5cf6] leading-normal font-medium">
                Plus 会员
              </div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
