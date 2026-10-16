import { AiHtmlGeneratorButton } from '../common/AiHtmlGeneratorButton';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 工作日记与随笔复盘视图组件
 * 采用图 2 标杆现代化双栏工作台布局：
 * 左侧：UniversalTreeSidebar 多级目录树形侧边栏（支持创建多级目录、拖拽快速调整日记归档路径）
 * 右侧：深度查看与 CardBlockEditor 所见即所得块编辑工作台
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BookOpen,
  Sparkles,
  Pin,
  Copy,
  Check,
  Trash2,
  Tag,
  Plus,
  Calendar,
  Smile,
  CloudSun,
  PenLine,
  Paperclip,
  Image as ImageIcon,
  Code2,
  Eye,
  Upload,
  Edit3,
  ChevronRight,
  Clock,
  Zap,
} from 'lucide-react';
import { useJournal } from '../../hooks/useJournal';
import {
  JOURNAL_CATEGORIES,
  MOOD_CONFIGS,
  WEATHER_CONFIGS,
  type JournalCategory,
  type MoodType,
  type WeatherType,
  type JournalEntry,
} from '../../types/journal';
import type { KnowledgeAttachment } from '../../types/knowledgeClip';
import type { GenericCardEntity, CardBlock } from '../../types/cardBlock';
import { CardBlockEditor } from '../journal/CardBlockEditor';
import { UniversalTreeSidebar } from '../common/UniversalTreeSidebar';
import { ExportActionButtons } from '../common/ExportActionButtons';
import { KnowledgeCardWorkspace } from '../common/KnowledgeCardWorkspace';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { formatTime } from '../../utils';
import {
  getPendingAiDraft,
  clearPendingAiDraft,
  type PendingAiDraft,
} from '../../services/smartRouterService';

