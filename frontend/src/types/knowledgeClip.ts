/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 知识收集数据类型定义
 */

export type ClipCategory =
  | 'tech'       // 技术片段
  | 'design'     // 架构设计
  | 'insight'    // 灵感洞察
  | 'resource'   // 优质资源
  | 'article'    // 待研读文章
  | 'other';     // 随手随记

export interface ClipCategoryConfig {
  id: ClipCategory;
  label: string;
  badgeClass: string;
  bgLight: string;
  color: string;
}

export const CLIP_CATEGORIES: ClipCategoryConfig[] = [
  {
    id: 'tech',
    label: '技术片段',
    badgeClass: 'border-[#3b82f6]/30 text-[#2563eb] bg-[#eff6ff]',
    bgLight: '#eff6ff',
    color: '#2563eb',
  },
  {
    id: 'design',
    label: '架构设计',
    badgeClass: 'border-[#8b5cf6]/30 text-[#7c3aed] bg-[#f5f3ff]',
    bgLight: '#f5f3ff',
    color: '#7c3aed',
  },
  {
    id: 'insight',
    label: '灵感洞察',
    badgeClass: 'border-[#ec4899]/30 text-[#db2777] bg-[#fdf2f8]',
    bgLight: '#fdf2f8',
    color: '#db2777',
  },
  {
    id: 'resource',
    label: '优质资源',
    badgeClass: 'border-[#10b981]/30 text-[#059669] bg-[#ecfdf5]',
    bgLight: '#ecfdf5',
    color: '#059669',
  },
  {
    id: 'article',
    label: '待研读文章',
    badgeClass: 'border-[#f59e0b]/30 text-[#d97706] bg-[#fffbeb]',
    bgLight: '#fffbeb',
    color: '#d97706',
  },
  {
    id: 'other',
    label: '随手随记',
    badgeClass: 'border-[#64748b]/30 text-[#475569] bg-[#f8fafc]',
    bgLight: '#f8fafc',
    color: '#475569',
  },
];

export type AttachmentType = 'image' | 'html' | 'document' | 'other';

export interface KnowledgeAttachment {
  id: string;
  name: string; // 文件名，如 "架构分层图.png" 或 "interactive-demo.html"
  type: AttachmentType; // 附件分类
  size?: number; // 字节大小
  url?: string; // 数据 DataURL 或 Blob 链接
  content?: string; // 针对 html 或文本文件保存其原始代码，用于沙箱渲染
  thumbnail?: string; // 缩略图
  createdAt: number;
}

export interface KnowledgeFolder {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt: number;
  isExpanded?: boolean;
}

export interface KnowledgeClip {
  id: string;
  title: string;
  content: string;
  category: ClipCategory;
  tags: string[];
  sourceUrl?: string;
  isPinned: boolean;
  folderId?: string | null;
  attachments?: KnowledgeAttachment[]; // 卡片附件列表（图片、HTML文件等）
  attachmentPosition?: 'top' | 'bottom'; // 附件未内嵌时相对于正文的位置（默认 'bottom'）
  createdAt: number;
  updatedAt: number;
  aiSummary?: string;
  blocks?: import('./cardBlock').CardBlock[]; // 块编辑器节点树
  globalFontSize?: import('./cardBlock').FontSizeLevel; // 全局正文字号
  titleFontSize?: import('./cardBlock').TitleFontSizeLevel; // 主标题字号
}
