/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 知识收集与知识便签持久化 Hook（支持附件与图片/HTML预览）
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { KnowledgeClip, ClipCategory, KnowledgeAttachment, KnowledgeFolder } from '../types/knowledgeClip';

const STORAGE_KEY = 'hk_knowledge_clips_v2';
const FOLDERS_STORAGE_KEY = 'hk_knowledge_folders_v1';

export const INITIAL_KNOWLEDGE_FOLDERS: KnowledgeFolder[] = [
  {
    id: 'kfolder-arch',
    name: '架构设计与前沿工程',
    parentId: null,
    createdAt: Date.now() - 3600000 * 48,
    isExpanded: true,
  },
  {
    id: 'kfolder-tech',
    name: '技术片段与算法实战',
    parentId: null,
    createdAt: Date.now() - 3600000 * 24,
    isExpanded: true,
  },
  {
    id: 'kfolder-rag',
    name: '知识检索与向量图谱',
    parentId: null,
    createdAt: Date.now() - 3600000 * 12,
    isExpanded: true,
  },
];

// 初始高质感内嵌 SVG 架构图 (Data URI)
const ARCHITECTURE_IMG_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 320" width="100%" height="100%">
  <rect width="600" height="320" fill="#0f172a" rx="16"/>
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <text x="300" y="40" fill="#f8fafc" font-size="16" font-family="system-ui, sans-serif" font-weight="bold" text-anchor="middle">前端工程企业级四层架构拓扑</text>
  
  <!-- Layer 1 -->
  <rect x="50" y="70" width="500" height="45" rx="8" fill="url(#grad1)" opacity="0.9"/>
  <text x="300" y="98" fill="#ffffff" font-size="13" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">1. UI 组件层 (Tailwind + Radix UI · 纯渲染)</text>
  
  <!-- Layer 2 -->
  <rect x="50" y="125" width="500" height="45" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="300" y="153" fill="#93c5fd" font-size="13" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">2. 业务视图层 (页面容器 · 状态编排 · 交互路由)</text>
  
  <!-- Layer 3 -->
  <rect x="50" y="180" width="500" height="45" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="1.5"/>
  <text x="300" y="208" fill="#6ee7b7" font-size="13" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">3. 领域逻辑层 (Custom Hooks · 领域计算模型)</text>
  
  <!-- Layer 4 -->
  <rect x="50" y="235" width="500" height="45" rx="8" fill="url(#grad2)" opacity="0.9"/>
  <text x="300" y="263" fill="#ffffff" font-size="13" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">4. 基础设施与数据层 (REST/WebSocket API · 本地缓存)</text>
</svg>
`)}`;

// 初始高质感压测图 (Data URI)
const BENCHMARK_IMG_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 320" width="100%" height="100%">
  <rect width="600" height="320" fill="#18181b" rx="16"/>
  <text x="300" y="40" fill="#fafafa" font-size="16" font-family="system-ui, sans-serif" font-weight="bold" text-anchor="middle">FastAPI 异步流式压测吞吐量对比 (RPS)</text>
  
  <!-- Grid -->
  <line x1="80" y1="240" x2="520" y2="240" stroke="#3f3f46" stroke-width="1"/>
  <line x1="80" y1="180" x2="520" y2="180" stroke="#27272a" stroke-width="1" stroke-dasharray="4"/>
  <line x1="80" y1="120" x2="520" y2="120" stroke="#27272a" stroke-width="1" stroke-dasharray="4"/>
  <line x1="80" y1="60" x2="520" y2="60" stroke="#27272a" stroke-width="1" stroke-dasharray="4"/>
  
  <!-- Bar 1: 同步阻塞 -->
  <rect x="140" y="160" width="70" height="80" rx="6" fill="#ef4444"/>
  <text x="175" y="150" fill="#f87171" font-size="12" font-family="monospace" text-anchor="middle">1,240 RPS</text>
  <text x="175" y="265" fill="#a1a1aa" font-size="12" font-family="system-ui" text-anchor="middle">传统同步阻塞</text>
  
  <!-- Bar 2: AsyncGenerator 优化 -->
  <rect x="360" y="80" width="70" height="160" rx="6" fill="#10b981"/>
  <text x="395" y="70" fill="#34d399" font-size="12" font-family="monospace" font-weight="bold" text-anchor="middle">4,960 RPS (+300%)</text>
  <text x="395" y="265" fill="#34d399" font-size="12" font-family="system-ui" font-weight="bold" text-anchor="middle">异步流式网关</text>
</svg>
`)}`;

