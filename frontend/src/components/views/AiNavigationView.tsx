/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AI 导航与前沿工具库视图组件
 */

import React, { useState, useMemo } from 'react';
import {
  Compass,
  Search,
  ExternalLink,
  Sparkles,
  Flame,
  Bookmark,
  Check,
  Tag,
  Share2,
  Bot,
  Code,
  FileText,
  Layers,
  X,
} from 'lucide-react';
import { AI_CATEGORIES, AI_TOOLS_DATA } from '../../data/aiToolsData';
import type { AiCategory, AiToolItem } from '../../types/aiNavigation';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FloatingNav, type FloatingNavItem } from '../ui/floating-navbar';

export const AiNavigationView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<AiCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('hk_bookmarked_ai_tools_v1');
      return stored ? JSON.parse(stored) : ['deepseek', 'cursor', 'dify'];
    } catch {
      return ['deepseek', 'cursor', 'dify'];
    }
  });

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('hk_bookmarked_ai_tools_v1', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // 提取所有标签
  const allTags = useMemo(() => {
    const set = new Set<string>();
    AI_TOOLS_DATA.forEach((t) => t.tags.forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, []);

  // 为分类配置对应的现代语义图标
  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'llm':
        return <Bot className="h-3.5 w-3.5" />;
      case 'code':
        return <Code className="h-3.5 w-3.5" />;
      case 'design':
        return <Sparkles className="h-3.5 w-3.5" />;
      case 'office':
        return <FileText className="h-3.5 w-3.5" />;
      case 'agent':
        return <Layers className="h-3.5 w-3.5" />;
      case 'deep':
        return <Flame className="h-3.5 w-3.5" />;
      case 'all':
      default:
        return <Compass className="h-3.5 w-3.5" />;
    }
  };

  // 构造 FloatingNav 胶囊导航数据项
  const navItems: FloatingNavItem[] = useMemo(() => {
    return AI_CATEGORIES.map((cat) => {
      const count =
        cat.id === 'all'
          ? AI_TOOLS_DATA.length
          : AI_TOOLS_DATA.filter((t) => t.category === cat.id).length;
      return {
        id: cat.id,
        name: cat.label,
        count,
        icon: getCategoryIcon(cat.id),
      };
    });
  }, []);

  // 过滤计算
  const filteredTools = useMemo(() => {
    return AI_TOOLS_DATA.filter((tool) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = tool.name.toLowerCase().includes(q);
        const matchDesc = tool.description.toLowerCase().includes(q);
        const matchTags = tool.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchTags) return false;
      }
      if (activeCategory !== 'all' && tool.category !== activeCategory) {
        return false;
      }
      if (selectedTag && !tool.tags.includes(selectedTag)) {
        return false;
      }
      return true;
    });
  }, [searchQuery, activeCategory, selectedTag]);

  return (
    <div className="page-container animate-in fade-in duration-300 py-2">
      {/* 1. 最上方一行：Aceternity UI 风格 FloatingNav 胶囊浮动导航栏（融合分类项与搜索框，向下滑动停在标题栏下方，不遮挡顶部） */}
      <div className="mb-4 sticky top-14 pt-2 pb-1 z-20">
        <FloatingNav
          navItems={navItems}
          activeId={activeCategory}
          onSelect={(item) => setActiveCategory((item.id as AiCategory) || 'all')}
          rightContent={
            <div className="relative w-52 sm:w-64">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="搜索工具、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/50 rounded-full focus:outline-hidden focus:ring-1 focus:ring-neutral-400 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* 2. 热门标签轻量胶囊筛选（美化显式拖动条，采用透明细滑块与平滑滚动） */}
      <div className="mb-5 flex items-center gap-1.5 overflow-x-auto scrollbar-refined pb-2 text-xs select-none">
        <span className="text-[#94a3b8] flex items-center gap-1 shrink-0 font-medium pl-1 mr-1">
          <Tag size={12} /> 热门标签:
        </span>
        {allTags.map((tag) => {
          const isActive = selectedTag === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(isActive ? null : tag)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer shrink-0 border ${
                isActive
                  ? 'bg-[#171A21] text-white border-[#171A21] shadow-xs'
                  : 'bg-white text-[#475569] border-[#e2e8f0] hover:bg-slate-100 hover:text-[#0f172a]'
              }`}
            >
              #{tag}
            </button>
          );
        })}
        {selectedTag && (
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className="text-[11px] text-[#ef4444] hover:underline shrink-0 ml-1 cursor-pointer font-medium"
          >
            重置
          </button>
        )}
      </div>

      {/* 4. AI 工具卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTools.map((tool) => {
          const isBookmarked = bookmarkedIds.includes(tool.id);

          return (
            <Card
              key={tool.id}
              className="flex flex-col justify-between border border-[#e2e8f0] bg-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-[#bfdbfe] group"
            >
              <div className="p-5">
                {/* 顶部图标与操作 */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white shadow-xs shrink-0 ${tool.iconBg}`}
                    >
                      {tool.iconEmoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-[#0f172a] group-hover:text-[#2563eb] transition-colors">
                          {tool.name}
                        </h3>
                        {tool.isHot && (
                          <span className="inline-flex items-center text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                            <Flame size={10} className="mr-0.5 fill-current" />
                            HOT
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#94a3b8] font-medium uppercase tracking-wider">
                        {tool.pricing}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleBookmark(tool.id)}
                    title={isBookmarked ? '取消收藏' : '收藏工具'}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isBookmarked
                        ? 'border-[#fde68a] bg-[#fef3c7] text-[#b45309]'
                        : 'border-[#e2e8f0] bg-white text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#f8fafc]'
                    }`}
                  >
                    <Bookmark size={13} className={isBookmarked ? 'fill-current' : ''} />
                  </button>
                </div>

                {/* 描述 */}
                <p className="text-xs text-[#475569] leading-relaxed line-clamp-3 mb-4 font-normal">
                  {tool.description}
                </p>

                {/* 标签 */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tool.tags.map((t) => (
                    <span
                      key={t}
                      onClick={() => setSelectedTag(t)}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#f8fafc] text-[#64748b] border border-[#f1f5f9] hover:bg-[#eff6ff] hover:text-[#2563eb] cursor-pointer transition-colors"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* 卡片底栏：一键直达 */}
              <div className="px-5 py-3 bg-[#fbfcfd] border-t border-[#f1f5f9] rounded-b-xl flex items-center justify-between">
                <span className="text-[11px] text-[#94a3b8] truncate max-w-[150px]">
                  {tool.url.replace('https://', '')}
                </span>
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-xs transition-colors"
                >
                  <span>立即访问</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
