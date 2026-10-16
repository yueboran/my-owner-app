import { AiHtmlGeneratorButton } from '../common/AiHtmlGeneratorButton';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 个人传记与历史人物谱牒中枢视图组件
 * 采用图2样式规范：全高分栏布局 + UniversalTreeSidebar 多级目录树 + 右侧 CardBlockEditor 块编辑器工作台
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Scroll,
  Sparkles,
  Copy,
  Check,
  Trash2,
  Calendar,
  Paperclip,
  Image as ImageIcon,
  Quote,
  Clock,
} from 'lucide-react';
import { useBiography } from '../../hooks/useBiography';
import { UniversalTreeSidebar } from '../common/UniversalTreeSidebar';
import { ExportActionButtons } from '../common/ExportActionButtons';
import { KnowledgeCardWorkspace } from '../common/KnowledgeCardWorkspace';
import { CardBlockEditor } from '../journal/CardBlockEditor';
import type {
  BiographyProfile,
  BiographyCategory,
} from '../../types/biography';
import type { GenericCardEntity } from '../../types/cardBlock';

// 人物分类映射
const CATEGORY_MAP: Record<BiographyCategory, { label: string; color: string }> = {
  leader: { label: '领袖统帅', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  thinker: { label: '思想哲人', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  strategist: { label: '科技商界', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  artist: { label: '文学艺术', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  innovator: { label: '科学创新', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export const BiographyView: React.FC = () => {
  const {
    biographies,
    folders,
    activeBioId,
    activeBio,
    setActiveBioId,
    addBiography,
    updateBiography,
    deleteBiography,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleFolderExpand,
    moveBioToFolder,
  } = useBiography();

  // 侧边栏展开与反馈状态（默认展开）
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);



  // 复制与分享反馈
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  // 将当前选中的人物映射为块编辑器兼容实体
  const bioAsCard: GenericCardEntity = useMemo(() => {
    if (!activeBio) return { id: '', title: '' };
    return {
      id: activeBio.id,
      title: activeBio.courtesyName
        ? `${activeBio.name}（${activeBio.courtesyName}）`
        : activeBio.name,
      subtitle: `${activeBio.era} · ${activeBio.tagline}`,
      motto: activeBio.motto,
      overview: activeBio.overview,
      tagline: activeBio.tagline,
      era: activeBio.era,
      timeline: activeBio.timeline,
      analysis: activeBio.analysis,
      blocks: activeBio.blocks,
      globalFontSize: activeBio.globalFontSize || '18',
    };
  }, [activeBio]);

  // 复制人物核心定论与名言
  const handleCopyProfile = () => {
    if (!activeBio) return;
    const shareText = `📜【历史传记谱牒：${activeBio.name}${
      activeBio.courtesyName ? `（${activeBio.courtesyName}）` : ''
    }】\n时代：${activeBio.era} | 职衔：${activeBio.dossier?.serviceInfo?.rankOrTitle || '名士'}\n定论：${activeBio.tagline}\n传世名言：“${activeBio.motto}”\n生平梗概：${activeBio.overview}`;
    navigator.clipboard.writeText(shareText);
    setCopiedSummary(true);
    showToast('已复制人物谱牒信息至剪贴板');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // 附件上传引用与处理
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBio) return;
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
      const existing = (activeBio as any).attachments || [];
      updateBiography(activeBio.id, {
        attachments: [...existing, newAtt],
      } as any);
      showToast(`已追加附件《${file.name}》`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 统计传记正文字数
  const bioWordCount = useMemo(() => {
    if (!activeBio) return 0;
    if ((activeBio as any).content) return (activeBio as any).content.length;
    if (activeBio.blocks && activeBio.blocks.length > 0) {
      return activeBio.blocks.reduce((acc: number, b: any) => acc + (b.content ? b.content.length : 0), 0);
    }
    return activeBio.overview?.length || 0;
  }, [activeBio]);

  // 一键直接新建人物档案（无需复杂弹窗，直接创建并就地编辑大标题）
  const handleDirectCreateBio = (folderId: string | null = null) => {
    const created = addBiography({
      name: '未命名先贤名士',
      courtesyName: '',
      era: '当代',
      category: 'leader',
      tagline: '立德立功立言，明心见性',
      motto: '博学之，审问之，慎思之，明辨之，笃行之',
      overview: '',
      avatarEmoji: '📜',
      folderId: folderId || null,
    } as any);
    setActiveBioId(created.id);
    showToast('已创建新人物档案，点击标题即可直接编辑');
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

      {/* 主体工作台：左侧树形目录 + 右侧双栏传记研读器 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左侧：图 2 风格多级目录树侧边栏 */}
        <div
          className={`${
            isSidebarOpen ? 'w-80 lg:w-[320px] xl:w-[340px]' : 'w-16'
          } shrink-0 h-full transition-all duration-300`}
        >
          <UniversalTreeSidebar<BiographyProfile>
            items={biographies}
            folders={folders}
            activeId={activeBioId}
            isOpen={isSidebarOpen}
            onToggleOpen={() => setIsSidebarOpen((prev) => !prev)}
            onSelectItem={(id) => {
              setActiveBioId(id);
              setViewMode('editor');
            }}
            onCreateNewItem={(folderId) => handleDirectCreateBio(folderId)}
            onDeleteItem={(id) => deleteBiography(id)}
            onCreateFolder={(name, parentId) => {
              createFolder(name, parentId);
              showToast('已新建人物分组');
            }}
            onRenameFolder={(id, name) => {
              renameFolder(id, name);
              showToast('已更新分组名称');
            }}
            onDeleteFolder={(id) => {
              deleteFolder(id);
              showToast('已删除分组');
            }}
            onToggleFolderExpand={toggleFolderExpand}
            onMoveItemToFolder={(bioId, folderId) => {
              moveBioToFolder(bioId, folderId);
              showToast(folderId ? '已归档至指定分组' : '已移至未归档人物');
            }}
            showToast={showToast}
            createBtnText="录入人物档案"
            itemNoun="位人物"
            renderItemTitle={(bio) => bio.name}
            renderItemSubtext={(bio) => (
              <span className="text-[10px] text-slate-400">
                {bio.createdAt
                  ? new Date(bio.createdAt).toISOString().slice(0, 10)
                  : bio.updatedAt
                  ? new Date(bio.updatedAt).toISOString().slice(0, 10)
                  : '2026-10-15'}
              </span>
            )}
          />
        </div>


        {/* 右侧：沉浸式传记研读器与推演工作台（与工作日记格式保持一致） */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto p-4 md:p-6 scrollbar-refined">
          {activeBio ? (
            <KnowledgeCardWorkspace
              title={activeBio.name}
              onUpdateTitle={(name) => updateBiography(activeBio.id, { name, updatedAt: Date.now() })}
              titlePlaceholder="人物姓名..."
              date={new Date(activeBio.createdAt || Date.now()).toISOString().slice(0, 10)}
              updatedAt={activeBio.updatedAt || activeBio.createdAt}
              wordCount={bioWordCount}
              genericCard={bioAsCard}
              onUpdateCard={(updated) => {
                updateBiography(activeBio.id, updated as Partial<BiographyProfile>);
              }}
              tags={activeBio.tags || []}
              onUpdateTags={(newTags) =>
                updateBiography(activeBio.id, { tags: newTags, updatedAt: Date.now() })
              }
              headerCustomActions={
                <AiHtmlGeneratorButton
                  label="AI智囊推演"
                  sourceType="biography"
                  sourceId={activeBio.id}
                  title={activeBio.name}
                  source={activeBio}
                />
              }
              beforeContent={
                (activeBio.motto || activeBio.tagline) ? (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50/70 via-orange-50/30 to-stone-50 border border-amber-200/70 text-stone-800 space-y-1.5 relative">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                      <Quote size={13} className="text-amber-600" />
                      <span>传世名言 · 核心定论</span>
                    </div>
                    {activeBio.tagline && (
                      <div className="text-sm font-semibold text-stone-900 tracking-tight">
                        {activeBio.tagline}
                      </div>
                    )}
                    {activeBio.motto && (
                      <div className="text-xs text-stone-600 italic border-l-2 border-amber-400 pl-2.5 py-0.5">
                        “{activeBio.motto}”
                      </div>
                    )}
                  </div>
                ) : null
              }
              afterContent={
                activeBio.timeline && activeBio.timeline.length > 0 ? (
                  <div className="pt-4 border-t border-stone-100 space-y-3">
                    <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                      <Clock size={13} className="text-indigo-600" />
                      <span>生平纪年历程（大事记时间轴）</span>
                    </div>
                    <div className="relative pl-4 space-y-3 border-l-2 border-indigo-100/80 ml-2">
                      {activeBio.timeline.map((item, idx) => (
                        <div key={idx} className="relative group">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />
                          <div className="text-xs">
                            <span className="font-bold text-stone-800 font-mono mr-2">{item.year}</span>
                            <span className="font-medium text-stone-700">{item.title}</span>
                            {item.description && (
                              <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{item.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              }
              attachments={(activeBio as any).attachments || []}
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
                  const existing = (activeBio as any).attachments || [];
                  updateBiography(activeBio.id, {
                    attachments: [...existing, newAtt],
                  } as any);
                  showToast(`已追加附件《${file.name}》`);
                };
                reader.readAsDataURL(file);
              }}
              onDeleteAttachment={(attId) => {
                const remaining = ((activeBio as any).attachments || []).filter((a: any) => a.id !== attId);
                updateBiography(activeBio.id, { attachments: remaining } as any);
                showToast('已移除附件');
              }}
              exportOptions={{
                title: `${activeBio.name}（${activeBio.era}）- 人物传记`,
                date: activeBio.updatedAt ? new Date(activeBio.updatedAt).toISOString().slice(0, 10) : undefined,
                updatedAt: activeBio.updatedAt,
                tags: activeBio.tags,
                content: activeBio.overview,
                blocks: activeBio.blocks,
                extraMeta: {
                  '人物': activeBio.name,
                  '历史时期/时代': activeBio.era,
                  '人物座右铭': activeBio.motto,
                },
                extraSections: [
                  { title: '人物概述与核心定论', content: activeBio.overview },
                ],
              }}
              onDelete={() => {
                deleteBiography(activeBio.id);
                showToast('人物档案已删除');
              }}
              deleteConfirmTitle={`确定要删除人物【${activeBio.name}】的档案吗？`}
              showToast={showToast}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-[#6B7280]">
              <div className="max-w-xs space-y-3">
                <Scroll size={36} className="mx-auto text-[#9CA3AF] stroke-[1.5]" />
                <p className="text-sm">请在左侧选择一位先贤名将开启研读</p>
                <button
                  type="button"
                  onClick={() => handleDirectCreateBio()}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[#5146D8] text-white hover:bg-[#4338CA] transition-colors"
                >
                  录入首位人物
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
