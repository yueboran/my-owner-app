/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 个人知识库核心中枢视图组件 (PersonalKnowledgeBaseView)
 * 聚合「工作日记」、「知识收集」、「商业分析」、「个人传记」、「刻意训练」五大认知库
 * 顶部集成可拓展 Tab 导航栏，支持快速横向拓展未来知识库分类
 */

import React, { useState, useEffect } from 'react';
import {
  PenLine,
  BookmarkPlus,
  TrendingUp,
  Scroll,
  Sparkles,
  Plus,
} from 'lucide-react';
import { JournalView } from './JournalView';
import { KnowledgeCollectorView } from './KnowledgeCollectorView';
import { BusinessAnalysisView } from './BusinessAnalysisView';
import { BiographyView } from './BiographyView';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

import { getPendingAiDraft, type PendingAiDraft } from '../../services/smartRouterService';

export type KnowledgeTabKey =
  | 'journal'
  | 'knowledge-collector'
  | 'business-analysis'
  | 'biography';

interface KnowledgeTabConfig {
  key: KnowledgeTabKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge: string;
  description: string;
}

const KNOWLEDGE_TABS: KnowledgeTabConfig[] = [
  {
    key: 'journal',
    label: '工作日记',
    icon: PenLine,
    badge: '记录复盘',
    description: '日常工作日志、思维沉淀与即时灵感复盘',
  },
  {
    key: 'knowledge-collector',
    label: '知识收集',
    icon: BookmarkPlus,
    badge: '剪藏中枢',
    description: '全网深度文章、文献剪藏与结构化卡片库',
  },
  {
    key: 'business-analysis',
    label: '商业分析',
    icon: TrendingUp,
    badge: '行业研报',
    description: '产业格局、商业模式解构与单位经济学洞察',
  },
  {
    key: 'biography',
    label: '个人传记',
    icon: Scroll,
    badge: '先贤鉴戒',
    description: '历史先贤志牒、心智模型与命运抉择推演',
  },
];

const STORAGE_ACTIVE_TAB_KEY = 'hk_personal_kb_active_tab';

interface PersonalKnowledgeBaseViewProps {
  initialTab?: KnowledgeTabKey;
  onTabChange?: (tab: KnowledgeTabKey) => void;
}

