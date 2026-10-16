/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 卡片内嵌式块编辑器 (Block-based Editor) + 所见即所得编辑 (WYSIWYG)
 * 特性：
 * 1. 默认轻量只读阅读态（极速流畅）
 * 2. 点击文字即原地激活编辑（无需弹窗或跳页）
 * 3. Notion 风格块拖拽排序（⠿ 六点手柄 / 上下移动）
 * 4. 插入组件弹窗（/ 或 + 按钮：文字、图片、AI提炼、代码块、引用、提示框、待办、外链）
 * 5. 图片自由缩放（100% / 75% / 50%）与粘贴截图捕获
 * 6. AI 提炼核心原地自由编辑与多色调切换
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  GripVertical,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Image as ImageIcon,
  Code2,
  Quote,
  CheckSquare,
  ExternalLink,
  Info,
  Type,
  Heading2,
  Check,
  X,
  Upload,
  Maximize2,
  Minimize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Edit2,
  Table as TableIcon,
  Palette,
  Highlighter,
  Bold,
  Underline as UnderlineIcon,
  Eraser,
  Globe,
  Link2,
} from 'lucide-react';
import type { JournalEntry } from '../../types/journal';
import {
  type CardBlock,
  type CardBlockType,
  type GenericCardEntity,
  type FontSizeLevel,
  type TitleFontSizeLevel,
  AVAILABLE_FONT_SIZES,
  FONT_SIZE_CONFIG,
  HEADING_FONT_SIZE_CONFIG,
  cardToBlocks,
  blocksToContent,
  extractAiReflectionFromBlocks,
  createDefaultTableData,
  stringifyTableContent,
} from '../../types/cardBlock';
import { TableBlockComponent } from './TableBlockComponent';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Highlight } from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';

// =========================================================================
// 文本颜色与高亮标注预设常量与辅助函数
// =========================================================================

export const PRESET_TEXT_COLORS = [
  { name: '默认深灰', value: '#334155' },
  { name: '烈焰红', value: '#ef4444' },
  { name: '活力橙', value: '#f97316' },
  { name: '琥珀黄', value: '#d97706' },
  { name: '翡翠绿', value: '#10b981' },
  { name: '天空蓝', value: '#2563eb' },
  { name: '罗兰紫', value: '#7c3aed' },
  { name: '玫瑰粉', value: '#db2777' },
  { name: '中性灰', value: '#64748b' },
];

export const PRESET_HIGHLIGHT_COLORS = [
  { name: '经典荧光黄', value: '#fef08a', textColor: '#1c1917' },
  { name: '荧光浅绿', value: '#bbf7d0', textColor: '#14532d' },
  { name: '冰川浅蓝', value: '#bfdbfe', textColor: '#1e3a8a' },
  { name: '樱花淡粉', value: '#fce7f3', textColor: '#831843' },
  { name: '薰衣草紫', value: '#e9d5ff', textColor: '#581c87' },
  { name: '暖阳淡橙', value: '#fed7aa', textColor: '#7c2d12' },
];

/**
 * 将文本中的 HTML、Markdown 标注与加粗下划线安全渲染为带样式的 HTML
 */
export function renderRichContentHtml(rawContent: string): string {
  if (!rawContent) return '';

  // 1. Markdown 经典标注语法 ==高亮内容==
  let html = rawContent.replace(
    /==([\s\S]+?)==/g,
    '<mark style="background-color: #fef08a; color: #1c1917; padding: 1px 4px; border-radius: 4px; box-decoration-break: clone; -webkit-box-decoration-break: clone;">$1</mark>'
  );

  // 2. Markdown 加粗 **内容**
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');

  // 3. 增强已有 mark 标签样式
  html = html.replace(
    /<mark(?![^>]*style)([^>]*)>/g,
    '<mark$1 style="background-color: #fef08a; color: #1c1917; padding: 1px 4px; border-radius: 4px; box-decoration-break: clone; -webkit-box-decoration-break: clone;">'
  );

  // 4. 仅在纯文本时将换行转换为 <br />（已有 <p> 或 <div> 标签时保持原有排版）
  if (!html.includes('<p>') && !html.includes('<div>')) {
    html = html.replace(/\n/g, '<br />');
  }

  return html;
}

/**
 * 所见即所得 (WYSIWYG) 段落就地编辑组件
 * 特性：零底层代码暴露、零多余预览框，选区即改即显，原汁原味现代富文本体验
 */
