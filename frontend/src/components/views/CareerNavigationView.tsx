/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 求职导航与职业成长全景视图组件
 */

import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Search,
  ExternalLink,
  Flame,
  Bookmark,
  Building2,
  GraduationCap,
  Sparkles,
  Tag,
  CheckCircle,
} from 'lucide-react';
import { CAREER_CATEGORIES, CAREER_RESOURCES_DATA } from '../../data/careerData';
import type { CareerCategory, CareerResourceItem } from '../../types/careerNavigation';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const CareerNavigationView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<CareerCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 提取所有标签
  const allTags = useMemo(() => {
    const set = new Set<string>();
    CAREER_RESOURCES_DATA.forEach((r) => r.tags.forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, []);

  // 过滤计算
  const filteredResources = useMemo(() => {
    return CAREER_RESOURCES_DATA.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchTags) return false;
      }
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (selectedTag && !item.tags.includes(selectedTag)) {
        return false;
      }
      return true;
    });
  }, [searchQuery, activeCategory, selectedTag]);

  return (
    <div className="page-container animate-in fade-in duration-300">
      {/* 1. 规范化页面头部 */}
      <div className="page-header-block flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-main-title flex items-center gap-2">
            <Briefcase size={22} className="text-[#2b5aed]" /> 求职招聘与职业发展导航
          </h1>
          <p className="page-sub-title mt-1">
            聚合主流直聘平台、大厂面经刷题库、真实薪资爆料、央国企专区与简历神器
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#64748b] bg-white px-3 py-1.5 rounded-lg border border-[#e2e8f0]">
            已收录 <span className="text-[#2563eb]">{CAREER_RESOURCES_DATA.length}</span> 个权威求职渠道
          </span>
        </div>
      </div>

      {/* 2. 筛选与分类工具条 */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-5">
        {/* 分类 Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {CAREER_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            const count =
              cat.id === 'all'
                ? CAREER_RESOURCES_DATA.length
                : CAREER_RESOURCES_DATA.filter((r) => r.category === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'bg-white text-[#64748b] hover:bg-[#f1f5f9] border border-[#e2e8f0]'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#f1f5f9] text-[#64748b]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 搜索框 */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="搜索求职平台、面经或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#e2e8f0] rounded-lg focus:outline-none focus:border-[#2563eb] text-[#0f172a] placeholder-[#94a3b8]"
          />
        </div>
      </div>

      {/* 3. 标签快速过滤 */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[#94a3b8] flex items-center gap-1 shrink-0">
          <Tag size={12} /> 快捷检索:
        </span>
        {allTags.map((tag) => {
          const isActive = selectedTag === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(isActive ? null : tag)}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#2563eb] text-white shadow-xs'
                  : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
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
            className="text-[11px] text-[#ef4444] hover:underline shrink-0 ml-1 cursor-pointer"
          >
            清除
          </button>
        )}
      </div>

      {/* 4. 求职资源卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredResources.map((item) => (
          <Card
            key={item.id}
            className="flex flex-col justify-between border border-[#e2e8f0] bg-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-[#bfdbfe] group"
          >
            <div className="p-5">
              {/* 顶部 */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white shadow-xs shrink-0 ${item.iconBg}`}
                  >
                    {item.iconEmoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-[#0f172a] group-hover:text-[#2563eb] transition-colors">
                        {item.name}
                      </h3>
                      {item.isHot && (
                        <span className="inline-flex items-center text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                          <Flame size={10} className="mr-0.5 fill-current" />
                          HOT
                        </span>
                      )}
                    </div>
                    {item.highlightText && (
                      <span className="text-[10px] text-[#2563eb] font-semibold">
                        {item.highlightText}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 描述 */}
              <p className="text-xs text-[#475569] leading-relaxed line-clamp-3 mb-4 font-normal">
                {item.description}
              </p>

              {/* 标签 */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {item.tags.map((t) => (
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
                {item.url.replace('https://', '')}
              </span>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-xs transition-colors"
              >
                <span>直达官网</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
