import { AiHtmlGeneratorButton } from '../common/AiHtmlGeneratorButton';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 知识收集与便签中枢视图组件
 * 采用图 2 标杆现代化双栏工作台布局：
 * 左侧：UniversalTreeSidebar 多级目录树形侧边栏（支持创建多级目录、拖拽快速调整知识卡片归档路径）
 * 右侧：深度查看与 CardBlockEditor 所见即所得块编辑工作台
 */

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  BookmarkPlus,
  Search,
  Sparkles,
  Pin,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Tag,
  Plus,
  FileText,
  Paperclip,
  Image as ImageIcon,
  Code2,
  Eye,
  Globe,
  Edit3,
  Clock,
  Layers,
} from 'lucide-react';
import { useKnowledgeClips } from '../../hooks/useKnowledgeClips';
import {
  CLIP_CATEGORIES,
  type ClipCategory,
  type KnowledgeClip,
  type KnowledgeAttachment,
} from '../../types/knowledgeClip';
import type { GenericCardEntity } from '../../types/cardBlock';
import { CardBlockEditor } from '../journal/CardBlockEditor';
import { UniversalTreeSidebar } from '../common/UniversalTreeSidebar';
import { ExportActionButtons } from '../common/ExportActionButtons';
import { KnowledgeCardWorkspace } from '../common/KnowledgeCardWorkspace';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { formatTime } from '../../utils';

