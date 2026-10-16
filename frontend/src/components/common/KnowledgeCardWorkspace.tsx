/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 个人知识库统一工作台卡片底座 (KnowledgeCardWorkspace)
 * 严格以「工作日记」为基准标准架构：
 * 1. 一体化圆角白底大卡片与滚动容器
 * 2. 顶部统一工具栏（左侧业务Badges，右侧AI复盘/追加附件/导出PDF/导出MD/删除）
 * 3. 原生无缝大标题行内编辑
 * 4. 图1标准四要素核心指标条 (📅 日期、正文字数、配套附件、更新时间)
 * 5. 前置场景插槽 (beforeContent：名言金句、商业结论战略框、外链卡片)
 * 6. 通用 CardBlockEditor 块编辑器 (所见即所得改色标注、表格组件增删复制粘贴、Markdown等)
 * 7. 后置场景插槽 (afterContent：传记生平纪年时间轴、深度复盘分析等)
 * 8. 底部配套附件清单网格与管理
 */

import React, { useRef } from 'react';
import {
  Calendar,
  Paperclip,
  Trash2,
  Image as ImageIcon,
  FileText,
  X,
  ExternalLink,
  Plus,
  Pin,
  Tag as TagIcon,
} from 'lucide-react';
import { CardBlockEditor } from '../journal/CardBlockEditor';
import { ExportActionButtons } from './ExportActionButtons';
import { Modal } from '../ui/Modal';
import type { GenericCardEntity } from '../../types/cardBlock';
import type { ExportCardOptions } from '../../utils/exportHelpers';

export interface KnowledgeCardWorkspaceProps {
  // 基础信息
  title: string;
  onUpdateTitle: (title: string) => void;
  titlePlaceholder?: string;
  date?: string;
  updatedAt?: number | string;
  wordCount?: number;

  // 统一标签与分类系统
  tags?: string[];
  onUpdateTags?: (newTags: string[]) => void;
  categoryBadge?: React.ReactNode;
  pinBadge?: {
    isPinned: boolean;
    onTogglePin?: () => void;
  };

  // 块编辑器统一适配对象
  genericCard: GenericCardEntity;
  onUpdateCard: (updated: Partial<GenericCardEntity>) => void;

  // 顶部插槽
  headerBadges?: React.ReactNode;
  headerCustomActions?: React.ReactNode;

  // 附件操作
  attachments?: any[];
  onUploadAttachment?: (file: File) => void;
  onDeleteAttachment?: (attachmentId: string) => void;

  // 导出与删除
  exportOptions?: ExportCardOptions;
  onDelete?: () => void;
  deleteConfirmTitle?: string;
  showToast?: (msg: string) => void;

  // 场景扩展插槽
  beforeContent?: React.ReactNode;
  afterContent?: React.ReactNode;
}