export const PersonalKnowledgeBaseView: React.FC<PersonalKnowledgeBaseViewProps> = ({
  initialTab,
  onTabChange,
}) => {
  const [pendingDraft, setPendingDraft] = useState<PendingAiDraft | null>(() => getPendingAiDraft());

  const [activeTab, setActiveTab] = useState<KnowledgeTabKey>(() => {
    // 优先从待确认草稿中读取目标子模块
    const draft = getPendingAiDraft();
    if (draft?.targetSubTab && KNOWLEDGE_TABS.some((t) => t.key === draft.targetSubTab)) {
      return draft.targetSubTab as KnowledgeTabKey;
    }
    if (initialTab && KNOWLEDGE_TABS.some((t) => t.key === initialTab)) {
      return initialTab;
    }
    const saved = localStorage.getItem(STORAGE_ACTIVE_TAB_KEY) as KnowledgeTabKey;
    if (saved && KNOWLEDGE_TABS.some((t) => t.key === saved)) {
      return saved;
    }
    return 'journal';
  });

  const [isExpandModalOpen, setIsExpandModalOpen] = useState(false);

  // 监听待审阅 AI 草稿事件与跨页面变更
  useEffect(() => {
    const handleDraftChange = (e: Event) => {
      const customEvent = e as CustomEvent<PendingAiDraft | null>;
      const draft = customEvent.detail !== undefined ? customEvent.detail : getPendingAiDraft();
      setPendingDraft(draft);
      if (draft?.targetSubTab && KNOWLEDGE_TABS.some((t) => t.key === draft.targetSubTab)) {
        setActiveTab(draft.targetSubTab as KnowledgeTabKey);
      }
    };
    window.addEventListener('hk-pending-draft-change', handleDraftChange);
    window.addEventListener('storage', handleDraftChange);
    return () => {
      window.removeEventListener('hk-pending-draft-change', handleDraftChange);
      window.removeEventListener('storage', handleDraftChange);
    };
  }, []);

  // 响应外部传入的 initialTab 变化
  useEffect(() => {
    if (initialTab && KNOWLEDGE_TABS.some((t) => t.key === initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleSelectTab = (tabKey: KnowledgeTabKey) => {
    setActiveTab(tabKey);
    localStorage.setItem(STORAGE_ACTIVE_TAB_KEY, tabKey);
    onTabChange?.(tabKey);
  };

  const currentTabConfig = KNOWLEDGE_TABS.find((t) => t.key === activeTab) || KNOWLEDGE_TABS[0];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#F7F8FA] overflow-hidden p-3 md:p-4 gap-3 animate-in fade-in duration-200">
      {/* 顶部顶级 Tab 栏：支持平滑切换与灵活横向扩展 */}
      <header className="bg-white rounded-2xl border border-[#E5E7EB] px-3 py-2.5 shadow-2xs shrink-0 flex items-center justify-between gap-3">
        {/* 左侧 Tab 列表 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 p-1 bg-[#F7F8FA] rounded-xl border border-[#E5E7EB]/80">
            {KNOWLEDGE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const hasDraft = pendingDraft?.targetSubTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleSelectTab(tab.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#5146D8] font-semibold shadow-xs border border-[#E5E7EB]'
                      : 'text-[#4B5563] hover:text-[#171A21] hover:bg-black/5 border border-transparent'
                  }`}
                  title={tab.description}
                >
                  <Icon
                    size={14}
                    className={isActive ? 'text-[#5146D8]' : 'text-[#6B7280]'}
                  />
                  <span>{tab.label}</span>
                  {hasDraft && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-semibold animate-pulse border border-rose-200">
                      AI待确认
                    </span>
                  )}
                  {isActive && !hasDraft && (
                    <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-[#5146D8]/10 text-[#5146D8] font-normal">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 预留拓展新知识库按钮 */}
          <button
            type="button"
            onClick={() => setIsExpandModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#6B7280] hover:text-[#5146D8] hover:bg-indigo-50/60 border border-dashed border-[#E5E7EB] hover:border-[#5146D8]/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="拓展新知识库分类"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">拓展知识库</span>
          </button>
        </div>

        {/* 右侧微提示信息 */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-[#6B7280] pl-2 border-l border-[#E5E7EB]">
          <span className="truncate max-w-[280px]">
            {currentTabConfig.description}
          </span>
        </div>
      </header>

      {/* 主体工作台：按需渲染当前选中的知识库子视图 */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {activeTab === 'journal' && <JournalView />}
        {activeTab === 'knowledge-collector' && <KnowledgeCollectorView />}
        {activeTab === 'business-analysis' && <BusinessAnalysisView />}
        {activeTab === 'biography' && <BiographyView />}
      </div>

      {/* 知识库拓展模态框 */}
      {isExpandModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsExpandModalOpen(false)}
          title="拓展个人知识库"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs text-[#4B5563]">
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-[#3730A3] flex items-start gap-2.5">
              <Sparkles size={16} className="text-[#5146D8] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                个人知识库已支持组件化横向插拔架构。通过顶层配置即可随时挂载新的垂直知识库模块（如代码片段库、读书书摘、论文综述库等）。
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-[#171A21]">已挂载的 4 大核心库：</h4>
              <div className="grid grid-cols-2 gap-2">
                {KNOWLEDGE_TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={t.key}
                      className="p-2.5 rounded-lg border border-[#E5E7EB] bg-white flex items-center gap-2 text-[#171A21]"
                    >
                      <Icon size={14} className="text-[#5146D8]" />
                      <span>{t.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-[#E5E7EB] flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsExpandModalOpen(false)}
                className="text-xs bg-[#5146D8] hover:bg-[#4338CA] text-white"
              >
                我知道了
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
