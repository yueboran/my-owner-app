/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 事件流程视图组件 (EventFlowView)
 * 严格按照图 2 标准布局规范重构：
 * 1. 左侧 UniversalTreeSidebar 多级目录树 + 快速新建按钮 + 搜索与统计
 * 2. 右侧沉浸式一体化圆角白底工作台
 * 3. 标题之下采用图 1 标准核心指标统计条（日期、正文字数、配套附件、更新时间）
 * 4. 内嵌 CardBlockEditor 所见即所得块编辑器 + 流程拓扑图 (EventFlowChart) + 步骤推进与分支演化
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Workflow,
  Plus,
  Sparkles,
  GitBranch,
  Flag,
  CheckCircle2,
  Clock,
  Code2,
  Trash2,
  Copy,
  Check,
  Calendar,
  Paperclip,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Upload,
  X,
  FileCheck,
} from 'lucide-react';
import { useEventFlows } from '../../hooks/useEventFlows';
import { UniversalTreeSidebar } from '../common/UniversalTreeSidebar';
import { ExportActionButtons } from '../common/ExportActionButtons';
import { CardBlockEditor } from '../journal/CardBlockEditor';
import { EventFlowChart } from '../eventFlow/EventFlowChart';
import { EventJsonDrawer } from '../eventFlow/EventJsonDrawer';
import type {
  EventFlow,
  EventStatus,
  EventCategory,
  EventPriority,
  FlowNodeItem,
} from '../../types/eventFlow';
import type { GenericCardEntity } from '../../types/cardBlock';