// 初始交互式 HTML 演示文件内容
const DEMO_HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>现代前端分层交互式架构演示</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; margin: 0; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    h2 { margin-top: 0; color: #38bdf8; font-size: 18px; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.6; }
    .btn { background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; }
    .btn:hover { background: #1d4ed8; }
    .status { margin-top: 12px; padding: 8px 12px; background: #090d16; border-radius: 6px; font-family: monospace; font-size: 12px; color: #34d399; }
  </style>
</head>
<body>
  <div class="card">
    <h2>⚡ 前端分层状态流模拟器</h2>
    <p>这是一个独立的交互式 HTML 附件。在当前沙箱中，您可以点击下方按钮模拟一次由业务视图触发、经过领域逻辑层计算并完成基础设施持久化的完整调用链路：</p>
    <button class="btn" onclick="runSimulation()">触发领域层分发 (Dispatch Action)</button>
    <div id="output" class="status">等待触发交互...</div>
  </div>
  <script>
    function runSimulation() {
      const el = document.getElementById('output');
      el.innerText = '正在执行: UI -> View -> CustomHook -> StateStore -> IndexedDB [200 OK]';
      el.style.color = '#38bdf8';
      setTimeout(() => {
        el.innerText = '状态已成功同步并完成本地持久化！响应耗时: 12ms';
        el.style.color = '#34d399';
      }, 300);
    }
  </script>
</body>
</html>`;

const INITIAL_CLIPS: KnowledgeClip[] = [
  {
    id: 'clip-1',
    title: '现代大型前端项目的分层设计原则',
    content: '1. UI 组件层（无副作用纯渲染，基于 Tailwind + Radix UI）\n2. 业务视图层（状态组合与交互编排）\n3. 领域逻辑层（自定义 Hooks + 纯函数计算）\n4. 基础设施与数据层（API 抽象与持久化缓存）',
    category: 'design',
    tags: ['前端架构', 'Clean Architecture', '最佳实践'],
    sourceUrl: 'https://linear.app/method',
    isPinned: true,
    folderId: 'kfolder-arch',
    attachments: [
      {
        id: 'att-1-img',
        name: '前端四层架构拓扑图.png',
        type: 'image',
        size: 48200,
        url: ARCHITECTURE_IMG_SVG,
        createdAt: Date.now() - 3600000 * 24 * 2,
      },
      {
        id: 'att-1-html',
        name: '分层状态流交互原型.html',
        type: 'html',
        size: 1540,
        content: DEMO_HTML_CONTENT,
        createdAt: Date.now() - 3600000 * 24 * 2,
      },
    ],
    createdAt: Date.now() - 3600000 * 24 * 2,
    updatedAt: Date.now() - 3600000 * 24 * 2,
  },
  {
    id: 'clip-2',
    title: 'FastAPI + Pydantic v2 高性能异步网关调优',
    content: '在处理大模型流式传输时，采用 StreamingResponse 结合 AsyncGenerator，利用 asyncio.to_thread 防止阻塞事件循环，并发吞吐量提升 300%。',
    category: 'tech',
    tags: ['FastAPI', 'Python', '性能优化', 'AI网关'],
    sourceUrl: 'https://fastapi.tiangolo.com',
    isPinned: true,
    folderId: 'kfolder-tech',
    attachments: [
      {
        id: 'att-2-img',
        name: '吞吐量压测对比图.png',
        type: 'image',
        size: 32600,
        url: BENCHMARK_IMG_SVG,
        createdAt: Date.now() - 3600000 * 12,
      },
    ],
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 12,
  },
  {
    id: 'clip-3',
    title: '知识图谱与向量数据库的混合检索（Hybrid Search）',
    content: '密集向量检索（Dense Vector）擅长语义联想与泛化，稀疏图谱关系（Knowledge Graph）擅长精准多跳推理与实体穿透。两者结合能大幅降低 LLM 幻觉。',
    category: 'insight',
    tags: ['知识图谱', 'RAG', '混合检索'],
    isPinned: false,
    folderId: 'kfolder-rag',
    attachments: [],
    createdAt: Date.now() - 3600000 * 4,
    updatedAt: Date.now() - 3600000 * 4,
  },
];

export function useKnowledgeClips() {
  const [clips, setClips] = useState<KnowledgeClip[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 确保初始预置卡片具有附件模型兼容，并自动校准图片附件的类型与数据，清洗aiSummary
          return parsed.map((item: KnowledgeClip) => {
            const init = INITIAL_CLIPS.find((c) => c.id === item.id);
            const rawAttachments = (item.attachments && item.attachments.length > 0)
              ? item.attachments
              : (init?.attachments || []);

            const fixedAttachments = rawAttachments.map((att) => {
              const initAtt = init?.attachments?.find((a) => a.id === att.id || a.name === att.name);
              const isImg =
                att.type === 'image' ||
                att.type === 'image/png' ||
                (typeof att.type === 'string' && att.type.startsWith('image/')) ||
                Boolean(att.name && /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(att.name));

              return {
                ...att,
                type: isImg ? ('image' as const) : att.type,
                url: att.url || initAtt?.url || '',
              };
            });

            return {
              ...item,
              aiSummary: undefined,
              attachments: fixedAttachments,
            };
          });
        }
      }
    } catch (e) {
      console.error('Failed to load knowledge clips from storage:', e);
    }
    return INITIAL_CLIPS;
  });

  // 多级目录持久化状态
  const [folders, setFolders] = useState<KnowledgeFolder[]>(() => {
    try {
      const stored = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load knowledge folders:', e);
    }
    return INITIAL_KNOWLEDGE_FOLDERS;
  });

  // 持久化保存知识卡片
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
    } catch (e) {
      console.error('Failed to save knowledge clips to storage:', e);
    }
  }, [clips]);

  // 持久化保存多级目录
  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save knowledge folders to storage:', e);
    }
  }, [folders]);

  // 创建目录
  const createFolder = useCallback((name: string, parentId?: string | null) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const newFolder: KnowledgeFolder = {
      id: `kfolder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      parentId: parentId || null,
      createdAt: Date.now(),
      isExpanded: true,
    };
    setFolders((prev) => [...prev, newFolder]);
    return newFolder;
  }, []);

  // 重命名目录
  const renameFolder = useCallback((id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f))
    );
  }, []);

  // 删除目录
  const deleteFolder = useCallback((folderId: string) => {
    setFolders((prev) => {
      const target = prev.find((f) => f.id === folderId);
      const parentId = target?.parentId || null;
      return prev
        .filter((f) => f.id !== folderId)
        .map((f) => (f.parentId === folderId ? { ...f, parentId } : f));
    });
    setClips((prev) =>
      prev.map((t) =>
        t.folderId === folderId ? { ...t, folderId: null, updatedAt: Date.now() } : t
      )
    );
  }, []);

  // 展开/折叠目录
  const toggleFolderExpand = useCallback((folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f))
    );
  }, []);

  // 快速拖拽调整知识卡片归属路径
  const moveClipToFolder = useCallback((clipId: string, folderId: string | null) => {
    setClips((prev) =>
      prev.map((t) =>
        t.id === clipId
          ? { ...t, folderId: folderId || null, updatedAt: Date.now() }
          : t
      )
    );
  }, []);

  // 新增知识卡片
  const addClip = useCallback(
    (params: {
      title: string;
      content: string;
      category?: ClipCategory;
      tags?: string[];
      sourceUrl?: string;
      attachments?: KnowledgeAttachment[];
      folderId?: string | null;
    }) => {
      const newClip: KnowledgeClip = {
        id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: params.title.trim(),
        content: params.content.trim(),
        category: params.category || 'tech',
        tags: params.tags || [],
        sourceUrl: params.sourceUrl?.trim() || undefined,
        folderId: params.folderId || null,
        isPinned: false,
        attachments: params.attachments || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setClips((prev) => [newClip, ...prev]);
      return newClip;
    },
    []
  );

  // 为已有卡片直接追加附件
  const addAttachmentToClip = useCallback(
    (clipId: string, attachment: KnowledgeAttachment) => {
      setClips((prev) =>
        prev.map((c) =>
          c.id === clipId
            ? { ...c, attachments: [...(c.attachments || []), attachment], updatedAt: Date.now() }
            : c
        )
      );
    },
    []
  );

  // 删除卡片中的指定附件
  const removeAttachmentFromClip = useCallback(
    (clipId: string, attachmentId: string) => {
      setClips((prev) =>
        prev.map((c) =>
          c.id === clipId
            ? {
                ...c,
                attachments: (c.attachments || []).filter((a) => a.id !== attachmentId),
                updatedAt: Date.now(),
              }
            : c
        )
      );
    },
    []
  );

  // 更新知识收集
  const updateClip = useCallback((id: string, updates: Partial<KnowledgeClip>) => {
    setClips((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: Date.now() } : item
      )
    );
  }, []);

  // 删除知识收集
  const deleteClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // 切换置顶状态
  const togglePin = useCallback((id: string) => {
    setClips((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isPinned: !item.isPinned, updatedAt: Date.now() } : item
      )
    );
  }, []);

  // 保存/生成 AI 提炼
  const saveAiSummary = useCallback((id: string, summary: string) => {
    setClips((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, aiSummary: summary, updatedAt: Date.now() } : item
      )
    );
  }, []);

  // 所有已有标签集合
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    clips.forEach((c) => {
      c.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet);
  }, [clips]);

  return {
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
    saveAiSummary,
    addAttachmentToClip,
    removeAttachmentFromClip,
    allTags,
  };
}