export const KnowledgeCardWorkspace: React.FC<KnowledgeCardWorkspaceProps> = ({
  title,
  onUpdateTitle,
  titlePlaceholder = '输入标题...',
  date,
  updatedAt,
  wordCount,
  tags,
  onUpdateTags,
  categoryBadge,
  pinBadge,
  genericCard,
  onUpdateCard,
  headerBadges,
  headerCustomActions,
  attachments = [],
  onUploadAttachment,
  onDeleteAttachment,
  exportOptions,
  onDelete,
  deleteConfirmTitle,
  showToast,
  beforeContent,
  afterContent,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = React.useState<{ url: string; title: string } | null>(null);

  // 标签创建/输入交互状态
  const [isAddingTag, setIsAddingTag] = React.useState(false);
  const [newTagInput, setNewTagInput] = React.useState('');

  const handleCommitNewTag = () => {
    const raw = newTagInput.trim().replace(/^#+/, '');
    if (!raw) {
      setIsAddingTag(false);
      setNewTagInput('');
      return;
    }

    // 支持逗号或空格分隔批量添加
    const toAdd = raw
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const currentTags = tags || [];
    const merged = Array.from(new Set([...currentTags, ...toAdd]));

    if (onUpdateTags) {
      onUpdateTags(merged);
      if (showToast) {
        showToast(toAdd.length > 1 ? `已添加 ${toAdd.length} 个新标签` : `已添加标签 #${toAdd[0]}`);
      }
    }

    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleDeleteTag = (tagToDelete: string) => {
    if (!onUpdateTags) return;
    const currentTags = tags || [];
    const nextTags = currentTags.filter((t) => t !== tagToDelete);
    onUpdateTags(nextTags);
    if (showToast) {
      showToast(`已移除标签 #${tagToDelete}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadAttachment) {
      onUploadAttachment(file);
      e.target.value = '';
    }
  };

  const formattedDate = date || new Date().toISOString().slice(0, 10);
  const formattedUpdateTime = updatedAt
    ? typeof updatedAt === 'number'
      ? new Date(updatedAt).toLocaleString('zh-CN', { hour12: false })
      : updatedAt
    : new Date().toLocaleString('zh-CN', { hour12: false });

  // 计算字数
  const calculatedWordCount =
    wordCount !== undefined
      ? wordCount
      : genericCard.content?.length ||
        genericCard.blocks?.reduce((acc, b) => acc + (b.content?.length || 0), 0) ||
        0;

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
      {/* 1. 卡片主视区头部栏（背景渐变、工具操作与核心指标条） */}
      <div className="px-6 md:px-8 pt-5 md:pt-6 pb-2.5 space-y-3 bg-gradient-to-b from-stone-50/50 to-white">
        <div className="flex items-start justify-between gap-3">
          {/* 左侧业务 Badges 与统一标签管理区（多标签自适应向内换行，绝不挤压右侧按钮） */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap pt-0.5">
            {/* 置顶指示 Badge */}
            {pinBadge?.isPinned && (
              <span
                onClick={pinBadge.onTogglePin}
                className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/90 flex items-center gap-1 font-semibold shadow-2xs select-none"
                title="已置顶（点击取消）"
              >
                <Pin size={10} className="fill-amber-500 text-amber-600" />
                <span>置顶</span>
              </span>
            )}

            {/* 页面专属拓展 Badges 插槽 */}
            {headerBadges}

            {/* 统一规范的标签 Chips 列表 */}
            {tags &&
              tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 border border-slate-200/90 transition-all group shadow-2xs select-none"
                >
                  <span className="text-slate-400 font-mono text-[11px]">#</span>
                  <span>{tag}</span>
                  {onUpdateTags && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTag(tag);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 -mr-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all cursor-pointer"
                      title={`删除标签 #${tag}`}
                    >
                      <X size={10} />
                    </button>
                  )}
                </span>
              ))}

            {/* 统一的创建/添加标签入口 */}
            {onUpdateTags &&
              (isAddingTag ? (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border border-indigo-400 bg-white shadow-xs ring-2 ring-indigo-500/15 animate-in fade-in duration-150">
                  <span className="text-indigo-500 font-mono text-[11px]">#</span>
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCommitNewTag();
                      } else if (e.key === 'Escape') {
                        setIsAddingTag(false);
                        setNewTagInput('');
                      }
                    }}
                    onBlur={() => {
                      if (newTagInput.trim()) {
                        handleCommitNewTag();
                      } else {
                        setIsAddingTag(false);
                      }
                    }}
                    placeholder="标签名，按回车..."
                    className="w-24 text-xs text-slate-800 outline-none bg-transparent placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTag(true);
                    setTimeout(() => tagInputRef.current?.focus(), 60);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/80 border border-dashed border-slate-300 hover:border-indigo-300 transition-colors shadow-2xs cursor-pointer group"
                  title="为该卡片添加标签"
                >
                  <Plus size={11} className="text-slate-400 group-hover:text-indigo-600" />
                  <span>添加标签</span>
                </button>
              ))}
          </div>

          {/* 右侧核心工具操作栏（固定在右侧，绝不换行断行） */}
          <div className="shrink-0 flex items-center gap-2 self-start ml-auto">
            {/* 页面专属操作（如 AI 复盘/推演、置顶/收藏等） */}
            {headerCustomActions}

            {/* 追加附件按钮 */}
            {onUploadAttachment && (
              <>
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
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.txt,.md,.json"
                />
              </>
            )}

            {/* 统一导出为 PDF 与 导出为 MD */}
            {exportOptions && (
              <ExportActionButtons
                options={exportOptions}
                showToast={showToast}
              />
            )}

            {/* 删除按钮 */}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  const tip = deleteConfirmTitle || `确定要删除【${title}】吗？`;
                  if (confirm(tip)) {
                    onDelete();
                  }
                }}
                className="p-1.5 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
                title="删除此项目"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 2. 大标题：点击直接行内编辑 */}
        <div className="w-full">
          <input
            type="text"
            value={title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            placeholder={titlePlaceholder}
            className="w-full text-xl md:text-2xl font-bold text-stone-900 tracking-tight leading-snug bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#5146D8] focus:bg-slate-50/50 outline-none rounded-lg px-2 py-1 -ml-2 transition-all cursor-text placeholder:text-stone-300"
            title="点击直接编辑标题"
          />
        </div>

        {/* 3. 标准四要素核心指标条（严格对齐图1规范） */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-500 pt-2 border-t border-stone-100">
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-blue-500" />
            <span>
              日期：<strong className="text-stone-700">{formattedDate}</strong>
            </span>
          </span>
          <span>
            正文字数：
            <strong className="text-stone-800 font-semibold">
              {calculatedWordCount} 字
            </strong>
          </span>
          <span>
            配套附件：
            <strong className="text-stone-800 font-semibold">
              {attachments.length} 份
            </strong>
          </span>
          <span>
            更新时间：
            <span className="text-stone-500">{formattedUpdateTime}</span>
          </span>
        </div>
      </div>

      {/* 4. 正文内容区 */}
      <div className="px-6 md:px-8 pt-1 pb-6 md:pb-8 bg-white space-y-4">
        {/* 前置场景专属插槽（如：名言金句、核心商业结论、来源链接卡片） */}
        {beforeContent}

        {/* 统一通用 CardBlockEditor 块编辑器（所见即所得富文本、文字改色、荧光标注、表格组件等） */}
        <CardBlockEditor
          card={genericCard}
          onUpdateCard={onUpdateCard}
          hideTitle={true}
          isExpanded={true}
        />

        {/* 后置场景专属插槽（如：传记纪年时间轴、深度洞察等） */}
        {afterContent}

        {/* 5. 配套附件网格清单展示区 */}
        {attachments.length > 0 && (
          <div className="pt-4 border-t border-stone-100 space-y-2">
            <span className="text-xs font-semibold text-stone-700 flex items-center gap-1">
              <Paperclip size={13} /> 配套附件清单 ({attachments.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {attachments.map((att: any) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200 text-xs hover:border-indigo-300 transition-colors"
                >
                  <div
                    className={`flex items-center gap-2 truncate flex-1 ${
                      att.type === 'image' && att.url ? 'cursor-pointer hover:text-indigo-600' : ''
                    }`}
                    onClick={() => {
                      if (att.type === 'image' && att.url) {
                        setPreviewImage({ url: att.url, title: att.name || '图片预览' });
                      }
                    }}
                    title={att.type === 'image' && att.url ? '点击查看大图预览' : undefined}
                  >
                    {att.type === 'image' ? (
                      <ImageIcon size={14} className="text-blue-500 shrink-0" />
                    ) : (
                      <FileText size={14} className="text-stone-500 shrink-0" />
                    )}
                    <span className="truncate font-medium text-stone-700">
                      {att.name || '未命名附件'}
                    </span>
                    {att.size && (
                      <span className="text-[10px] text-stone-400 shrink-0 font-mono">
                        {att.size}
                      </span>
                    )}
                  </div>
                  {onDeleteAttachment && (
                    <button
                      type="button"
                      onClick={() => onDeleteAttachment(att.id)}
                      className="p-1 text-stone-400 hover:text-rose-500 rounded cursor-pointer transition-colors shrink-0 ml-1"
                      title="移除附件"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 附件大图预览弹窗 */}
      {previewImage && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewImage(null)}
          title={previewImage.title}
          maxWidth="max-w-3xl"
        >
          <div className="p-2 flex items-center justify-center bg-black/5 rounded-xl">
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[70vh] rounded-lg object-contain shadow-sm"
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