// 分类样式映射
const CATEGORY_STYLE_MAP: Record<EventCategory, { label: string; color: string }> = {
  业务攻坚: { label: '业务攻坚', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  架构演进: { label: '架构演进', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  流程审批: { label: '流程审批', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  学习探索: { label: '学习探索', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  日常事务: { label: '日常事务', color: 'bg-stone-50 text-stone-700 border-stone-200' },
};

// 优先级样式映射
const PRIORITY_BADGE_MAP: Record<EventPriority, { label: string; color: string }> = {
  high: { label: '高优先级', color: 'bg-rose-50 text-rose-600 border-rose-200' },
  medium: { label: '中优先级', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: '常规推进', color: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export const EventFlowView: React.FC = () => {
  const {
    events,
    folders,
    activeEventId,
    activeEvent,
    setActiveEventId,
    inProgressEvents,
    completedEvents,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleFolderExpand,
    moveEventToFolder,
    createEvent,
    addNextStepNode,
    createBranch,
    closeEvent,
    reopenEvent,
    updateEvent,
    updateNode,
    deleteNode,
    deleteEvent,
    importEventFromJson,
  } = useEventFlows();

  // 侧边栏展开与反馈状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 流程拓扑图展开状态（默认可折叠/展开）
  const [isChartExpanded, setIsChartExpanded] = useState<boolean>(false);

  // 节点清单展开状态
  const [isNodesListExpanded, setIsNodesListExpanded] = useState<boolean>(false);

  // 底层 JSON 抽屉
  const [activeJsonDrawerEvent, setActiveJsonDrawerEvent] = useState<EventFlow | null>(null);

  // 复制反馈
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // 推进下一步弹窗
  const [nextStepModalEvent, setNextStepModalEvent] = useState<EventFlow | null>(null);
  const [nextStepName, setNextStepName] = useState('');
  const [nextStepDesc, setNextStepDesc] = useState('');
  const [nextStepAssignee, setNextStepAssignee] = useState('');

  // 创建新分支弹窗
  const [branchModalEvent, setBranchModalEvent] = useState<EventFlow | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchFirstNodeName, setBranchFirstNodeName] = useState('');
  const [branchDesc, setBranchDesc] = useState('');
  const [branchSourceNodeId, setBranchSourceNodeId] = useState('');

  // 闭环归档弹窗
  const [closureModalEvent, setClosureModalEvent] = useState<EventFlow | null>(null);
  const [closureSummary, setClosureSummary] = useState('');
  const [isAiGeneratingSummary, setIsAiGeneratingSummary] = useState(false);

  // 从 JSON 导入弹窗
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // 附件上传引用与处理
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeEvent) return;
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
      const existing = (activeEvent as any).attachments || [];
      updateEvent(activeEvent.id, {
        attachments: [...existing, newAtt],
      } as any);
      showToast(`已追加附件《${file.name}》`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 统计事件实时正文字数
  const eventWordCount = useMemo(() => {
    if (!activeEvent) return 0;
    if ((activeEvent as any).content) return (activeEvent as any).content.length;
    if (activeEvent.blocks && activeEvent.blocks.length > 0) {
      return activeEvent.blocks.reduce((acc: number, b: any) => acc + (b.content ? b.content.length : 0), 0);
    }
    const descLen = activeEvent.description?.length || 0;
    const closureLen = activeEvent.closureSummary?.length || 0;
    const nodesLen = (activeEvent.nodes || []).reduce(
      (acc: number, n: any) => acc + (n.description ? n.description.length : 0),
      0
    );
    return descLen + closureLen + nodesLen;
  }, [activeEvent]);

  // 将 activeEvent 适配为通用卡片实体供 CardBlockEditor 双向编辑
  const eventAsCard: GenericCardEntity = useMemo(() => {
    if (!activeEvent) return { id: '', title: '' };
    return {
      id: activeEvent.id,
      title: activeEvent.title,
      content: activeEvent.description,
      blocks: activeEvent.blocks || [
        {
          id: `block-${activeEvent.id}-p1`,
          type: 'paragraph',
          content: activeEvent.description || '在此记录事件推进的详细方案、关键事实与阶段总结...',
        },
      ],
      attachments: (activeEvent as any).attachments || [],
      globalFontSize: (activeEvent as any).globalFontSize || '18',
    };
  }, [activeEvent]);

  // 同步卡片块编辑器修改
  const handleUpdateCard = (updated: Partial<GenericCardEntity>) => {
    if (!activeEvent) return;
    updateEvent(activeEvent.id, {
      title: updated.title ?? activeEvent.title,
      description: updated.content ?? activeEvent.description,
      blocks: updated.blocks ?? activeEvent.blocks,
      attachments: updated.attachments ?? (activeEvent as any).attachments,
      globalFontSize: updated.globalFontSize ?? (activeEvent as any).globalFontSize,
      updatedAt: new Date().toISOString(),
    } as any);
  };

  // 一键直接新建事件流程
  const handleDirectCreateEvent = (folderId: string | null = null) => {
    const today = new Date().toISOString().slice(0, 10);
    const created = createEvent({
      title: `${today} 事件推进流程`,
      description: '确立核心交付目标与节点推进路线。',
      category: '业务攻坚',
      priority: 'high',
      folderId: folderId || null,
      tags: ['新事件', '推进中'],
    });
    setActiveEventId(created.id);
    showToast('已创建新事件，点击标题即可直接编辑');
  };

  // 复制事件信息
  const handleCopyEvent = () => {
    if (!activeEvent) return;
    const shareText = `【事件流程：${activeEvent.title}】\n状态：${
      activeEvent.status === 'in_progress' ? '推进中' : '已闭环'
    }\n分类：${activeEvent.category} | 优先级：${activeEvent.priority}\n推进阶段：${
      activeEvent.currentStage
    }\n说明：${activeEvent.description}`;
    navigator.clipboard.writeText(shareText);
    setCopiedSummary(true);
    showToast('已复制事件摘要至剪贴板');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // 推进下一步弹窗提交
  const handleNextStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextStepModalEvent || !nextStepName.trim()) return;
    addNextStepNode(nextStepModalEvent.id, {
      name: nextStepName.trim(),
      description: nextStepDesc.trim(),
      assignee: nextStepAssignee.trim(),
    });
    setNextStepName('');
    setNextStepDesc('');
    setNextStepAssignee('');
    setNextStepModalEvent(null);
    showToast('已推进下一步流程节点！');
  };

  // 创建新分支弹窗提交
  const handleBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchModalEvent || !branchName.trim() || !branchFirstNodeName.trim()) return;
    createBranch(branchModalEvent.id, {
      branchName: branchName.trim(),
      sourceNodeId: branchSourceNodeId || branchModalEvent.nodes[branchModalEvent.nodes.length - 1].id,
      firstNodeName: branchFirstNodeName.trim(),
      description: branchDesc.trim(),
    });
    setBranchName('');
    setBranchFirstNodeName('');
    setBranchDesc('');
    setBranchSourceNodeId('');
    setBranchModalEvent(null);
    showToast(`已成功创建分支【${branchName}】！`);
  };

  // 触发 AI 生成闭环复盘总结
  const handleAiGenerateClosureSummary = () => {
    if (!closureModalEvent) return;
    setIsAiGeneratingSummary(true);
    setTimeout(() => {
      const completedNodes = closureModalEvent.nodes
        .filter((n) => n.status === 'completed')
        .map((n) => `• 达成阶段：${n.name}${n.description ? `（${n.description}）` : ''}`)
        .join('\n');

      const generated = `🎉 **事件《${closureModalEvent.title}》全流程闭环总结**：
1. **核心里程碑达成**：
${completedNodes || '• 核心推进节点均已完成验收。'}
2. **分支演进成效**：共演化 ${closureModalEvent.branches.length} 个分支路径，均已顺利达成收敛。
3. **复盘评价**：全链路自始至终具备完整自解释语义可溯源性，正式归档至已完成库并沉淀为长期资产。`;

      setClosureSummary(generated);
      setIsAiGeneratingSummary(false);
      showToast('AI 已自动生成闭环总结草案！');
    }, 800);
  };

  // 确认闭环归档提交
  const handleConfirmClosure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closureModalEvent) return;
    const summary = closureSummary.trim() || `事件《${closureModalEvent.title}》已顺利完成各项预定指标，达成闭环归档。`;
    closeEvent(closureModalEvent.id, { summary });
    setClosureSummary('');
    setClosureModalEvent(null);
    showToast(`事件已圆满闭环，并成功流转至【已完成库】！`);
  };

  // 从大模型 JSON 导入提交
  const handleImportJsonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJsonText.trim()) return;
    const res = importEventFromJson(importJsonText.trim());
    if (res.success) {
      setImportJsonText('');
      setIsImportModalOpen(false);
      showToast('已成功通过大模型 JSON 创建新事件流程！');
    } else {
      showToast(`导入失败：${res.error}`);
    }
  };

  // 计算节点完成度
  const completedNodesCount = useMemo(() => {
    if (!activeEvent) return 0;
    return activeEvent.nodes.filter((n) => n.status === 'completed').length;
  }, [activeEvent]);

  const totalNodesCount = activeEvent?.nodes.length || 0;
  const progressPercent = totalNodesCount > 0 ? Math.round((completedNodesCount / totalNodesCount) * 100) : 0;

  return (
    <div className="h-full bg-[#F7F8FA] flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-xs relative animate-in fade-in duration-300">
      {/* 实时反馈 Toast */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 bg-[#171A21] text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 主体工作台：左侧树形目录 + 右侧事件沉浸式工作台（图2布局） */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左侧：图 2 风格多级目录树侧边栏 */}
        <div
          className={`${
            isSidebarOpen ? 'w-80 lg:w-[320px] xl:w-[340px]' : 'w-16'
          } shrink-0 h-full transition-all duration-300`}
        >
          <UniversalTreeSidebar<EventFlow>
            items={events}
            folders={folders}
            activeId={activeEventId || undefined}
            isOpen={isSidebarOpen}
            onToggleOpen={() => setIsSidebarOpen((prev) => !prev)}
            onSelectItem={(id) => setActiveEventId(id)}
            onCreateNewItem={(folderId) => handleDirectCreateEvent(folderId)}
            onDeleteItem={(id) => deleteEvent(id)}
            onCreateFolder={(name, parentId) => {
              createFolder(name, parentId);
              showToast('已新建事件分组');
            }}
            onRenameFolder={(id, newName) => {
              renameFolder(id, newName);
              showToast('已重命名分组');
            }}
            onDeleteFolder={(id) => {
              deleteFolder(id);
              showToast('已删除分组');
            }}
            onToggleFolderExpand={toggleFolderExpand}
            onMoveItem={(eventId, folderId) => {
              moveEventToFolder(eventId, folderId);
              showToast('已移动事件至目标分组');
            }}
            renderItemExtra={(event) => (
              <span className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`w-2 h-2 rounded-full ${
                    event.status === 'in_progress' ? 'bg-indigo-500' : 'bg-emerald-500'
                  }`}
                  title={event.status === 'in_progress' ? '进行中' : '已闭环'}
                />
                <span className="text-[10px] text-stone-400">
                  {event.nodes?.filter((n) => n.status === 'completed').length || 0}/
                  {event.nodes?.length || 0}
                </span>
              </span>
            )}
          />
        </div>

        {/* 右侧：事件深度查看与 CardBlockEditor 块编辑工作台（与工作日记、传记格式完全一致） */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto p-4 md:p-6 scrollbar-refined">
          {activeEvent ? (
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
              {/* 事件主视区头部栏 */}
              <div className="px-6 md:px-8 pt-5 md:pt-6 pb-2.5 space-y-3 bg-gradient-to-b from-stone-50/50 to-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* 分类与状态 Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        CATEGORY_STYLE_MAP[activeEvent.category]?.color || 'bg-stone-50 text-stone-700'
                      }`}
                    >
                      {activeEvent.category}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                        activeEvent.status === 'in_progress'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {activeEvent.status === 'in_progress' ? '● 进行中' : '✓ 已完成闭环'}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        PRIORITY_BADGE_MAP[activeEvent.priority]?.color || 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      {PRIORITY_BADGE_MAP[activeEvent.priority]?.label || '常规'}
                    </span>
                  </div>

                  {/* 工具按钮组 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 空按钮：AI 复盘/总结 */}
                    <button
                      type="button"
                      onClick={() => {}}
                      className="px-2.5 py-1 text-xs rounded-lg border border-purple-200 bg-purple-50/70 text-purple-800 hover:bg-purple-100 transition-colors flex items-center gap-1 shadow-2xs font-medium cursor-pointer"
                      title="AI 复盘"
                    >
                      <Sparkles size={12} className="text-purple-600" />
                      <span>AI 复盘</span>
                    </button>

                    {/* 流程拓扑图展开/折叠 */}
                    <button
                      type="button"
                      onClick={() => setIsChartExpanded((prev) => !prev)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors flex items-center gap-1 shadow-2xs font-medium cursor-pointer ${
                        isChartExpanded
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                      title={isChartExpanded ? '收起流程拓扑图' : '展开流程拓扑图'}
                    >
                      <Workflow size={12} className={isChartExpanded ? 'text-indigo-600' : 'text-slate-600'} />
                      <span>{isChartExpanded ? '收起流程图' : '展开流程图'}</span>
                    </button>

                    {/* 底层标准 JSON 抽屉 */}
                    <button
                      type="button"
                      onClick={() => setActiveJsonDrawerEvent(activeEvent)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1 shadow-2xs font-medium cursor-pointer"
                      title="查看底层自解释标准 JSON"
                    >
                      <Code2 size={12} className="text-slate-600" />
                      <span>底层 JSON</span>
                    </button>

                    {/* 推进下一步 */}
                    <button
                      type="button"
                      onClick={() => setNextStepModalEvent(activeEvent)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-[#5146D8] transition-colors flex items-center gap-1 shadow-2xs font-medium cursor-pointer"
                      title="推进下一步流程节点"
                    >
                      <Plus size={12} />
                      <span>下一步</span>
                    </button>

                    {/* 开辟分支 */}
                    <button
                      type="button"
                      onClick={() => {
                        setBranchModalEvent(activeEvent);
                        setBranchSourceNodeId(activeEvent.nodes[activeEvent.nodes.length - 1]?.id || '');
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors flex items-center gap-1 shadow-2xs font-medium cursor-pointer"
                      title="从节点开辟并行分支"
                    >
                      <GitBranch size={12} />
                      <span>开辟分支</span>
                    </button>

                    {/* 达成闭环 / 重启事件 */}
                    {activeEvent.status === 'in_progress' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setClosureModalEvent(activeEvent);
                          setClosureSummary(activeEvent.closureSummary || '');
                        }}
                        className="px-2.5 py-1 text-xs rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors flex items-center gap-1 shadow-2xs font-semibold cursor-pointer"
                        title="达成闭环并归档至已完成库"
                      >
                        <Flag size={12} className="text-emerald-600" />
                        <span>达成闭环</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          reopenEvent(activeEvent.id);
                          showToast('事件已重新激活为推进中');
                        }}
                        className="px-2.5 py-1 text-xs rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors flex items-center gap-1 shadow-2xs font-medium cursor-pointer"
                        title="重新激活为推进中事件"
                      >
                        <RotateCcw size={12} className="text-amber-600" />
                        <span>重启事件</span>
                      </button>
                    )}

                    {/* 追加附件 */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1 shadow-2xs font-medium cursor-pointer"
                      title="上传图文附件"
                    >
                      <Paperclip size={12} className="text-slate-600" />
                      <span>追加附件</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept="image/*,.pdf,.txt,.md,.json"
                    />

                    {/* 从 JSON 导入 */}
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(true)}
                      className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
                      title="从大模型 JSON 一键导入新事件"
                    >
                      <Upload size={14} />
                    </button>

                    {/* 导出为 PDF 与 导出为 MD */}
                    <ExportActionButtons
                      options={{
                        title: activeEvent.title,
                        date: activeEvent.updatedAt ? new Date(activeEvent.updatedAt).toISOString().slice(0, 10) : undefined,
                        updatedAt: activeEvent.updatedAt,
                        tags: [activeEvent.category, activeEvent.status, activeEvent.priority],
                        content: activeEvent.description,
                        blocks: activeEvent.blocks,
                        extraMeta: {
                          '事件类别': activeEvent.category,
                          '当前状态': activeEvent.status === 'resolved' ? '已达成闭环' : '持续推进中',
                          '优先级': activeEvent.priority.toUpperCase(),
                        },
                        extraSections: [
                          {
                            title: '事件推进节点拓扑清单',
                            content: activeEvent.nodes
                              .map(
                                (n, i) =>
                                  `${i + 1}. [${n.status === 'completed' ? 'x' : ' '}] **${n.title}**（${n.status === 'completed' ? '已达成' : n.status === 'in_progress' ? '进行中' : '待处理'}）${n.description ? `：${n.description}` : ''}`
                              )
                              .join('\n'),
                          },
                          ...(activeEvent.finalReflection
                            ? [{ title: '闭环复盘与经验沉淀', content: activeEvent.finalReflection }]
                            : []),
                        ],
                      }}
                      showToast={showToast}
                    />

                    {/* 删除 */}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`确定要删除事件流程【${activeEvent.title}】吗？`)) {
                          deleteEvent(activeEvent.id);
                          showToast('事件流程已删除');
                        }
                      }}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
                      title="删除事件流程"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* 大标题：点击就地直接编辑 */}
                <div className="w-full">
                  <input
                    type="text"
                    value={activeEvent.title}
                    onChange={(e) => updateEvent(activeEvent.id, { title: e.target.value })}
                    placeholder="输入事件标题..."
                    className="w-full text-xl md:text-2xl font-bold text-stone-900 tracking-tight leading-snug bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#5146D8] focus:bg-slate-50/50 outline-none rounded-lg px-2 py-1 -ml-2 transition-all cursor-text placeholder:text-stone-300"
                    title="点击直接编辑事件标题"
                  />
                </div>

                {/* 核心指标统计条（严格与图 1 格式完全一致） */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-500 pt-2 border-t border-stone-100">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-blue-500" />
                    <span>
                      日期：
                      <strong className="text-stone-700">
                        {activeEvent.createdAt ? activeEvent.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                      </strong>
                    </span>
                  </span>
                  <span>
                    正文字数：
                    <strong className="text-stone-800 font-semibold">{eventWordCount} 字</strong>
                  </span>
                  <span>
                    配套附件：
                    <strong className="text-stone-800 font-semibold">
                      {(activeEvent as any).attachments?.length || 0} 份
                    </strong>
                  </span>
                  <span>
                    更新时间：
                    <span className="text-stone-500">
                      {new Date(activeEvent.updatedAt || activeEvent.createdAt || Date.now()).toLocaleString('zh-CN')}
                    </span>
                  </span>
                </div>
              </div>

              {/* 事件正文与块编辑区 */}
              <div className="px-6 md:px-8 pt-1 pb-6 md:pb-8 bg-white space-y-4">
                {/* 流程拓扑图画布（可展开收起） */}
                {isChartExpanded && (
                  <div className="rounded-2xl border border-indigo-100 overflow-hidden shadow-xs bg-slate-900/5 transition-all animate-in fade-in">
                    <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                      <span className="font-semibold flex items-center gap-1.5 text-indigo-700">
                        <Workflow size={13} />
                        <span>流程拓扑全景图 · Vue Flow 规范</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsChartExpanded(false)}
                        className="text-stone-400 hover:text-stone-700 text-xs flex items-center gap-0.5 cursor-pointer"
                      >
                        <ChevronUp size={13} /> 收起
                      </button>
                    </div>
                    <div className="h-[360px] md:h-[420px] w-full">
                      <EventFlowChart event={activeEvent} />
                    </div>
                  </div>
                )}

                {/* 核心节点达成进度条与轻量折叠清单 */}
                <div className="p-3.5 rounded-xl bg-stone-50/70 border border-stone-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-600 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-800">当前阶段：</span>
                      <span className="text-stone-600 font-medium">{activeEvent.currentStage || '推进中'}</span>
                      <span className="text-stone-300">|</span>
                      <span>
                        流程节点：
                        <strong className="text-stone-800 font-semibold">
                          {completedNodesCount} / {totalNodesCount} 项达成 ({progressPercent}%)
                        </strong>
                      </span>
                      {activeEvent.branches && activeEvent.branches.length > 0 && (
                        <span className="text-purple-600 font-medium">
                          • 分支数: {activeEvent.branches.length} 条
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNodesListExpanded((prev) => !prev)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{isNodesListExpanded ? '收起节点清单' : '查看/管理节点清单'}</span>
                      {isNodesListExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  {/* 进度条 */}
                  <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        progressPercent === 100 ? 'bg-emerald-500' : 'bg-[#5146D8]'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* 展开的节点清单与操作 */}
                  {isNodesListExpanded && (
                    <div className="pt-2 space-y-2 border-t border-stone-200/60 animate-in fade-in">
                      {activeEvent.nodes.map((node) => (
                        <div
                          key={node.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-stone-200/80 text-xs gap-2"
                        >
                          <div className="flex items-center gap-2 truncate flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                const nextStatus = node.status === 'completed' ? 'in_progress' : 'completed';
                                updateNode(activeEvent.id, node.id, { status: nextStatus });
                                showToast(`已将节点【${node.name}】状态切换为 ${nextStatus === 'completed' ? '已达成' : '进行中'}`);
                              }}
                              className={`p-1 rounded cursor-pointer transition-colors ${
                                node.status === 'completed'
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-stone-400 hover:bg-stone-100'
                              }`}
                              title={node.status === 'completed' ? '标记为进行中' : '标记为已达成'}
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <span
                              className={`truncate font-medium ${
                                node.status === 'completed' ? 'line-through text-stone-400' : 'text-stone-800'
                              }`}
                            >
                              {node.name}
                            </span>
                            {node.assignee && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                                {node.assignee}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              deleteNode(activeEvent.id, node.id);
                              showToast('已删除节点');
                            }}
                            className="p-1 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                            title="删除节点"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 闭环总结成果报告（若已闭环展示） */}
                {activeEvent.status === 'completed' && activeEvent.closureSummary && (
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 space-y-1">
                    <span className="font-semibold flex items-center gap-1.5 text-emerald-800">
                      <FileCheck size={14} className="text-emerald-600" />
                      <span>全流程闭环总结报告</span>
                    </span>
                    <p className="whitespace-pre-line leading-relaxed font-sans">{activeEvent.closureSummary}</p>
                  </div>
                )}

                {/* 正文：基于 CardBlockEditor 所见即所得编辑与阅读展示（支持表格、清单、引用等） */}
                <CardBlockEditor
                  card={eventAsCard}
                  isExpanded={true}
                  hideTitle={true}
                  onUpdateCard={handleUpdateCard}
                />

                {/* 配套附件展示区 */}
                {(activeEvent as any).attachments && (activeEvent as any).attachments.length > 0 && (
                  <div className="pt-4 border-t border-stone-100 space-y-2">
                    <span className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                      <Paperclip size={13} /> 配套附件清单 ({(activeEvent as any).attachments.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {(activeEvent as any).attachments.map((att: any) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate flex-1">
                            {att.type === 'image' ? (
                              <ImageIcon size={14} className="text-blue-500 shrink-0" />
                            ) : (
                              <Paperclip size={14} className="text-slate-500 shrink-0" />
                            )}
                            <span className="truncate text-stone-800">{att.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = ((activeEvent as any).attachments || []).filter((a: any) => a.id !== att.id);
                              updateEvent(activeEvent.id, { attachments: remaining } as any);
                            }}
                            className="p-1 text-stone-400 hover:text-rose-500 transition-colors ml-1 cursor-pointer"
                            title="删除附件"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-[#6B7280] h-full">
              <div className="max-w-xs space-y-3">
                <Workflow size={36} className="mx-auto text-[#9CA3AF] stroke-[1.5]" />
                <p className="text-sm">请在左侧选择或新建一个事件流程开启推进</p>
                <button
                  type="button"
                  onClick={() => handleDirectCreateEvent()}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[#5146D8] text-white hover:bg-[#4338CA] transition-colors cursor-pointer"
                >
                  创建首个事件
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 弹窗 1: 推进下一步节点 */}
      {nextStepModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-[#5146D8]" />
                <span>推进下一步节点</span>
              </h3>
              <button
                type="button"
                onClick={() => setNextStepModalEvent(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleNextStepSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  节点名称 / 下一步行动 *
                </label>
                <input
                  type="text"
                  required
                  value={nextStepName}
                  onChange={(e) => setNextStepName(e.target.value)}
                  placeholder="例如：方案评审、联调提测、代码合并..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5146D8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  推进要求与说明（选填）
                </label>
                <textarea
                  rows={3}
                  value={nextStepDesc}
                  onChange={(e) => setNextStepDesc(e.target.value)}
                  placeholder="说明本节点的具体标准或验证条件..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5146D8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  责任人 / 协同智能体
                </label>
                <input
                  type="text"
                  value={nextStepAssignee}
                  onChange={(e) => setNextStepAssignee(e.target.value)}
                  placeholder="例如：前端架构师、测试团队、AI Agent"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5146D8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNextStepModalEvent(null)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#5146D8] hover:bg-[#4338CA] text-white cursor-pointer"
                >
                  确认推进
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 弹窗 2: 开辟新分支 */}
      {branchModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GitBranch size={18} className="text-purple-600" />
                <span>开辟并行分支</span>
              </h3>
              <button
                type="button"
                onClick={() => setBranchModalEvent(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBranchSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  分支名称 *
                </label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="例如：分支A: 移动端适配与手势优化..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5146D8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  分支首个启动节点名称 *
                </label>
                <input
                  type="text"
                  required
                  value={branchFirstNodeName}
                  onChange={(e) => setBranchFirstNodeName(e.target.value)}
                  placeholder="例如：梳理触控拖拽与屏幕尺寸断点..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5146D8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  分支来源父节点
                </label>
                <select
                  value={branchSourceNodeId}
                  onChange={(e) => setBranchSourceNodeId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5146D8] bg-white cursor-pointer"
                >
                  {branchModalEvent.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  分支说明（选填）
                </label>
                <textarea
                  rows={2}
                  value={branchDesc}
                  onChange={(e) => setBranchDesc(e.target.value)}
                  placeholder="分支目的及独立演进说明..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5146D8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBranchModalEvent(null)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                >
                  确认开辟分支
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 弹窗 3: 事件闭环归档 */}
      {closureModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Flag size={18} className="text-emerald-600" />
                <span>事件达成闭环 · 归档至已完成库</span>
              </h3>
              <button
                type="button"
                onClick={() => setClosureModalEvent(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmClosure} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  闭环复盘总结报告 (Closure Summary)
                </label>
                <button
                  type="button"
                  onClick={handleAiGenerateClosureSummary}
                  disabled={isAiGeneratingSummary}
                  className="text-xs text-[#5146D8] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Sparkles size={12} className={isAiGeneratingSummary ? 'animate-spin' : ''} />
                  <span>{isAiGeneratingSummary ? 'AI 生成中...' : 'AI 总结复盘'}</span>
                </button>
              </div>

              <textarea
                rows={5}
                value={closureSummary}
                onChange={(e) => setClosureSummary(e.target.value)}
                placeholder="总结本次事件达成的主要交付物、关键突破、分支收敛情况与经验复盘..."
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 leading-relaxed"
              />

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-950">
                💡 确认闭环后，事件将自动移入<strong>「已完成库」</strong>，所有未完节点均将被标为达成，底层 JSON 将记录闭环时间戳与成果报告。
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClosureModalEvent(null)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  确认闭环并归档
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 弹窗 4: 从大模型 JSON 导入 */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Code2 size={18} className="text-[#5146D8]" />
                <span>从大模型 JSON 一键导入事件</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportJsonSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  粘贴大模型生成的标准 JSON 数据
                </label>
                <textarea
                  rows={10}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`{\n  "title": "架构性能演进事件",\n  "category": "架构演进",\n  "nodes": [\n    { "id": "n1", "name": "阶段一", "type": "start", "status": "completed" }\n  ]\n}`}
                  className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5146D8] bg-slate-50 text-slate-900 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#5146D8] hover:bg-[#4338CA] text-white cursor-pointer"
                >
                  解析并导入事件
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 底层标准 JSON 抽屉 */}
      <EventJsonDrawer
        event={activeJsonDrawerEvent}
        isOpen={!!activeJsonDrawerEvent}
        onClose={() => setActiveJsonDrawerEvent(null)}
      />
    </div>
  );
};