export const KnowledgeCollectorView: React.FC = () => {
  const {
    clips,
    folders,
    addClip,
    updateClip,
    deleteClip,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleFolderExpand,
    moveClipToFolder,
    togglePin,
    addAttachmentToClip,
    removeAttachmentFromClip,
  } = useKnowledgeClips();

  // 当前选中的卡片 ID
  const [activeClipId, setActiveClipId] = useState<string>(() => {
    return clips[0]?.id || '';
  });

  // 侧边栏折叠与全局提示
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2500);
  }, []);

  // 复制反馈
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 附件全屏预览
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当前激活的知识卡片
  const activeClip = useMemo(() => {
    return clips.find((c) => c.id === activeClipId) || clips[0] || null;
  }, [clips, activeClipId]);

  // 将当前卡片转化为通用卡片实体
  const activeClipAsGenericCard: GenericCardEntity = useMemo(() => {
    if (!activeClip) return { id: '', title: '' };
    return {
      id: activeClip.id,
      title: activeClip.title,
      summary: activeClip.content,
      category: activeClip.category,
      blocks: activeClip.blocks,
      globalFontSize: activeClip.globalFontSize || '16',
    };
  }, [activeClip]);

  // 更新卡片块内容
  const handleUpdateCard = useCallback(
    (updated: Partial<GenericCardEntity>) => {
      if (!activeClip) return;
      updateClip(activeClip.id, {
        title: updated.title !== undefined ? updated.title : activeClip.title,
        content: updated.summary !== undefined ? updated.summary : activeClip.content,
        blocks: updated.blocks,
        globalFontSize: updated.globalFontSize,
        updatedAt: Date.now(),
      });
    },
    [activeClip, updateClip]
  );

  // 复制卡片全文
  const handleCopyClip = (clip: KnowledgeClip) => {
    const text = `【${clip.title}】\n${clip.content}${clip.sourceUrl ? `\n来源：${clip.sourceUrl}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(clip.id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('已复制知识卡片到剪贴板');
  };

  // 一键直接新建知识卡片（无需复杂属性弹窗，直接创建并就地编辑大标题）
  const handleDirectCreateClip = useCallback(
    (folderId: string | null = null) => {
      const created = addClip({
        title: '未命名知识卡片',
        content: '',
        folderId: folderId || null,
        tags: [],
      });
      setActiveClipId(created.id);
      showToast('已创建新卡片，点击标题即可直接编辑');
    },
    [addClip, setActiveClipId, showToast]
  );

  // 附件上传处理
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeClip) return;

    const isImg = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const newAtt: KnowledgeAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        type: isImg ? 'image' : 'other',
        size: file.size,
        url: base64,
        createdAt: Date.now(),
      };
      addAttachmentToClip(activeClip.id, newAtt);
      showToast(`已追加附件【${file.name}】`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const activeCatConfig = activeClip
    ? CLIP_CATEGORIES.find((c) => c.id === activeClip.category)
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
          } shrink-0 h-full transition-all duration-300`}
        >
          <UniversalTreeSidebar<KnowledgeClip>
            items={clips}
            folders={folders}
            activeId={activeClipId}
            isOpen={isSidebarOpen}
            onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
            onSelectItem={(id) => setActiveClipId(id)}
            onCreateNewItem={(folderId) => handleDirectCreateClip(folderId)}
            onDeleteItem={(id) => deleteClip(id)}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onToggleFolderExpand={toggleFolderExpand}
            onMoveItemToFolder={moveClipToFolder}
            showToast={showToast}
            createBtnText="新建卡片"
            itemNoun="个知识卡片"
            searchPlaceholder="搜索卡片标题、正文或标签..."
            renderItemSubtext={(item) => (
              <span className="text-[10px] text-slate-400">{formatTime(item.updatedAt || item.createdAt)}</span>
            )}
          />
        </div>

        {/* 右侧：深度查看与 CardBlockEditor 块编辑工作台 */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto p-4 md:p-6 scrollbar-refined">
          {activeClip ? (
            <KnowledgeCardWorkspace
              title={activeClip.title}
              onUpdateTitle={(title) => updateClip(activeClip.id, { title, updatedAt: Date.now() })}
              titlePlaceholder="输入知识卡片标题..."
              date={new Date(activeClip.createdAt || Date.now()).toISOString().slice(0, 10)}
              updatedAt={activeClip.updatedAt || activeClip.createdAt}
              wordCount={activeClip.content?.length || 0}
              genericCard={activeClipAsGenericCard}
              onUpdateCard={handleUpdateCard}
              tags={activeClip.tags || []}
              onUpdateTags={(newTags) =>
                updateClip(activeClip.id, { tags: newTags, updatedAt: Date.now() })
              }
              pinBadge={{
                isPinned: !!activeClip.isPinned,
                onTogglePin: () => togglePin(activeClip.id),
              }}
              headerCustomActions={
                <>
                  <AiHtmlGeneratorButton
                    label="AI 提炼"
                    sourceType="knowledge-collector"
                    sourceId={activeClip.id}
                    title={activeClip.title}
                    source={activeClip}
                  />
                  <button
                    type="button"
                    onClick={() => togglePin(activeClip.id)}
                    className={`p-1.5 rounded-lg border transition-colors shadow-2xs cursor-pointer ${
                      activeClip.isPinned
                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                    title={activeClip.isPinned ? '取消置顶' : '设为置顶'}
                  >
                    <Pin size={14} className={activeClip.isPinned ? 'fill-amber-500' : ''} />
                  </button>
                </>
              }
              attachments={activeClip.attachments || []}
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
                  addAttachmentToClip(activeClip.id, newAtt);
                  showToast(`已追加附件【${file.name}】`);
                };
                reader.readAsDataURL(file);
              }}
              onDeleteAttachment={(attId) => {
                removeAttachmentFromClip(activeClip.id, attId);
                showToast('已移除附件');
              }}
              exportOptions={{
                title: activeClip.title,
                date: activeClip.updatedAt ? new Date(activeClip.updatedAt).toISOString().slice(0, 10) : undefined,
                updatedAt: activeClip.updatedAt,
                tags: activeClip.tags,
                content: activeClip.content,
                blocks: activeClip.blocks,
                extraMeta: activeClip.sourceUrl ? { '来源链接': activeClip.sourceUrl } : undefined,
                extraSections: activeClip.aiSummary ? [{ title: 'AI 提炼核心', content: activeClip.aiSummary }] : undefined,
              }}
              onDelete={() => {
                deleteClip(activeClip.id);
                showToast(`已删除《${activeClip.title}》`);
              }}
              deleteConfirmTitle={`确定要删除知识卡片【${activeClip.title}】吗？`}
              showToast={showToast}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center text-stone-400">
              请在左侧选择一个知识卡片开启查看与编辑
            </div>
          )}
        </div>
      </div>

      {/* 图片预览 */}
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