export const JournalView: React.FC = () => {
  const {
    entries,
    folders,
    activeEntryId,
    activeEntry,
    setActiveEntryId,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleFolderExpand,
    moveEntryToFolder,
    addEntry,
    updateEntry,
    deleteEntry,
    togglePin,
    addAttachmentToEntry,
    removeAttachmentFromEntry,
  } = useJournal();

  // 侧边栏折叠与全局提示
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [targetFolderIdForCreate, setTargetFolderIdForCreate] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2500);
  }, []);

  // 复制反馈
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 附件上传 input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 附件全屏预览
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // AI 待审阅草稿状态与人工确认模式
  const [pendingDraft, setPendingDraft] = useState<PendingAiDraft | null>(() => getPendingAiDraft());
  const [isReviewingDraft, setIsReviewingDraft] = useState<boolean>(() => {
    const d = getPendingAiDraft();
    return Boolean(d && d.taskType === 'journal');
  });

  // 草稿就地编辑副本
  const [draftTitle, setDraftTitle] = useState(() => pendingDraft?.title || '');
  const [draftBlocks, setDraftBlocks] = useState<CardBlock[]>(() => pendingDraft?.blocks || []);
  const [draftCategory, setDraftCategory] = useState<JournalCategory>(
    () => (pendingDraft?.category as JournalCategory) || 'work'
  );
  const [draftTags, setDraftTags] = useState<string[]>(() => pendingDraft?.tags || []);

  // 跨组件与事件实时同步待确认草稿
  useEffect(() => {
    const syncDraft = () => {
      const d = getPendingAiDraft();
      setPendingDraft(d);
      if (d && d.taskType === 'journal') {
        setIsReviewingDraft(true);
        setDraftTitle(d.title);
        setDraftBlocks(d.blocks || []);
        setDraftCategory((d.category as JournalCategory) || 'work');
        setDraftTags(d.tags || []);
      }
    };
    syncDraft();
    window.addEventListener('hk-pending-draft-change', syncDraft);
    window.addEventListener('storage', syncDraft);
    return () => {
      window.removeEventListener('hk-pending-draft-change', syncDraft);
      window.removeEventListener('storage', syncDraft);
    };
  }, []);

  // 确认入库（正式保存）
  const handleConfirmDraftToLibrary = () => {
    if (!pendingDraft) return;
    const newEntry = addEntry({
      title: draftTitle.trim() || pendingDraft.title,
      content: pendingDraft.content || pendingDraft.summary,
      date: new Date().toISOString().slice(0, 10),
      category: draftCategory,
      mood: (pendingDraft.mood as MoodType) || 'excited',
      weather: (pendingDraft.weather as WeatherType) || 'sunny',
      tags: draftTags,
      blocks: draftBlocks,
      aiReflection: pendingDraft.aiReflection || pendingDraft.summary,
    });

    clearPendingAiDraft();
    setIsReviewingDraft(false);
    setActiveEntryId(newEntry.id);
    showToast(`🎉 恭喜！日记《${newEntry.title}》已完成人工确认，正式沉淀入库！`);
  };

  // 放弃草稿
  const handleDiscardDraft = () => {
    clearPendingAiDraft();
    setIsReviewingDraft(false);
    showToast('已放弃当前 AI 草稿');
  };

  // 草稿实体的通用卡片包装
  const draftGenericCard: GenericCardEntity = useMemo(() => {
    if (!pendingDraft) return { id: '', title: '' };
    return {
      id: 'pending-ai-draft-card',
      title: draftTitle,
      summary: pendingDraft.summary,
      category: draftCategory,
      blocks: draftBlocks,
      globalFontSize: '16',
    };
  }, [pendingDraft, draftTitle, draftCategory, draftBlocks]);

  const handleUpdateDraftCard = useCallback((updated: Partial<GenericCardEntity>) => {
    if (updated.title !== undefined) setDraftTitle(updated.title);
    if (updated.blocks !== undefined) setDraftBlocks(updated.blocks);
  }, []);

  // 当前选中的日记作为通用的 CardBlockEditor 实体
  const activeEntryAsGenericCard: GenericCardEntity = useMemo(() => {
    if (!activeEntry) return { id: '', title: '' };
    return {
      id: activeEntry.id,
      title: activeEntry.title,
      summary: activeEntry.content,
      category: activeEntry.category,
      blocks: activeEntry.blocks,
      globalFontSize: activeEntry.globalFontSize || '16',
    };
  }, [activeEntry]);

  // 更新卡片块内容
  const handleUpdateCard = useCallback(
    (updated: Partial<GenericCardEntity>) => {
      if (!activeEntry) return;
      updateEntry(activeEntry.id, {
        title: updated.title !== undefined ? updated.title : activeEntry.title,
        content: updated.summary !== undefined ? updated.summary : activeEntry.content,
        blocks: updated.blocks,
        globalFontSize: updated.globalFontSize,
        updatedAt: Date.now(),
      });
    },
    [activeEntry, updateEntry]
  );

  // 复制日记内容
  const handleCopyEntry = (entry: JournalEntry) => {
    const text = `【${entry.title}】（${entry.date}）\n${entry.content}`;
    navigator.clipboard.writeText(text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('已复制日记全文到剪贴板');
  };

  // 一键直接新建日记（无需复杂属性弹窗，直接创建并激活就地编辑）
  const handleDirectCreateEntry = useCallback(
    (folderId: string | null = null) => {
      const today = new Date().toISOString().slice(0, 10);
      const created = addEntry({
        title: `${today} 工作日记`,
        content: '',
        date: today,
        folderId: folderId || null,
        tags: [],
      });
      setIsReviewingDraft(false);
      setActiveEntryId(created.id);
      showToast('已创建新日记，点击标题即可直接编辑');
    },
    [addEntry, setActiveEntryId, showToast]
  );

  // 附件上传处理
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeEntry) return;

    const isImg = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const newAtt: KnowledgeAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        type: isImg ? 'image' : 'file',
        size: `${(file.size / 1024).toFixed(1)} KB`,
        url: base64,
        uploadedAt: Date.now(),
      };
      addAttachmentToEntry(activeEntry.id, newAtt);
      showToast(`已追加附件【${file.name}】`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const activeCatConfig = activeEntry
    ? JOURNAL_CATEGORIES.find((c) => c.id === activeEntry.category)
    : null;
  const activeMoodConfig = activeEntry
    ? MOOD_CONFIGS.find((m) => m.id === activeEntry.mood)
    : null;
  const activeWeatherConfig = activeEntry
    ? WEATHER_CONFIGS.find((w) => w.id === activeEntry.weather)
    : null;

  return (
    <div className="h-full bg-[#F7F8FA] flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-xs relative animate-in fade-in duration-300">
      {/* 全局轻量 Toast 提示 */}
      {toastMessage && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/90 text-white text-xs font-medium rounded-full shadow-lg backdrop-blur-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 主体分栏：左侧多级目录树形侧边栏 + 右侧深度研读工作台 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左侧：图 2 风格多级目录树侧边栏 */}
        <div
          className={`${
            isSidebarOpen ? 'w-80 lg:w-[320px] xl:w-[340px]' : 'w-16'
          } shrink-0 h-full transition-all duration-300 flex flex-col`}
        >
          {/* AI 待审阅草稿浮层提示卡片 */}
          {isSidebarOpen && pendingDraft && pendingDraft.taskType === 'journal' && (
            <div className="p-3 border-b border-indigo-100 bg-linear-to-r from-indigo-50/90 to-purple-50/60">
              <div
                onClick={() => setIsReviewingDraft(true)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isReviewingDraft
                    ? 'bg-white border-[#5146D8] shadow-xs ring-2 ring-[#5146D8]/15'
                    : 'bg-white/80 border-indigo-200/60 hover:bg-white hover:border-[#5146D8]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-semibold text-[#5146D8] flex items-center gap-1">
                    <Sparkles size={12} className="animate-pulse" />
                    <span>AI 待审阅草稿</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-600 font-medium border border-rose-200 animate-pulse">
                    待确认
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {draftTitle || pendingDraft.title}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                  点击在右侧查看格式并人工确认入库
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
            <UniversalTreeSidebar<JournalEntry>
              items={entries}
              folders={folders}
              activeId={isReviewingDraft ? null : activeEntryId}
              isOpen={isSidebarOpen}
              onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
              onSelectItem={(id) => {
                setIsReviewingDraft(false);
                setActiveEntryId(id);
              }}
              onCreateNewItem={(folderId) => {
                handleDirectCreateEntry(folderId || null);
              }}
              onDeleteItem={(id) => deleteEntry(id)}
              onCreateFolder={createFolder}
              onRenameFolder={renameFolder}
              onDeleteFolder={deleteFolder}
              onToggleFolderExpand={toggleFolderExpand}
              onMoveItemToFolder={moveEntryToFolder}
              showToast={showToast}
              createBtnText="写新日记"
              itemNoun="篇日记"
              searchPlaceholder="搜索日记主题、正文或标签..."
              renderItemIcon={() => (
                <div className="w-6 h-6 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[#5146D8] flex items-center justify-center shrink-0">
                  <BookOpen size={13} />
                </div>
              )}
              renderItemBadge={() => null}
              renderItemSubtext={(item) => (
                <span className="text-[10px] text-slate-400">{item.date}</span>
              )}
            />
          </div>
        </div>

        {/* 右侧：深度查看与 CardBlockEditor 块编辑工作台 */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto p-4 md:p-6 scrollbar-refined">
          {/* A. 优先呈现：AI 生成草稿 · 待人工确认工作台 */}
          {isReviewingDraft && pendingDraft ? (
            <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden divide-y divide-indigo-100 animate-in fade-in duration-200">
              {/* 顶部专属审阅横幅 */}
              <div className="p-5 md:p-6 bg-gradient-to-r from-[#5146D8] via-indigo-700 to-[#4338CA] text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm flex items-center gap-1">
                        <Sparkles size={12} className="animate-spin" />
                        AI 智能生成草稿 · 待人工确认
                      </span>
                      <span className="text-xs text-indigo-100">
                        匹配置信度: {pendingDraft.confidence}%
                      </span>
                    </div>
                    <p className="text-xs text-indigo-100/90 max-w-2xl leading-relaxed">
                      💡 AI 已根据您的自然语言输入自动构建了日记主题、核心复盘与排版格式。您可在下方直接微调正文与组件，确认无误后点击「确认入库」正式沉淀入库。
                    </p>
                  </div>

                  {/* 核心操作按钮组 */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmDraftToLibrary}
                      className="px-4 py-2 rounded-xl bg-white text-[#5146D8] hover:bg-indigo-50 font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:scale-102 active:scale-98"
                    >
                      <Check size={14} strokeWidth={2.5} />
                      <span>✨ 确认入库（正式保存）</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>放弃草稿</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 草稿元信息栏 */}
              <div className="px-6 md:px-8 pt-5 md:pt-6 pb-2.5 space-y-3 bg-gradient-to-b from-slate-50/50 to-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-[#5146D8] font-medium">
                      {JOURNAL_CATEGORIES.find((c) => c.id === draftCategory)?.label || '工作复盘'}
                    </span>
                    <span className="text-xs text-slate-400">
                      录入日期: {new Date().toISOString().slice(0, 10)}
                    </span>
                    {draftTags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">
                    来源输入: {pendingDraft.sourcePrompt.slice(0, 30)}...
                  </span>
                </div>

                <div>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="日记标题..."
                    className="w-full text-xl md:text-2xl font-bold text-stone-900 tracking-tight leading-snug bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#5146D8] outline-hidden px-1 py-0.5 transition-colors"
                  />
                </div>
              </div>

              {/* 草稿正文与块编辑区：通过 CardBlockEditor 渲染 */}
              <div className="px-6 md:px-8 pt-1 pb-6 md:pb-8 bg-white space-y-4">
                <CardBlockEditor
                  key={`draft-${pendingDraft.id}-${draftBlocks.length}`}
                  card={draftGenericCard}
                  onUpdateCard={handleUpdateDraftCard}
                  hideTitle={true}
                />

              </div>
            </div>
          ) : activeEntry ? (
            <KnowledgeCardWorkspace
              title={activeEntry.title}
              onUpdateTitle={(title) => updateEntry(activeEntry.id, { title, updatedAt: Date.now() })}
              titlePlaceholder="输入日记标题..."
              date={activeEntry.date}
              updatedAt={activeEntry.updatedAt || activeEntry.createdAt}
              genericCard={activeEntryAsGenericCard}
              onUpdateCard={handleUpdateCard}
              tags={activeEntry.tags || []}
              onUpdateTags={(newTags) => updateEntry(activeEntry.id, { tags: newTags, updatedAt: Date.now() })}
              pinBadge={{
                isPinned: !!activeEntry.isPinned,
                onTogglePin: () => togglePin(activeEntry.id),
              }}
              headerCustomActions={
                <>
                  <AiHtmlGeneratorButton
                    label="AI 复盘"
                    sourceType="journal"
                    sourceId={activeEntry.id}
                    title={activeEntry.title}
                    source={activeEntry}
                  />
                  <button
                    type="button"
                    onClick={() => togglePin(activeEntry.id)}
                    className={`p-1.5 rounded-lg border transition-colors shadow-2xs cursor-pointer ${
                      activeEntry.isPinned
                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                    title={activeEntry.isPinned ? '取消置顶' : '设为置顶'}
                  >
                    <Pin size={14} className={activeEntry.isPinned ? 'fill-amber-500' : ''} />
                  </button>
                </>
              }
              attachments={activeEntry.attachments || []}
              onUploadAttachment={(file) => {
                const isImg = file.type.startsWith('image/');
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = reader.result as string;
                  const newAtt: KnowledgeAttachment = {
                    id: `att-${Date.now()}`,
                    name: file.name,
                    type: isImg ? 'image' : 'file',
                    size: `${(file.size / 1024).toFixed(1)} KB`,
                    url: base64,
                    uploadedAt: Date.now(),
                  };
                  addAttachmentToEntry(activeEntry.id, newAtt);
                  showToast(`已追加附件【${file.name}】`);
                };
                reader.readAsDataURL(file);
              }}
              onDeleteAttachment={(attachmentId) => {
                removeAttachmentFromEntry(activeEntry.id, attachmentId);
                showToast('已移除附件');
              }}
              exportOptions={{
                title: activeEntry.title,
                date: activeEntry.date,
                updatedAt: activeEntry.updatedAt,
                tags: activeEntry.tags,
                content: activeEntry.content,
                blocks: activeEntry.blocks,
              }}
              onDelete={() => {
                deleteEntry(activeEntry.id);
                showToast(`已删除日记《${activeEntry.title}》`);
              }}
              deleteConfirmTitle={`确定要删除日记【${activeEntry.title}】吗？`}
              showToast={showToast}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center text-stone-400">
              请在左侧选择一篇日记开启查看与编辑
            </div>
          )}
        </div>
      </div>

      {/* 图片附件预览 */}
      {previewImage && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewImage(null)}
          title={previewImage.title}
          maxWidth="max-w-3xl"
        >
          <div className="p-2 flex items-center justify-center bg-black/5 rounded-xl">
            <img src={previewImage.url} alt={previewImage.title} className="max-h-[70vh] rounded-lg object-contain" />
          </div>
        </Modal>
      )}
    </div>
  );
};