const InlineParagraphEditor: React.FC<{
  block: CardBlock;
  getParagraphClass: (b?: CardBlock) => string;
  updateBlock: (id: string, partial: Partial<CardBlock>) => void;
}> = ({ block, getParagraphClass, updateBlock }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // 初始化内容：兼容已有的 HTML 或纯文本换行
  const initialContent = React.useMemo(() => {
    let content = block.content || '';
    if (!content) return '<p></p>';
    if (!content.includes('<p>') && !content.includes('<div>')) {
      content = content
        .split('\n')
        .map((line) => `<p>${line || '<br>'}</p>`)
        .join('');
    }
    return content;
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Color,
      TextStyle,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: `tiptap-wysiwyg-content outline-hidden focus:outline-hidden min-h-[44px] font-serif leading-relaxed text-stone-800 ${getParagraphClass(block)}`,
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      updateBlock(block.id, { content: html });
    },
  });

  // 改选区颜色（直接所见即所得）
  const handleColorSelect = (colorValue: string) => {
    if (!editor) return;
    if (colorValue) {
      editor.chain().focus().setColor(colorValue).run();
    } else {
      editor.chain().focus().unsetColor().run();
    }
    setShowColorPicker(false);
  };

  // 改选区高亮标注（直接所见即所得）
  const handleHighlightSelect = (hlValue: string) => {
    if (!editor) return;
    if (hlValue) {
      editor.chain().focus().toggleHighlight({ color: hlValue }).run();
    } else {
      editor.chain().focus().unsetHighlight().run();
    }
    setShowHighlightPicker(false);
  };

  // 粗体
  const handleBold = () => {
    if (!editor) return;
    editor.chain().focus().toggleBold().run();
  };

  // 下划线
  const handleUnderline = () => {
    if (!editor) return;
    editor.chain().focus().toggleUnderline().run();
  };

  // 清除选区格式
  const handleClear = () => {
    if (!editor) return;
    editor.chain().focus().unsetAllMarks().unsetColor().unsetHighlight().run();
  };

  // 打开插入链接对话框
  const handleOpenLinkDialog = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, ' ');
    setLinkText(selected || '');
    setLinkUrl('');
    setShowLinkDialog(true);
    setShowColorPicker(false);
    setShowHighlightPicker(false);
  };

  // 确认插入外部链接
  const handleInsertLink = () => {
    if (!editor || !linkUrl.trim()) {
      setShowLinkDialog(false);
      return;
    }
    const finalUrl = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    const display = linkText.trim() || finalUrl;
    editor
      .chain()
      .focus()
      .insertContent(
        `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline font-medium hover:text-indigo-800">${display}</a> `
      )
      .run();
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
  };

  if (!editor) return null;

  return (
    <div className="space-y-1.5 group/inline-wysiwyg">
      {/* 极简快捷格式工具条 */}
      <div className="flex items-center flex-wrap gap-1 py-1 px-2 bg-stone-50/90 border border-stone-200/70 rounded-lg text-xs">
        {/* 文字颜色 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
              setShowLinkDialog(false);
            }}
            className="px-2 py-0.5 rounded flex items-center gap-1 font-medium transition-colors text-stone-600 hover:bg-stone-200/60 cursor-pointer"
            title="选中文本修改字体颜色"
          >
            <Palette size={12} className="text-indigo-600" />
            <span>文字颜色</span>
          </button>

          {showColorPicker && (
            <div
              className="absolute left-0 top-full mt-1.5 z-40 p-2.5 bg-white rounded-xl shadow-xl border border-stone-200 w-48 space-y-2 animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[10px] text-stone-400 font-medium px-1">选择文字颜色：</div>
              <div className="grid grid-cols-3 gap-1">
                {PRESET_TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleColorSelect(c.value)}
                    className="flex items-center gap-1 p-1 rounded hover:bg-stone-100 text-left text-[11px] cursor-pointer"
                    title={c.name}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="truncate">{c.name.slice(0, 2)}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleColorSelect('')}
                className="w-full text-center py-1 text-[11px] text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded border-t border-stone-100 cursor-pointer"
              >
                重置默认颜色
              </button>
            </div>
          )}
        </div>

        {/* 文字标注高亮 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
            }}
            className="px-2 py-0.5 rounded flex items-center gap-1 font-medium transition-colors text-stone-600 hover:bg-stone-200/60 cursor-pointer"
            title="选中文本添加荧光笔标注"
          >
            <Highlighter size={12} className="text-amber-500" />
            <span>文字标注</span>
          </button>

          {showHighlightPicker && (
            <div
              className="absolute left-0 top-full mt-1.5 z-40 p-2.5 bg-white rounded-xl shadow-xl border border-stone-200 w-52 space-y-2 animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[10px] text-stone-400 font-medium px-1">荧光笔标注色彩：</div>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_HIGHLIGHT_COLORS.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => handleHighlightSelect(h.value)}
                    className="flex items-center gap-1.5 p-1.5 rounded hover:bg-stone-100 text-left text-[11px] cursor-pointer"
                    title={h.name}
                  >
                    <span
                      className="w-4 h-4 rounded-md border border-black/10 shrink-0"
                      style={{ backgroundColor: h.value }}
                    />
                    <span className="truncate font-medium">{h.name}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleHighlightSelect('')}
                className="w-full text-center py-1 text-[11px] text-stone-500 hover:text-rose-600 hover:bg-stone-100 rounded border-t border-stone-100 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Eraser size={11} /> 擦除高亮标注
              </button>
            </div>
          )}
        </div>

        {/* 粗体与下划线 */}
        <button
          type="button"
          onClick={handleBold}
          className={`p-1 rounded cursor-pointer ${
            editor.isActive('bold')
              ? 'bg-stone-200 text-indigo-600 font-bold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
          title="加粗 (Ctrl+B)"
        >
          <Bold size={12} />
        </button>

        <button
          type="button"
          onClick={handleUnderline}
          className={`p-1 rounded cursor-pointer ${
            editor.isActive('underline')
              ? 'bg-stone-200 text-indigo-600'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
          title="下划线 (Ctrl+U)"
        >
          <UnderlineIcon size={12} />
        </button>

        {/* 插入外部超链接 */}
        <div className="relative">
          <button
            type="button"
            onClick={handleOpenLinkDialog}
            className="px-1.5 py-0.5 rounded flex items-center gap-1 font-medium transition-colors text-stone-600 hover:text-blue-600 hover:bg-stone-200/60 cursor-pointer"
            title="划选文字插入外部超链接"
          >
            <Link2 size={12} className="text-blue-600" />
            <span>插入链接</span>
          </button>

          {showLinkDialog && (
            <div
              className="absolute left-0 top-full mt-1.5 z-40 p-3 bg-white rounded-xl shadow-xl border border-stone-200 w-64 space-y-2 animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <Link2 size={12} className="text-blue-600" />
                <span>插入外部超链接</span>
              </div>
              <div>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="链接显示文本（可选）..."
                  className="w-full text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none font-mono text-indigo-600"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInsertLink();
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLinkDialog(false)}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleInsertLink}
                  className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-2xs cursor-pointer"
                >
                  确认插入
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-stone-200/60 rounded cursor-pointer"
          title="清除所选文字格式"
        >
          <Eraser size={12} />
        </button>

        <span className="text-[10px] text-stone-400 ml-auto hidden sm:inline">
          💡 划选文字直接变色或高亮标注
        </span>
      </div>

      {/* 原生所见即所得输入区：文字直接就地呈现排版与高亮，绝无代码，绝无多余预览框 */}
      <div className="py-2 px-2.5 rounded-xl border border-transparent hover:border-stone-200 focus-within:border-indigo-300 focus-within:bg-indigo-50/10 transition-all bg-transparent">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

interface CardBlockEditorProps {
  card?: GenericCardEntity;
  entry?: any; // 兼容原有日记调用
  onUpdateCard?: (updated: Partial<GenericCardEntity>) => void;
  onUpdateEntry?: (updated: any) => void;
  isEditingInitially?: boolean;
  isExpanded?: boolean;
  onFinishEdit?: () => void;
  hideTitle?: boolean; // 隐藏内部主标题设置（当外部已设置主标题时使用）
}

export const CardBlockEditor: React.FC<CardBlockEditorProps> = ({
  card,
  entry,
  onUpdateCard,
  onUpdateEntry,
  isEditingInitially = false,
  onFinishEdit,
  hideTitle = false,
}) => {
  const currentCard = (card || entry) as GenericCardEntity;

  // 编辑态开关（按需初始化）
  const [isEditing, setIsEditing] = useState(isEditingInitially);
  const [title, setTitle] = useState(currentCard?.title || '');
  const [blocks, setBlocks] = useState<CardBlock[]>(() => cardToBlocks(currentCard));

  // 主标题字号等级 ('18' | '24' | '30'，默认 '24' 或读取已有设置)
  const [titleFontSize, setTitleFontSize] = useState<TitleFontSizeLevel>(() => {
    return currentCard?.titleFontSize || '24';
  });

  // 全局基准正文字号等级 (16 / 18 / 20 / 22，默认 18px)
  const [globalFontSize, setGlobalFontSize] = useState<FontSizeLevel>(() => {
    return currentCard?.globalFontSize || '18';
  });

  // 辅助获取主标题字号样式 (支持 18px、24px、30px)
  const getTitleClass = useCallback((sizeLevel?: TitleFontSizeLevel) => {
    const lvl = sizeLevel || titleFontSize || '24';
    if (lvl === '30') return 'text-[30px] font-bold tracking-tight leading-tight';
    if (lvl === '18') return 'text-[18px] font-bold leading-normal';
    return 'text-[24px] font-bold tracking-tight leading-snug';
  }, [titleFontSize]);

  // 辅助获取正文段落及所有除标题外的非标题组件字号样式 (默认 18px)
  const getParagraphClass = useCallback(
    (block?: CardBlock) => {
      const fs = block?.meta?.fontSize || globalFontSize || '18';
      return FONT_SIZE_CONFIG[fs]?.textClass || 'text-[18px] leading-relaxed';
    },
    [globalFontSize]
  );

  // 辅助获取标题样式：H1 (30px) · H2 (24px) · H3 (18px)
  const getHeadingClass = useCallback((block: CardBlock) => {
    const level = block.meta?.level || 2;
    if (block.meta?.fontSize) {
      if (block.meta.fontSize === '22' || block.meta.fontSize === 'xl') return 'text-[30px] font-bold tracking-tight text-stone-900 leading-tight';
      if (block.meta.fontSize === '20' || block.meta.fontSize === 'lg') return 'text-[24px] font-bold tracking-tight text-stone-900 leading-snug';
      if (block.meta.fontSize === '18' || block.meta.fontSize === 'base') return 'text-[18px] font-bold text-stone-800 leading-normal';
      return FONT_SIZE_CONFIG[block.meta.fontSize]?.headingClass || 'text-[24px] font-bold text-stone-900 leading-snug';
    }
    // H1、H2、H3 标题分别对应 30px、24px、18px
    if (level === 1) return 'text-[30px] font-bold tracking-tight text-stone-900 leading-tight';
    if (level === 2) return 'text-[24px] font-bold tracking-tight text-stone-900 leading-snug';
    return 'text-[18px] font-bold text-stone-800 leading-normal';
  }, []);

  // 当前拖拽的块 ID 与放置目标
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);

  // 插入组件选择菜单状态（包含插入目标位置索引）
  const [insertMenuIndex, setInsertMenuIndex] = useState<number | null>(null);

  // 隐藏的本地图片上传输入框
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertTargetIndexRef = useRef<number>(0);

  // 当外部 card/entry 更新且未处于编辑态时同步状态
  useEffect(() => {
    if (!isEditing && currentCard) {
      setTitle(currentCard.title || '');
      setBlocks(cardToBlocks(currentCard));
      if (currentCard.globalFontSize) {
        setGlobalFontSize(currentCard.globalFontSize);
      }
      if (currentCard.titleFontSize) {
        setTitleFontSize(currentCard.titleFontSize);
      }
    }
  }, [currentCard, isEditing]);

  // 保存当前块编辑器修改
  const handleSave = useCallback(() => {
    const updatedContent = blocksToContent(blocks);
    const updatedAi = extractAiReflectionFromBlocks(blocks);
    const linkBlock = blocks.find((b) => b.type === 'link');
    const updatedSourceUrl = linkBlock ? linkBlock.content : currentCard?.sourceUrl;

    // 提取图片块同步回 attachments（严格使用标准 'image' 类型，并保留原非图片附件）
    const imageBlocks = blocks.filter((b) => b.type === 'image' && b.content);
    const existingNonImageAtts = (currentCard?.attachments || []).filter(
      (a: any) => a.type !== 'image' && !imageBlocks.some((b) => b.id === a.id)
    );

    const newImageAttachments = imageBlocks.map((b, idx) => {
      const orig = (currentCard?.attachments || []).find((a: any) => a.id === b.id || a.name === b.meta?.fileName);
      return {
        id: b.id,
        name: b.meta?.fileName || b.meta?.caption || `图片附件-${idx + 1}.png`,
        size: orig?.size || 1024 * 50,
        type: 'image' as const,
        url: b.content,
        uploadedAt: orig?.uploadedAt || orig?.createdAt || new Date().toISOString(),
      };
    });

    const newAttachments = [...newImageAttachments, ...existingNonImageAtts];

    const updatePayload: any = {
      ...(hideTitle ? {} : { title, titleFontSize }),
      content: updatedContent,
      aiReflection: updatedAi,
      aiSummary: updatedAi,
      sourceUrl: updatedSourceUrl,
      attachments: newAttachments,
      blocks,
      globalFontSize,
    };

    if (onUpdateCard) onUpdateCard(updatePayload);
    if (onUpdateEntry) onUpdateEntry(updatePayload);

    setIsEditing(false);
    if (onFinishEdit) onFinishEdit();
  }, [blocks, title, titleFontSize, globalFontSize, currentCard?.sourceUrl, onUpdateCard, onUpdateEntry, onFinishEdit, hideTitle]);

  // 一键调整主标题字号 (18px / 24px / 30px)
  const handleSetTitleFontSize = (size: TitleFontSizeLevel) => {
    setTitleFontSize(size);
    const payload = { titleFontSize: size, blocks };
    if (onUpdateCard) onUpdateCard(payload);
    if (onUpdateEntry) onUpdateEntry(payload);
  };

  // 一键调整整篇卡片/研报的基准正文字号
  const handleSetGlobalFontSize = (size: FontSizeLevel) => {
    setGlobalFontSize(size);
    const payload = { globalFontSize: size, blocks };
    if (onUpdateCard) onUpdateCard(payload);
    if (onUpdateEntry) onUpdateEntry(payload);
  };

  // 更新单个块的内容或元数据
  const updateBlock = (id: string, updates: Partial<CardBlock>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates, meta: { ...b.meta, ...updates.meta } } : b))
    );
  };

  // 删除单个块
  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  // 块上移 / 下移
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    setBlocks((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // 插入新块
  const insertBlockAt = (index: number, type: CardBlockType, initialContent = '', initialMeta: any = {}) => {
    const newBlock: CardBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      content: initialContent,
      meta: initialMeta,
    };

    setBlocks((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, newBlock);
      return copy;
    });

    setInsertMenuIndex(null);
  };

  // 复制/克隆组件块
  const duplicateBlock = (index: number) => {
    const blockToClone = blocks[index];
    if (!blockToClone) return;
    const newBlock: CardBlock = {
      ...blockToClone,
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setBlocks((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, newBlock);
      return copy;
    });
  };

  // 粘贴截图捕获图片块
  const handlePaste = (e: React.ClipboardEvent) => {
    if (!isEditing) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64Url = event.target?.result as string;
            if (base64Url) {
              insertBlockAt(blocks.length - 1, 'image', base64Url, {
                widthPercent: 100,
                align: 'center',
                fileName: `粘贴截图-${new Date().toLocaleTimeString()}.png`,
              });
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // 本地图片选择上传
  const triggerImageUpload = (targetIndex: number) => {
    insertTargetIndexRef.current = targetIndex;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        if (base64Url) {
          insertBlockAt(insertTargetIndexRef.current, 'image', base64Url, {
            widthPercent: 100,
            align: 'center',
            fileName: file.name,
            fileSize: `${Math.round(file.size / 1024)} KB`,
          });
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  // 拖拽排序逻辑 (HTML5 Drag & Drop)
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingBlockId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggingBlockId !== id) {
      setDragOverBlockId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggingBlockId || draggingBlockId === targetId) return;

    setBlocks((prev) => {
      const copy = [...prev];
      const fromIndex = copy.findIndex((b) => b.id === draggingBlockId);
      const toIndex = copy.findIndex((b) => b.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const [removed] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, removed);
      return copy;
    });

    setDraggingBlockId(null);
    setDragOverBlockId(null);
  };

  // =========================================================================
  // 1. 阅读态渲染 (Read Mode: 轻量极速高质感卡片 · 点击即进入原地编辑)
  // =========================================================================
  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        onWheel={(e) => e.stopPropagation()}
        className="space-y-3 cursor-pointer group/card select-text overscroll-contain"
        title="点击卡片任意文字即可就地编辑"
      >
        {/* 顶部标题与全局字号调节器 */}
        <div className={`flex items-center gap-2 ${hideTitle ? 'justify-end mb-1' : 'justify-between pb-1 border-b border-stone-100'}`}>
          {!hideTitle && (
            <h3 className={`${getTitleClass()} text-stone-900 group-hover/card:text-indigo-600 transition-colors flex items-center gap-2`}>
              <span>{title}</span>
            </h3>
          )}

          <div className="flex items-center gap-2">
            {/* 全局正文字号快捷调节 */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-0.5 bg-stone-100/90 rounded-lg p-0.5 text-xs shadow-2xs"
            >
              <span className="text-[11px] text-stone-400 px-1 font-mono flex items-center gap-0.5" title="调整正文字号">
                <Type size={11} />
              </span>
              {AVAILABLE_FONT_SIZES.map((size) => {
                const isCurrentSize =
                  globalFontSize === size ||
                  (size === '18' && (!globalFontSize || globalFontSize === 'sm' || globalFontSize === 'base'));
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleSetGlobalFontSize(size)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      isCurrentSize
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                    title={`整篇正文字号：${FONT_SIZE_CONFIG[size]?.label || size}`}
                  >
                    {FONT_SIZE_CONFIG[size]?.shortLabel || size}
                  </button>
                );
              })}
            </div>

            <span className="opacity-0 group-hover/card:opacity-100 text-[11px] font-medium text-indigo-500 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full flex items-center gap-1 transition-opacity">
              <Edit2 size={11} />
              <span>点击就地编辑</span>
            </span>
          </div>
        </div>

        {/* 块列表只读渲染 */}
        <div className="space-y-3">
          {blocks.map((block) => {
            // 段落文本
            if (block.type === 'paragraph') {
              const customStyle: React.CSSProperties = {};
              if (block.meta?.textColor) customStyle.color = block.meta.textColor;
              if (block.meta?.highlightBg) customStyle.backgroundColor = block.meta.highlightBg;

              return (
                <div
                  key={block.id}
                  style={customStyle}
                  className={`${getParagraphClass(block)} ${
                    block.meta?.highlightBg ? 'p-2.5 rounded-xl' : ''
                  } text-stone-700 font-serif leading-relaxed`}
                  dangerouslySetInnerHTML={{ __html: renderRichContentHtml(block.content) }}
                />
              );
            }

            // 标题
            if (block.type === 'heading') {
              const customStyle: React.CSSProperties = {};
              if (block.meta?.textColor) customStyle.color = block.meta.textColor;
              return (
                <div key={block.id} className="pt-2">
                  <h4
                    style={customStyle}
                    className={`${getHeadingClass(block)} text-stone-900 tracking-tight`}
                    dangerouslySetInnerHTML={{ __html: renderRichContentHtml(block.content) }}
                  />
                </div>
              );
            }

            // AI 提炼核心
            if (block.type === 'ai-insight') {
              const theme = block.meta?.colorTheme || 'emerald';
              const themeStyles = {
                emerald: 'bg-emerald-50/80 border-emerald-200/90 text-emerald-950',
                sky: 'bg-sky-50/80 border-sky-200/90 text-sky-950',
                indigo: 'bg-indigo-50/80 border-indigo-200/90 text-indigo-950',
                amber: 'bg-amber-50/80 border-amber-200/90 text-amber-950',
                purple: 'bg-purple-50/80 border-purple-200/90 text-purple-950',
              }[theme];

              return (
                <div
                  key={block.id}
                  className={`p-3.5 rounded-2xl border font-serif leading-relaxed ${themeStyles}`}
                >
                  <span className="font-semibold flex items-center gap-1.5 mb-1.5 text-xs text-indigo-800">
                    <Sparkles size={13} className="text-indigo-600" />
                    {block.meta?.title || '摘要：'}
                  </span>
                  <p className={`whitespace-pre-line ${getParagraphClass(block)}`}>{block.content}</p>
                </div>
              );
            }

            // 图片/附件块
            if (block.type === 'image') {
              const widthClass = {
                100: 'w-full',
                75: 'w-3/4 mx-auto',
                50: 'w-1/2 mx-auto',
              }[block.meta?.widthPercent || 100];

              return (
                <div key={block.id} className="my-2 space-y-1">
                  <div
                    className={`${widthClass} rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs bg-slate-900/5`}
                  >
                    <img
                      src={block.content}
                      alt={block.meta?.caption || '图片'}
                      className="w-full max-h-72 object-contain"
                    />
                  </div>
                  {block.meta?.caption && (
                    <p className="text-xs text-stone-400 text-center font-mono">
                      {block.meta.caption}
                    </p>
                  )}
                </div>
              );
            }

            // 代码块
            if (block.type === 'code') {
              return (
                <div
                  key={block.id}
                  className="my-2 p-3 rounded-xl bg-slate-900 text-slate-100 font-mono overflow-x-auto"
                >
                  <div className="flex justify-between text-slate-400 text-xs mb-1 border-b border-slate-800 pb-1">
                    <span>{block.meta?.language || 'Code'}</span>
                  </div>
                  <pre className={`whitespace-pre ${getParagraphClass(block)}`}>{block.content}</pre>
                </div>
              );
            }

            // 引用块
            if (block.type === 'quote') {
              return (
                <blockquote
                  key={block.id}
                  className={`pl-3 border-l-2 border-indigo-400 italic text-stone-600 my-1 font-serif ${getParagraphClass(block)}`}
                  dangerouslySetInnerHTML={{ __html: renderRichContentHtml(block.content) }}
                />
              );
            }

            // 待办清单
            if (block.type === 'todo') {
              return (
                <div key={block.id} className={`flex items-center gap-2 text-stone-700 ${getParagraphClass(block)}`}>
                  <input
                    type="checkbox"
                    checked={block.meta?.checked || false}
                    readOnly
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span className={block.meta?.checked ? 'line-through text-stone-400' : ''}>
                    {block.content}
                  </span>
                </div>
              );
            }

            // 外部链接书签卡片 (Web Bookmark Block)
            if (block.type === 'link') {
              const rawUrl = block.meta?.url || block.content || '';
              const finalUrl = rawUrl.startsWith('http') ? rawUrl : rawUrl ? `https://${rawUrl}` : '#';
              const title = block.meta?.title || rawUrl || '外部参考链接';
              let displayDomain = '';
              try {
                if (finalUrl.startsWith('http')) {
                  displayDomain = new URL(finalUrl).hostname;
                }
              } catch (_) {}

              return (
                <div key={block.id} className="my-2" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={finalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 transition-all group shadow-2xs hover:border-indigo-300"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Globe size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate font-mono mt-0.5">
                          {displayDomain || rawUrl}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-indigo-600 shrink-0 font-medium px-2.5 py-1 rounded-lg bg-white border border-slate-200/80 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-colors shadow-2xs">
                      <span>访问原文</span>
                      <ExternalLink size={12} />
                    </div>
                  </a>
                </div>
              );
            }

            // 数据表格
            if (block.type === 'table') {
              return (
                <div key={block.id} onClick={(e) => e.stopPropagation()}>
                  <TableBlockComponent
                    content={block.content}
                    isEditing={false}
                    fontSizeClass={getParagraphClass(block)}
                    onUpdateContent={(newContent) => updateBlock(block.id, { content: newContent })}
                  />
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. 原地编辑态渲染 (Edit Mode: 块拖拽 · 实时WYSIWYG · 浮动工具栏)
  // =========================================================================
  return (
    <div
      onPaste={handlePaste}
      onWheel={(e) => e.stopPropagation()}
      className="space-y-3 p-3 -m-1 rounded-2xl bg-white/95 border-2 border-indigo-500/80 shadow-lg transition-all animate-in fade-in overscroll-contain"
    >
      {/* 隐藏的图片上传文件控件 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 顶部原地编辑工具栏 */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-200/80 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
          <span>文档内容块</span>
        </div>

        <div className="flex items-center gap-2">
          {/* 全局正文字号选择 (16 / 18 / 20 / 22，默认 18px) */}
          <div className="flex items-center gap-0.5 bg-stone-100/90 rounded-lg p-0.5 text-xs shadow-2xs">
            <span className="text-[11px] text-stone-500 px-1.5 font-medium flex items-center gap-0.5" title="全局基准正文字号">
              <Type size={11} /> 正文字号:
            </span>
            {AVAILABLE_FONT_SIZES.map((size) => {
              const isCurrentSize =
                globalFontSize === size ||
                (size === '18' && (!globalFontSize || globalFontSize === 'sm' || globalFontSize === 'base'));
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSetGlobalFontSize(size)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    isCurrentSize
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title={`设置全局正文字号为 ${FONT_SIZE_CONFIG[size]?.label || size}`}
                >
                  {FONT_SIZE_CONFIG[size]?.shortLabel || size}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <Check size={12} />
              <span>完成保存</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              title="退出编辑"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 标题原生就地编辑（支持自由调整大小：18px / 24px / 30px，当 hideTitle 时隐藏） */}
      {!hideTitle && (
        <div className="group/title relative space-y-1 bg-stone-50/60 hover:bg-stone-50/90 focus-within:bg-white p-2.5 rounded-xl border border-stone-200/70 focus-within:border-indigo-400 transition-all">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
              <Type size={11} className="text-indigo-600" />
              主标题字号:
            </span>
            <div className="flex items-center gap-0.5 bg-stone-100/90 rounded-lg p-0.5 text-xs shadow-2xs">
              {(['18', '24', '30'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleSetTitleFontSize(sz)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    titleFontSize === sz
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title={`主标题字号：${sz}px (${sz === '30' ? 'H1 (30px)' : sz === '24' ? 'H2 (24px)' : 'H3 (18px)'})`}
                >
                  {sz === '30' ? 'H1 (30px)' : sz === '24' ? 'H2 (24px)' : 'H3 (18px)'}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="卡片标题..."
            className={`w-full ${getTitleClass()} text-stone-900 bg-transparent outline-hidden transition-all`}
          />
        </div>
      )}

      {/* 块列表渲染 (带拖拽手柄与就地修改) */}
      <div className="space-y-2">
        {blocks.map((block, index) => {
          const isDragging = draggingBlockId === block.id;
          const isOver = dragOverBlockId === block.id;

          return (
            <div
              key={block.id}
              draggable
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragOver={(e) => handleDragOver(e, block.id)}
              onDrop={(e) => handleDrop(e, block.id)}
              onDragEnd={() => {
                setDraggingBlockId(null);
                setDragOverBlockId(null);
              }}
              className={`group/block relative pl-7 pr-2 py-1 rounded-xl transition-all border ${
                isDragging
                  ? 'opacity-30 border-dashed border-indigo-400'
                  : isOver
                  ? 'border-indigo-500 bg-indigo-50/40'
                  : 'border-transparent hover:border-stone-200/70 hover:bg-stone-50/50'
              }`}
            >
              {/* 左侧悬浮六点手柄 (⠿) 与添加按钮 */}
              <div className="absolute left-0 top-2 flex items-center gap-0.5 opacity-30 group-hover/block:opacity-100 transition-opacity">
                {/* 六点抓手 */}
                <div
                  className="cursor-grab active:cursor-grabbing p-0.5 text-stone-400 hover:text-indigo-600 rounded"
                  title="按住拖拽以重新排序此块"
                >
                  <GripVertical size={14} />
                </div>
              </div>

              {/* 块右上角微型操作栏（字号调整、上移、下移、删除） */}
              <div className="absolute right-1 top-1 flex items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity bg-white/95 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-stone-200 shadow-2xs z-10">
                {/* 标题层级 H1 (30px) / H2 (24px) / H3 (18px) 快速切换 */}
                {block.type === 'heading' && (
                  <div className="flex items-center gap-0.5 bg-stone-100 rounded p-0.5 mr-1 text-[10px]">
                    {([1, 2, 3] as const).map((lvl) => {
                      const lvlText = lvl === 1 ? 'H1 (30)' : lvl === 2 ? 'H2 (24)' : 'H3 (18)';
                      const lvlTitle = lvl === 1 ? 'H1 (30px)' : lvl === 2 ? 'H2 (24px)' : 'H3 (18px)';
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => updateBlock(block.id, { meta: { ...block.meta, level: lvl } })}
                          className={`px-1.5 py-0.2 rounded font-mono font-bold transition-colors cursor-pointer ${
                            (block.meta?.level || 2) === lvl
                              ? 'bg-white text-indigo-600 shadow-2xs'
                              : 'text-stone-400 hover:text-stone-700'
                          }`}
                          title={`切换为 ${lvlTitle}`}
                        >
                          {lvlText}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 正文段落字号微调 */}
                {block.type === 'paragraph' && (
                  <div className="flex items-center gap-0.5 bg-stone-100 rounded p-0.5 mr-1 text-[10px]">
                    {AVAILABLE_FONT_SIZES.map((fs) => {
                      const isSelected =
                        (block.meta?.fontSize || globalFontSize) === fs ||
                        (fs === '18' && (!(block.meta?.fontSize || globalFontSize) || (block.meta?.fontSize || globalFontSize) === 'sm' || (block.meta?.fontSize || globalFontSize) === 'base'));
                      return (
                        <button
                          key={fs}
                          type="button"
                          onClick={() => updateBlock(block.id, { meta: { ...block.meta, fontSize: fs } })}
                          className={`px-1.5 py-0.2 rounded font-mono transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                              : 'text-stone-400 hover:text-stone-700'
                          }`}
                          title={`当前段落字号：${FONT_SIZE_CONFIG[fs]?.label || fs}`}
                        >
                          {FONT_SIZE_CONFIG[fs]?.shortLabel || fs}
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => moveBlock(index, 'up')}
                  disabled={index === 0}
                  className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 cursor-pointer"
                  title="上移"
                >
                  <ArrowUp size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(index, 'down')}
                  disabled={index === blocks.length - 1}
                  className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 cursor-pointer"
                  title="下移"
                >
                  <ArrowDown size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => duplicateBlock(index)}
                  className="p-0.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                  title="复制此组件块"
                >
                  <Copy size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteBlock(block.id)}
                  className="p-0.5 text-rose-400 hover:text-rose-600 cursor-pointer"
                  title="删除此块"
                >
                  <Trash2 size={11} />
                </button>
              </div>

              {/* 1. 文本段落就地编辑（真正的所见即所得：直接改色标注、零代码、零多余预览框） */}
              {block.type === 'paragraph' && (
                <InlineParagraphEditor
                  block={block}
                  getParagraphClass={getParagraphClass}
                  updateBlock={updateBlock}
                />
              )}

              {/* 2. 标题就地编辑 */}
              {block.type === 'heading' && (
                <input
                  type="text"
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                  placeholder="标题..."
                  style={{ color: block.meta?.textColor }}
                  className={`w-full ${getHeadingClass(block)} bg-transparent outline-hidden`}
                />
              )}

              {/* 3. 摘要块就地编辑 */}
              {block.type === 'ai-insight' && (
                <div className="p-3.5 rounded-lg bg-indigo-50/60 border border-indigo-100/90 leading-relaxed">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold flex items-center gap-1.5 text-xs text-indigo-900">
                      <Sparkles size={13} className="text-[#5146D8]" />
                      摘要
                    </span>
                    <div className="flex items-center gap-1">
                      {(['emerald', 'sky', 'indigo', 'amber', 'purple'] as const).map((clr) => (
                        <button
                          key={clr}
                          type="button"
                          onClick={() => updateBlock(block.id, { meta: { colorTheme: clr } })}
                          className={`w-3.5 h-3.5 rounded-full border border-black/10 ${
                            clr === 'emerald'
                              ? 'bg-emerald-400'
                              : clr === 'sky'
                              ? 'bg-sky-400'
                              : clr === 'indigo'
                              ? 'bg-indigo-400'
                              : clr === 'amber'
                              ? 'bg-amber-400'
                              : 'bg-purple-400'
                          } hover:scale-125 transition-transform`}
                        />
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={block.content}
                    rows={2}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    placeholder="输入摘要内容..."
                    className={`w-full ${getParagraphClass(block)} text-indigo-950 bg-transparent resize-y outline-hidden`}
                  />
                </div>
              )}

              {/* 4. 图片自由操作 (支持 100% / 75% / 50% 缩放与居中) */}
              {block.type === 'image' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-100/80 px-2.5 py-1 rounded-lg">
                    <ImageIcon size={13} className="text-blue-600" />
                    <span>图片尺寸：</span>
                    {[100, 75, 50].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          updateBlock(block.id, { meta: { widthPercent: size as any } })
                        }
                        className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                          (block.meta?.widthPercent || 100) === size
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-stone-200'
                        }`}
                      >
                        {size}%
                      </button>
                    ))}
                  </div>

                  <div
                    className={`${
                      {
                        100: 'w-full',
                        75: 'w-3/4 mx-auto',
                        50: 'w-1/2 mx-auto',
                      }[block.meta?.widthPercent || 100]
                    } rounded-2xl overflow-hidden border border-stone-200 relative`}
                  >
                    <img
                      src={block.content}
                      alt={block.meta?.caption || '附件图'}
                      className="w-full max-h-64 object-contain bg-slate-900/5"
                    />
                  </div>

                  <input
                    type="text"
                    value={block.meta?.caption || ''}
                    onChange={(e) => updateBlock(block.id, { meta: { caption: e.target.value } })}
                    placeholder="为图片添加说明文字..."
                    className="w-full text-xs text-center text-stone-500 bg-transparent outline-hidden"
                  />
                </div>
              )}

              {/* 5. 代码块 */}
              {block.type === 'code' && (
                <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono">
                  <div className="flex justify-between items-center mb-1 text-xs text-slate-400">
                    <input
                      type="text"
                      value={block.meta?.language || 'python'}
                      onChange={(e) =>
                        updateBlock(block.id, { meta: { language: e.target.value } })
                      }
                      className="bg-transparent border-none text-slate-300 outline-hidden w-24"
                    />
                  </div>
                  <textarea
                    value={block.content}
                    rows={4}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    className={`w-full bg-transparent text-emerald-400 font-mono ${getParagraphClass(block)} outline-hidden resize-y`}
                    placeholder="输入代码..."
                  />
                </div>
              )}

              {/* 6. 引用块 */}
              {block.type === 'quote' && (
                <div className="pl-3 border-l-2 border-indigo-400">
                  <textarea
                    value={block.content}
                    rows={2}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    placeholder="输入引言..."
                    className={`w-full ${getParagraphClass(block)} italic text-stone-700 bg-transparent outline-hidden resize-y font-serif`}
                  />
                </div>
              )}

              {/* 7. 待办事项 */}
              {block.type === 'todo' && (
                <div className={`flex items-center gap-2 ${getParagraphClass(block)}`}>
                  <input
                    type="checkbox"
                    checked={block.meta?.checked || false}
                    onChange={(e) =>
                      updateBlock(block.id, { meta: { checked: e.target.checked } })
                    }
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <input
                    type="text"
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    placeholder="待办内容..."
                    className={`flex-1 ${getParagraphClass(block)} text-stone-700 bg-transparent outline-hidden`}
                  />
                </div>
              )}

              {/* 8. 外部链接卡片编辑 */}
              {block.type === 'link' && (
                <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                      <Globe size={13} className="text-blue-600" />
                      <span>外部链接卡片</span>
                    </span>
                    {block.content && (
                      <a
                        href={block.content.startsWith('http') ? block.content : `https://${block.content}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>在新窗口测试打开</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        value={block.meta?.title || ''}
                        onChange={(e) => updateBlock(block.id, { meta: { title: e.target.value } })}
                        placeholder="链接标题（可选，如：项目架构规范）"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:border-indigo-400 outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={block.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateBlock(block.id, { content: val, meta: { ...block.meta, url: val } });
                        }}
                        placeholder="链接地址（https://...）"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:border-indigo-400 outline-none font-mono text-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 9. 表格组件 */}
              {block.type === 'table' && (
                <TableBlockComponent
                  content={block.content}
                  isEditing={true}
                  fontSizeClass={getParagraphClass(block)}
                  onUpdateContent={(newContent) => updateBlock(block.id, { content: newContent })}
                  onDeleteBlock={() => deleteBlock(block.id)}
                  onDuplicateBlock={() => duplicateBlock(index)}
                />
              )}

              {/* 块底部就地添加组件触发按钮 */}
              <div className="flex justify-center -mb-2 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setInsertMenuIndex(index)}
                  className="px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-600 shadow-2xs hover:bg-indigo-50 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={11} />
                  <span>在此处插入组件</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部快速追加组件按钮 */}
      <div className="pt-2 border-t border-dashed border-stone-200 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setInsertMenuIndex(blocks.length - 1)}
          className="px-3 py-1.5 rounded-xl bg-stone-100/80 hover:bg-indigo-50 hover:text-indigo-600 text-stone-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus size={13} />
          <span>+ 添加组件 (文字 / 表格 / 图片 / 代码)</span>
        </button>

        <span className="text-[10px] text-stone-400">支持拖入图片或截图粘贴</span>
      </div>

      {/* 插入组件微型弹层菜单 */}
      {insertMenuIndex !== null && (
        <div className="p-2.5 rounded-2xl bg-white border border-stone-200 shadow-xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 animate-in fade-in zoom-in-95">
          <button
            type="button"
            onClick={() => insertBlockAt(insertMenuIndex, 'paragraph', '新段落文本...')}
            className="p-2 rounded-xl hover:bg-stone-50 border border-stone-100 flex items-center gap-1.5 text-xs text-stone-700 text-left transition-colors cursor-pointer"
          >
            <Type size={14} className="text-stone-500" />
            <span>正文段落</span>
          </button>

          <button
            type="button"
            onClick={() => insertBlockAt(insertMenuIndex, 'heading', '二级标题')}
            className="p-2 rounded-xl hover:bg-stone-50 border border-stone-100 flex items-center gap-1.5 text-xs text-stone-700 text-left transition-colors cursor-pointer"
          >
            <Heading2 size={14} className="text-stone-500" />
            <span>小标题</span>
          </button>

          <button
            type="button"
            onClick={() =>
              insertBlockAt(
                insertMenuIndex,
                'table',
                stringifyTableContent(createDefaultTableData(3, 3))
              )
            }
            className="p-2 rounded-xl hover:bg-teal-50 border border-teal-200 bg-teal-50/40 flex items-center gap-1.5 text-xs text-teal-800 text-left transition-colors cursor-pointer"
          >
            <TableIcon size={14} className="text-teal-600" />
            <span className="font-semibold">表格</span>
          </button>

          <button
            type="button"
            onClick={() =>
              insertBlockAt(insertMenuIndex, 'ai-insight', 'AI 总结洞察与复盘要点...', {
                colorTheme: 'emerald',
              })
            }
            className="p-2 rounded-xl hover:bg-indigo-50 border border-indigo-100 flex items-center gap-1.5 text-xs text-indigo-900 text-left transition-colors cursor-pointer"
          >
            <Sparkles size={14} className="text-[#5146D8]" />
            <span>摘要</span>
          </button>

          <button
            type="button"
            onClick={() => triggerImageUpload(insertMenuIndex)}
            className="p-2 rounded-xl hover:bg-blue-50 border border-blue-100 flex items-center gap-1.5 text-xs text-blue-800 text-left transition-colors cursor-pointer"
          >
            <ImageIcon size={14} className="text-blue-600" />
            <span>插入图片</span>
          </button>

          <button
            type="button"
            onClick={() => insertBlockAt(insertMenuIndex, 'code', 'print("Hello World")')}
            className="p-2 rounded-xl hover:bg-slate-50 border border-slate-200 flex items-center gap-1.5 text-xs text-slate-800 text-left transition-colors cursor-pointer"
          >
            <Code2 size={14} className="text-slate-600" />
            <span>代码块</span>
          </button>

          <button
            type="button"
            onClick={() => insertBlockAt(insertMenuIndex, 'quote', '重要引言或备忘...')}
            className="p-2 rounded-xl hover:bg-purple-50 border border-purple-100 flex items-center gap-1.5 text-xs text-purple-800 text-left transition-colors cursor-pointer"
          >
            <Quote size={14} className="text-purple-600" />
            <span>引用块</span>
          </button>

          <button
            type="button"
            onClick={() => insertBlockAt(insertMenuIndex, 'todo', '待完成事项...')}
            className="p-2 rounded-xl hover:bg-amber-50 border border-amber-100 flex items-center gap-1.5 text-xs text-amber-800 text-left transition-colors cursor-pointer"
          >
            <CheckSquare size={14} className="text-amber-600" />
            <span>待办事项</span>
          </button>

          <button
            type="button"
            onClick={() =>
              insertBlockAt(insertMenuIndex, 'link', 'https://example.com', {
                title: '外部参考来源',
              })
            }
            className="p-2 rounded-xl hover:bg-blue-50 border border-blue-200 bg-blue-50/40 flex items-center gap-1.5 text-xs text-blue-900 text-left transition-colors cursor-pointer"
          >
            <Globe size={14} className="text-blue-600" />
            <span className="font-semibold">外部链接卡片</span>
          </button>
        </div>
      )}
    </div>
  );
};
