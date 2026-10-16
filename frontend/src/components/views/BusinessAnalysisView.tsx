import { AiHtmlGeneratorButton } from '../common/AiHtmlGeneratorButton';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 商业分析与行业研报阅读中枢视图组件
 * 专业的商业研报阅读、多维指标看板、护城河深度解构与AI商业研判
 * 采用图2样式规范：全高分栏布局 + UniversalTreeSidebar 多级目录树 + 右侧所见即所得双栏工作台
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  TrendingUp,
  Search,
  BookOpen,
  Bookmark,
  Plus,
  Sparkles,
  Clock,
  Building2,
  Copy,
  Check,
  Trash2,
  Calendar,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';
import { useBusinessAnalysis } from '../../hooks/useBusinessAnalysis';
import { UniversalTreeSidebar } from '../common/UniversalTreeSidebar';
import { ExportActionButtons } from '../common/ExportActionButtons';
import { KnowledgeCardWorkspace } from '../common/KnowledgeCardWorkspace';
import { CardBlockEditor } from '../journal/CardBlockEditor';
import type {
  BusinessReport,
  IndustryCategory,
  ReportType,
  BusinessTargetType,
} from '../../types/businessAnalysis';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

// 赛道分类映射
const CATEGORY_MAP: Record<IndustryCategory, { label: string; color: string }> = {
  ai_tech: { label: '人工智能', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  global_ecom: { label: '出海跨消', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  enterprise: { label: '企服SaaS', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  green_energy: { label: '新能源', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  macro_finance: { label: '宏观金融', color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

// 研报类型映射
const TYPE_MAP: Record<ReportType, string> = {
  industry_deep: '行业深度研究',
  company_case: '商业模式解构',
  competitive: '竞争格局博弈',
  financial: '财报与商业估值',
};

// 商业模式透镜映射 (To C / To B / To G)
export const BUSINESS_TARGET_MAP: Record<
  BusinessTargetType,
  { label: string; tag: string; badge: string; desc: string; formula: string }
> = {
  to_b: {
    label: 'To B 企业服务',
    tag: 'To B',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: '组织价值交换 · 投资回报 ROI',
    formula: '“你能证明投资值得”',
  },
  to_c: {
    label: 'To C 个人消费',
    tag: 'To C',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: '需求 + 心理 + 情绪价值规模',
    formula: '“你让我感觉值得买”',
  },
  to_g: {
    label: 'To G 政企治理',
    tag: 'To G',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: '公共价值 · 政策匹配与合规安全',
    formula: '“你能证明你可靠且符合目标”',
  },
};

export const BusinessAnalysisView: React.FC = () => {
  const {
    reports,
    filteredReports,
    folders,
    activeReportId,
    activeReport,
    setActiveReportId,
    toggleBookmark,
    addReport,
    updateReport,
    deleteReport,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleFolderExpand,
    moveReportToFolder,
  } = useBusinessAnalysis();

  // 侧边栏展开与反馈状态（默认展开）
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);


  // 研读交互状态
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  // 复制摘要
  const handleCopySummary = () => {
    if (!activeReport) return;
    navigator.clipboard.writeText(
      `【${activeReport.title}】\n来源：${activeReport.sourceOrg}（${activeReport.publishDate}）\n核心结论：${activeReport.executiveSummary}`
    );
    setCopiedSummary(true);
    showToast('已复制研报核心结论至剪贴板');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // 附件上传引用与处理
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeReport) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const newAtt = {
        id: `att-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        url,
        uploadedAt: new Date().toISOString(),
      };
      const existing = (activeReport as any).attachments || [];
      updateReport(activeReport.id, {
        attachments: [...existing, newAtt],
      } as any);
      showToast(`已追加附件《${file.name}》`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 统计研报实时正文字数
  const reportWordCount = useMemo(() => {
    if (!activeReport) return 0;
    if ((activeReport as any).content) return (activeReport as any).content.length;
    if (activeReport.blocks && activeReport.blocks.length > 0) {
      return activeReport.blocks.reduce((acc: number, b: any) => acc + (b.content ? b.content.length : 0), 0);
    }
    const summaryLen = activeReport.executiveSummary?.length || 0;
    const sectionsLen = (activeReport.sections || []).reduce(
      (acc: number, s: any) => acc + (s.content ? s.content.length : 0),
      0
    );
    return summaryLen + sectionsLen;
  }, [activeReport]);

  // 一键直接新建商业研报（无需复杂弹窗，直接创建并就地编辑大标题）
  const handleDirectCreateReport = (folderId: string | null = null) => {
    const today = new Date().toISOString().slice(0, 10);
    const created = addReport({
      title: `${today} 商业研报`,
      subtitle: '深度商业研究与产业演化分析',
      sourceOrg: '内部战略智库',
      author: '主笔分析师',
      publishDate: today,
      readTimeMinutes: 10,
      category: 'ai_tech',
      reportType: 'industry_deep',
      ratingBadge: '核心追踪',
      executiveSummary: '',
      folderId: folderId || null,
      sections: [],
      coreInsights: [],
      tags: [],
      isBookmarked: false,
    });
    setActiveReportId(created.id);
    showToast('已创建新研报，点击标题即可直接编辑');
  };

  return (
    <div className="h-full bg-[#F7F8FA] flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-xs relative animate-in fade-in duration-300">
      {/* 实时反馈 Toast */}
      {toast && (
        <div className="absolute top-4 right-4 z-50 bg-[#171A21] text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check size={14} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* 主体工作台：左侧树形目录 + 右侧双栏研读器 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左侧：图 2 风格多级目录树侧边栏 */}
        <div
          className={`${
            isSidebarOpen ? 'w-80 lg:w-[320px] xl:w-[340px]' : 'w-16'
          } shrink-0 h-full transition-all duration-300`}
        >
          <UniversalTreeSidebar<BusinessReport>
            items={filteredReports}
            folders={folders}
            activeId={activeReportId}
            isOpen={isSidebarOpen}
            onToggleOpen={() => setIsSidebarOpen((prev) => !prev)}
            onSelectItem={(id) => setActiveReportId(id)}
            onCreateNewItem={(folderId) => handleDirectCreateReport(folderId)}
            onDeleteItem={(id) => deleteReport(id)}
            onCreateFolder={(name, parentId) => {
              createFolder(name, parentId);
              showToast('已新建研报分类');
            }}
            onRenameFolder={(id, name) => {
              renameFolder(id, name);
              showToast('已更新分类名称');
            }}
            onDeleteFolder={(id) => {
              deleteFolder(id);
              showToast('已删除分类');
            }}
            onToggleFolderExpand={toggleFolderExpand}
            onMoveItemToFolder={(reportId, folderId) => {
              moveReportToFolder(reportId, folderId);
              showToast(folderId ? '已归档至指定分类' : '已移至未归档研报');
            }}
            showToast={showToast}
            createBtnText="新增商业研报"
            itemNoun="篇研报"
            renderItemTitle={(report) => report.title}
            renderItemSubtext={(report) => (
              <span className="text-[10px] text-slate-400">
                {report.publishDate || (report.createdAt ? new Date(report.createdAt).toISOString().slice(0, 10) : '')}
              </span>
            )}
          />
        </div>


        {/* 右侧：沉浸式研读器工作台（与工作日记格式保持一致） */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto p-4 md:p-6 scrollbar-refined">
          {activeReport ? (
            <KnowledgeCardWorkspace
              title={activeReport.title}
              onUpdateTitle={(title) => updateReport(activeReport.id, { title, updatedAt: Date.now() })}
              titlePlaceholder="输入研报标题..."
              date={activeReport.publishDate || new Date(activeReport.createdAt || Date.now()).toISOString().slice(0, 10)}
              updatedAt={activeReport.updatedAt || activeReport.createdAt}
              wordCount={reportWordCount}
              genericCard={activeReport}
              onUpdateCard={(updated) => {
                updateReport(activeReport.id, updated as Partial<BusinessReport>);
              }}
              tags={activeReport.tags || []}
              onUpdateTags={(newTags) =>
                updateReport(activeReport.id, { tags: newTags, updatedAt: Date.now() })
              }
              headerCustomActions={
                <>
                  <AiHtmlGeneratorButton
                    label="AI战略速读"
                    sourceType="business-analysis"
                    sourceId={activeReport.id}
                    title={activeReport.title}
                    source={activeReport}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      toggleBookmark(activeReport.id);
                      showToast(activeReport.isBookmarked ? '已取消收藏' : '已加入战略收藏');
                    }}
                    className={`p-1.5 rounded-lg border transition-colors shadow-2xs cursor-pointer ${
                      activeReport.isBookmarked
                        ? 'border-amber-300 bg-amber-50 text-amber-600'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                    title={activeReport.isBookmarked ? '取消战略收藏' : '设为战略收藏'}
                  >
                    <Bookmark size={14} className={activeReport.isBookmarked ? 'fill-amber-500' : ''} />
                  </button>
                </>
              }
              beforeContent={
                activeReport.executiveSummary ? (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-slate-50 border border-blue-200/70 text-slate-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                      <TrendingUp size={13} className="text-blue-600" />
                      <span>核心商业战略结论 (Executive Summary)</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {activeReport.executiveSummary}
                    </p>
                  </div>
                ) : null
              }
              attachments={activeReport.attachments || []}
              onUploadAttachment={(file) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const url = event.target?.result as string;
                  const newAtt = {
                    id: `att-${Date.now()}`,
                    name: file.name,
                    size: `${(file.size / 1024).toFixed(1)} KB`,
                    type: file.type.startsWith('image/') ? 'image' : 'file',
                    url,
                    uploadedAt: new Date().toISOString(),
                  };
                  const existing = activeReport.attachments || [];
                  updateReport(activeReport.id, {
                    attachments: [...existing, newAtt],
                  } as any);
                  showToast(`已追加附件《${file.name}》`);
                };
                reader.readAsDataURL(file);
              }}
              onDeleteAttachment={(attId) => {
                const remaining = (activeReport.attachments || []).filter((a: any) => a.id !== attId);
                updateReport(activeReport.id, { attachments: remaining } as any);
                showToast('已移除附件');
              }}
              exportOptions={{
                title: activeReport.title,
                date: activeReport.publishDate,
                updatedAt: activeReport.updatedAt,
                tags: activeReport.tags,
                content: activeReport.executiveSummary,
                blocks: activeReport.blocks,
                extraMeta: {
                  '研报类型': activeReport.type,
                  '发布机构': activeReport.sourceOrg,
                  '商业实体': activeReport.targetName,
                },
                extraSections: [
                  { title: '核心商业结论', content: activeReport.executiveSummary },
                ],
              }}
              onDelete={() => {
                deleteReport(activeReport.id);
                showToast('研报已删除');
              }}
              deleteConfirmTitle={`确定要删除研报《${activeReport.title}》吗？`}
              showToast={showToast}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-[#6B7280]">
              <div className="max-w-xs space-y-3">
                <BookOpen size={36} className="mx-auto text-[#9CA3AF] stroke-[1.5]" />
                <p className="text-sm">请在左侧选择一份商业研报开启研读</p>
                <button
                  type="button"
                  onClick={() => handleDirectCreateReport(null)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[#5146D8] text-white hover:bg-[#4338CA] transition-colors"
                >
                  录入首篇研报
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
