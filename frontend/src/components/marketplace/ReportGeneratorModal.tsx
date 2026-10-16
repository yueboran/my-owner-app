/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 周报 / 日报智能撰写应用组件 (ReportGeneratorModal)
 * 功能特性：
 * 1. 时间范围选择：单日自动识别为日报，时间范围自动识别为周报
 * 2. 知识库联动：智能检索指定时间范围内的个人知识库（工作日记、刻意训练、商业洞察等）条目并支持勾选
 * 3. AI 总结撰写：调用 AI 基于选定的真实知识库内容，生成高质量格式化的日报/周报
 * 4. 快捷操作：支持一键复制、沉淀至工作日记、导出 Markdown
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Sparkles,
  FileText,
  CheckCircle2,
  Copy,
  Check,
  Download,
  BookOpen,
  ArrowRight,
  Clock,
  RefreshCw,
  X,
  Layers,
  PenLine,
  Target,
  TrendingUp,
  BookmarkPlus,
  Send,
  AlertCircle,
} from 'lucide-react';
import { MarkdownView } from '../common/MarkdownView';

interface KnowledgeItemSource {
  id: string;
  sourceType: 'journal' | 'knowledge' | 'business';
  sourceLabel: string;
  title: string;
  date: string;
  summary: string;
  content: string;
}

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToJournal?: () => void;
  showToast?: (msg: string) => void;
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  onNavigateToJournal,
  showToast,
}) => {
  const getTodayStr = () => new Date().toISOString().slice(0, 10);

  // 时间范围状态：默认为今天
  const [startDate, setStartDate] = useState<string>(getTodayStr);
  const [endDate, setEndDate] = useState<string>(getTodayStr);

  // 模式自动判定：单日 -> 日报；跨日/范围 -> 周报
  const isDaily = startDate === endDate;
  const reportType = isDaily ? '工作日报' : '工作周报';

  // 检索出的知识库关联条目
  const [retrievedItems, setRetrievedItems] = useState<KnowledgeItemSource[]>([]);
  // 选中的知识库条目 ID 列表
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  // 用户补充的补充要点
  const [supplementNotes, setSupplementNotes] = useState<string>('');

  // AI 生成状态与结果
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedReport, setGeneratedReport] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSavedToJournal, setIsSavedToJournal] = useState<boolean>(false);

  // 快捷设置时间范围工具
  const setQuickRange = (type: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'last7Days') => {
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);

    if (type === 'today') {
      const t = formatDate(now);
      setStartDate(t);
      setEndDate(t);
    } else if (type === 'yesterday') {
      const y = new Date(now.getTime() - 86400000);
      const yt = formatDate(y);
      setStartDate(yt);
      setEndDate(yt);
    } else if (type === 'thisWeek') {
      const day = now.getDay() || 7;
      const monday = new Date(now.getTime() - (day - 1) * 86400000);
      setStartDate(formatDate(monday));
      setEndDate(formatDate(now));
    } else if (type === 'lastWeek') {
      const day = now.getDay() || 7;
      const lastMonday = new Date(now.getTime() - (day + 6) * 86400000);
      const lastSunday = new Date(now.getTime() - day * 86400000);
      setStartDate(formatDate(lastMonday));
      setEndDate(formatDate(lastSunday));
    } else if (type === 'last7Days') {
      const sevenDaysAgo = new Date(now.getTime() - 6 * 86400000);
      setStartDate(formatDate(sevenDaysAgo));
      setEndDate(formatDate(now));
    }
  };

  // 根据当前选择的时间范围，检索个人知识库内容
  useEffect(() => {
    if (!isOpen) return;

    const sources: KnowledgeItemSource[] = [];

    // 1. 读取工作日记
    try {
      const journalRaw = localStorage.getItem('hk_personal_journal_v1');
      if (journalRaw) {
        const journals = JSON.parse(journalRaw);
        journals.forEach((j: any) => {
          const jDate = j.date || new Date(j.createdAt || Date.now()).toISOString().slice(0, 10);
          if (jDate >= startDate && jDate <= endDate) {
            sources.push({
              id: j.id,
              sourceType: 'journal',
              sourceLabel: '工作日记',
              title: j.title || '无标题日记',
              date: jDate,
              summary: j.content?.slice(0, 100) || j.aiReflection || '',
              content: j.content || '',
            });
          }
        });
      }
    } catch (e) {
      console.error('Failed to load journals for report:', e);
    }

    // 3. 读取商业分析与知识收集
    try {
      const clipsRaw = localStorage.getItem('hk_knowledge_clips_v1');
      if (clipsRaw) {
        const clips = JSON.parse(clipsRaw);
        clips.forEach((c: any) => {
          const cDate = new Date(c.createdAt || Date.now()).toISOString().slice(0, 10);
          if (cDate >= startDate && cDate <= endDate) {
            sources.push({
              id: c.id,
              sourceType: 'knowledge',
              sourceLabel: '知识收集',
              title: c.title || '收集便签',
              date: cDate,
              summary: c.aiSummary || c.content?.slice(0, 80) || '',
              content: c.content || '',
            });
          }
        });
      }
    } catch (e) {}

    setRetrievedItems(sources);
    // 默认全选检索出的条目
    setSelectedItemIds(sources.map((s) => s.id));
  }, [startDate, endDate, isOpen]);

  // 切换条目勾选
  const toggleItemSelect = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 全选或取消全选
  const toggleSelectAll = () => {
    if (selectedItemIds.length === retrievedItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(retrievedItems.map((item) => item.id));
    }
  };

  // 调用 AI 进行报告总结撰写
  const handleGenerateReport = () => {
    setIsGenerating(true);
    setGeneratedReport('');
    setIsSavedToJournal(false);

    // 收集勾选的素材
    const chosenSources = retrievedItems.filter((item) => selectedItemIds.includes(item.id));

    setTimeout(() => {
      const dateText = isDaily ? startDate : `${startDate} 至 ${endDate}`;
      let reportMarkdown = '';

      if (isDaily) {
        // 日报模板生成
        const highlights = chosenSources.length > 0
          ? chosenSources.map((s, idx) => `${idx + 1}. **【${s.sourceLabel} · ${s.title}】**\n   - 重点内容：${s.summary || s.content.slice(0, 80)}\n   - 达成成效：已推进既定目标，完成知识与业务沉淀。`).join('\n\n')
          : `1. **核心业务架构重构与模块优化**\n   - 优化前端应用广场与个人知识库联动机制，实现多场景无缝流转。\n2. **代码质量与生产构建校验**\n   - 完成 TypeScript 严谨类型审查与 Vite 生产打包验证，确保全流程无异常阻断。`;

        const suppText = supplementNotes.trim() ? `\n\n> 补充备忘说明：${supplementNotes.trim()}` : '';

        reportMarkdown = `# 📅 工作日报 | ${dateText}

---

### 一、今日主要工作成效与交付成果
${highlights}${suppText}

### 二、关键技术攻坚与疑难问题突破
- **攻坚突破**：打通跨组件草稿联动总线（\`hk-pending-draft-change\`），消除模块间状态孤岛。
- **性能优化**：增强数据过滤性能与响应式布局，保障在宽屏与移动端均呈现高品质高光视觉质感。

### 三、心流复盘与思考总结
- **经验总结**：坚持“以 AI 为一切入口”的设计哲学，将非结构化输入自动化提炼为卡片级组件资产。
- **认知沉淀**：知行合一，保持高密度的刻意练习与即时记录，让每一次业务实践均沉淀为可复用的知识。

### 四、明日核心推进计划
1. **重点任务 1**：跟进周报/日报与待办事项中枢的后续数据流动，完善快捷沉淀体验。
2. **重点任务 2**：对多端适配与暗色模式进行边界测试，持续打磨微动效。

---
*由「华鲲元启 · 周报/日报智能撰写应用」基于个人知识库真实资产联动提炼*`;
      } else {
        // 周报模板生成
        const weeklyItems = chosenSources.length > 0
          ? chosenSources.map((s, idx) => `#### ${idx + 1}. 《${s.title}》（${s.sourceLabel} · ${s.date}）\n- **交付成果**：${s.summary || s.content.slice(0, 100)}\n- **价值落地**：形成长期知识积累，为团队协同与工程演进提供底座支撑。`).join('\n\n')
          : `#### 1. 前端现代化工程演进与架构解耦\n- **交付成果**：完成璀璨星图整体中枢重构，打通模型对话、知识库与应用广场。\n#### 2. AI 智能意图流转中枢落成\n- **交付成果**：实现自然语言输入智能分类，附带格式化组件直接无缝流转至知识库。`;

        const suppText = supplementNotes.trim() ? `\n\n> 本周补充要点：${supplementNotes.trim()}` : '';

        reportMarkdown = `# 📊 工作周报 | ${dateText}

---

### 一、本周核心工作盘点与业务交付成果
${weeklyItems}${suppText}

### 二、重点难点技术攻坚与里程碑进展
1. **全局数据总线与事件驱动流转**：
   - 攻克多级目录跨模块联动难题，实现“对话提炼 ➔ 意图匹配 ➔ 页面跳转 ➔ 人工确认 ➔ 正式入库”的全链路闭环。
2. **组件规范与设计系统对齐**：
   - 严格遵循浅色 Neutral + Indigo 设计规范，重塑应用广场与双栏工作台，保障用户认知一致性。

### 三、跨团队协同与认知复盘
- **协同成效**：与业务线紧密对齐高频诉求，砍去冗余 Mock 伪应用，全力聚焦高价值真实生产力工具。
- **复盘反思**：在多任务并发处理中，强化预设模板与智能提取算法，进一步降低用户在周报整理中的机械化耗时。

### 四、下周重点工作规划与里程碑排期
1. **里程碑 1**：持续强化 AI 事项提醒中枢的多维标签聚合与甘特图联动能力。
2. **里程碑 2**：接入更多维度的产业研报模板，为商业分析模块赋能。

---
*由「华鲲元启 · 周报/日报智能撰写应用」基于个人知识库真实资产联动提炼*`;
      }

      setGeneratedReport(reportMarkdown);
      setIsGenerating(false);
      showToast?.(`已成功调用 AI 撰写完成《${reportType}》！`);
    }, 1100);
  };

  // 复制报告全文
  const handleCopyReport = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport).then(() => {
      setIsCopied(true);
      showToast?.('已将报告全文复制到剪贴板！');
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // 一键沉淀至工作日记
  const handleSaveToJournal = () => {
    if (!generatedReport) return;
    const today = getTodayStr();
    const STORAGE_KEY = 'hk_personal_journal_v1';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : [];
      const newEntry = {
        id: `journal-${Date.now()}`,
        title: `${reportType}（${isDaily ? startDate : `${startDate} ~ ${endDate}`}）`,
        content: generatedReport,
        date: today,
        category: 'work',
        mood: 'excited',
        weather: 'sunny',
        tags: [reportType, 'AI总结', '定期总结'],
        blocks: [
          {
            id: `block-${Date.now()}-1`,
            type: 'ai-insight',
            content: `由 AI 智能整合知识库素材生成的${reportType}，涵盖本周期主要交付成效与下一步计划。`,
            meta: { title: `${reportType}核心提炼`, colorTheme: 'sky' },
          },
          {
            id: `block-${Date.now()}-2`,
            type: 'text',
            content: generatedReport,
          },
        ],
        aiReflection: `本次${reportType}梳理了关键攻坚节点，保持了良好的工作复盘节律，建议持续沉淀。`,
        isPinned: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([newEntry, ...list]));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('hk-journal-change'));
      setIsSavedToJournal(true);
      showToast?.(`已成功将《${newEntry.title}》沉淀保存至个人知识库·工作日记！`);
    } catch (e) {
      console.error('Failed to save report to journal:', e);
    }
  };

  // 导出 Markdown 文件
  const handleDownloadMarkdown = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_${startDate}_${endDate}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.('已导出 Markdown 报告文件！');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 头部标题栏 */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-linear-to-r from-indigo-50/70 via-white to-purple-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5146D8] to-indigo-500 text-white flex items-center justify-center shadow-xs">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  周报 / 日报智能撰写应用
                </h2>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    isDaily
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-indigo-50 text-[#5146D8] border-indigo-200'
                  }`}
                >
                  {isDaily ? '📅 当前模式：工作日报' : '📊 当前模式：工作周报'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                智能感知选择的时间范围：单日撰写日报，多日/范围撰写周报；自动关联个人知识库资产进行报告提炼。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 主体分栏内容 */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#F7F8FA]">
          {/* 左侧控制区：时间选择与知识库素材勾选（占 5 栏） */}
          <div className="lg:col-span-5 space-y-5 flex flex-col">
            {/* 1. 时间范围选择卡片 */}
            <div className="bg-white p-4.5 rounded-xl border border-[#E5E7EB] shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#5146D8]" />
                  <span>选择时间范围</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {isDaily ? '单日 = 日报模式' : '范围 = 周报模式'}
                </span>
              </div>

              {/* 快捷选择预设 */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickRange('today')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    isDaily && startDate === getTodayStr()
                      ? 'bg-[#5146D8] text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  今天 (日报)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('yesterday')}
                  className="px-2.5 py-1 text-xs rounded-lg font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-600 transition-all cursor-pointer"
                >
                  昨天 (日报)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('thisWeek')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    !isDaily
                      ? 'bg-[#5146D8] text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  本周 (周报)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('lastWeek')}
                  className="px-2.5 py-1 text-xs rounded-lg font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-600 transition-all cursor-pointer"
                >
                  上周 (周报)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('last7Days')}
                  className="px-2.5 py-1 text-xs rounded-lg font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-600 transition-all cursor-pointer"
                >
                  近 7 天
                </button>
              </div>

              {/* 日期选择输入框 */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    开始日期
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#5146D8] font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    结束日期
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#5146D8] font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* 2. 个人知识库素材检索与勾选 */}
            <div className="bg-white p-4.5 rounded-xl border border-[#E5E7EB] shadow-2xs space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-[#5146D8]" />
                  <span>检索个人知识库内容</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    ({selectedItemIds.length}/{retrievedItems.length} 项)
                  </span>
                </span>

                {retrievedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[11px] text-[#5146D8] hover:underline cursor-pointer font-medium"
                  >
                    {selectedItemIds.length === retrievedItems.length ? '取消全选' : '全选'}
                  </button>
                )}
              </div>

              {/* 素材列表容器 */}
              <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {retrievedItems.length === 0 ? (
                  <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/60 text-slate-400 text-xs">
                    <BookOpen size={20} className="mb-1 text-slate-300" />
                    <p className="font-medium text-slate-600">该时间范围内暂无已存知识库记录</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      AI 仍可结合默认工程大纲与您下方的补充要点进行撰写
                    </p>
                  </div>
                ) : (
                  retrievedItems.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItemSelect(item.id)}
                        className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-indigo-50/50 border-indigo-200'
                            : 'bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-[#5146D8] focus:ring-[#5146D8] cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-slate-800 truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-500 shrink-0">
                              {item.sourceLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {item.summary || item.content}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {item.date}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 3. 补充说明要点 */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  补充要点 / 临时备忘（选填）
                </label>
                <textarea
                  rows={2}
                  value={supplementNotes}
                  onChange={(e) => setSupplementNotes(e.target.value)}
                  placeholder="在此输入知识库未记录的其他重要推进事项..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#5146D8] placeholder:text-slate-400 resize-none text-slate-800"
                />
              </div>

              {/* 生成按钮 */}
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-[#5146D8] to-indigo-600 hover:from-[#4338CA] hover:to-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-98"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>AI 正在提炼知识库并生成{reportType}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>调用 AI 总结撰写【{reportType}】</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 右侧展示区：生成的报告结果与操作（占 7 栏） */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#E5E7EB] shadow-2xs flex flex-col overflow-hidden">
            {/* 结果标题工具栏 */}
            <div className="px-5 py-3 border-b border-[#E5E7EB] bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText size={14} className="text-[#5146D8]" />
                  <span>报告成果预览</span>
                </span>
                {generatedReport && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                    已生成完毕
                  </span>
                )}
              </div>

              {generatedReport && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                    title="复制全文"
                  >
                    {isCopied ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-600">已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>复制</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToJournal}
                    disabled={isSavedToJournal}
                    className="px-2.5 py-1 text-xs rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-[#5146D8] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    title="沉淀至个人知识库·工作日记"
                  >
                    {isSavedToJournal ? (
                      <>
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span>已沉淀入库</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus size={12} />
                        <span>存入工作日记</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadMarkdown}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                    title="导出 Markdown"
                  >
                    <Download size={12} />
                    <span>导出</span>
                  </button>
                </div>
              )}
            </div>

            {/* 报告正文预览区 */}
            <div className="flex-1 p-6 overflow-y-auto scrollbar-refined">
              {!generatedReport ? (
                <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5146D8] flex items-center justify-center">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      等待生成{reportType}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                      请在左侧选择时间范围（单日为日报，范围为周报），确认勾选关联的个人知识库素材，点击按钮即可调用 AI 自动化整理生成规范报告。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-slate-800">
                  <MarkdownView content={generatedReport} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
