/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 个人日记与工作复盘状态管理 Hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { JournalEntry, JournalCategory, MoodType, WeatherType, JournalFolder } from '../types/journal';
import type { KnowledgeAttachment } from '../types/knowledgeClip';

const STORAGE_KEY = 'hk_personal_journal_v1';
const FOLDERS_STORAGE_KEY = 'hk_journal_folders_v1';

const getTodayString = () => new Date().toISOString().slice(0, 10);

export const INITIAL_JOURNAL_FOLDERS: JournalFolder[] = [
  {
    id: 'jfolder-work',
    name: '工作复盘与工程实践',
    parentId: null,
    createdAt: Date.now() - 3600000 * 48,
    isExpanded: true,
  },
  {
    id: 'jfolder-thought',
    name: '思考顿悟与前沿研读',
    parentId: null,
    createdAt: Date.now() - 3600000 * 24,
    isExpanded: true,
  },
];

const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'journal-1',
    title: '璀璨星图前端生产级工程流水线重构复盘',
    content: `今天完成了前端 5 大生产级 Skills 的全面落地：
1. 审美层级：规范了现代浅色科技白蓝渐变与卡片阴影，反 AI 模板化。
2. 组件体系：封装了 Button, Badge, Card, Input, Modal, Tabs 等无障碍组件。
3. 导航架构：在个人助理下完成了对话智能体、待办中枢与知识收集中枢的层级收纳。
4. 代码质量：严格遵循 TypeScript 强类型与单文件行数控制。

**收获与心得**：分层架构与领域自定义 Hooks 让状态解耦极其清晰，后续接入真实 Dify 工作流将非常丝滑！`,
    date: getTodayString(),
    category: 'work',
    tags: ['前端架构', '生产级流水线'],
    isPinned: true,
    folderId: 'jfolder-work',
    createdAt: Date.now() - 3600000 * 3,
    updatedAt: Date.now() - 3600000 * 3,
  },
  {
    id: 'journal-2',
    title: '关于大模型 Agent 底座与知识图谱融合的思考',
    content: `上午研究了 OpenCode 与 Dify 在复杂业务场景下的协同模式。
- 纯 LLM 容易产生幻觉，缺乏精准的结构化事实。
- 璀璨星图的知识图谱实体穿透能力恰好可以作为 RAG 的黄金约束。
- 明天计划进一步梳理多跳推理的数据通路。`,
    date: new Date(Date.now() - 3600000 * 24).toISOString().slice(0, 10),
    category: 'work',
    tags: ['AI架构', '知识图谱', 'Dify'],
    isPinned: false,
    folderId: 'jfolder-thought',
    createdAt: Date.now() - 3600000 * 26,
    updatedAt: Date.now() - 3600000 * 26,
  },
];

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 清洗旧缓存中自动塞入的 milestone / mood / weather / aiReflection
          return parsed.map((item: JournalEntry) => ({
            ...item,
            category: item.category === 'milestone' ? 'work' : item.category,
            mood: undefined,
            weather: undefined,
            aiReflection: undefined,
            tags: (item.tags || []).filter((t: string) => t !== '里程碑'),
          }));
        }
      }
    } catch (e) {
      console.error('Failed to parse journal entries:', e);
    }
    return INITIAL_JOURNAL_ENTRIES;
  });

  const [activeEntryId, setActiveEntryId] = useState<string>(() => {
    return entries[0]?.id || 'journal-1';
  });

  // 多级目录持久化状态
  const [folders, setFolders] = useState<JournalFolder[]>(() => {
    try {
      const stored = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse journal folders:', e);
    }
    return INITIAL_JOURNAL_FOLDERS;
  });

  // 本地持久化日记
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save journal entries:', e);
    }
  }, [entries]);

  // 本地持久化多级目录
  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save journal folders:', e);
    }
  }, [folders]);

  // 创建目录
  const createFolder = useCallback((name: string, parentId?: string | null) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const newFolder: JournalFolder = {
      id: `jfolder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    setEntries((prev) =>
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

  // 快速拖拽调整日记归属路径
  const moveEntryToFolder = useCallback((entryId: string, folderId: string | null) => {
    setEntries((prev) =>
      prev.map((t) =>
        t.id === entryId
          ? { ...t, folderId: folderId || null, updatedAt: Date.now() }
          : t
      )
    );
  }, []);

  // 当前激活的日记
  const activeEntry = useMemo(() => {
    return entries.find((e) => e.id === activeEntryId) || entries[0] || null;
  }, [entries, activeEntryId]);

  // 新增日记
  const addEntry = useCallback(
    (params: {
      title: string;
      content: string;
      date?: string;
      category?: JournalCategory;
      mood?: MoodType;
      weather?: WeatherType;
      tags?: string[];
      attachments?: KnowledgeAttachment[];
      attachmentPosition?: 'top' | 'bottom';
      folderId?: string | null;
      blocks?: import('../types/cardBlock').CardBlock[];
      aiReflection?: string;
    }) => {
      const newEntry: JournalEntry = {
        id: `journal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: params.title.trim() || '无题日记',
        content: params.content.trim(),
        date: params.date || getTodayString(),
        category: params.category || 'work',
        mood: params.mood || 'peaceful',
        weather: params.weather || 'sunny',
        tags: params.tags || [],
        attachments: params.attachments || [],
        attachmentPosition: params.attachmentPosition || 'bottom',
        folderId: params.folderId || null,
        blocks: params.blocks,
        aiReflection: params.aiReflection,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setEntries((prev) => [newEntry, ...prev]);
      setActiveEntryId(newEntry.id);
      return newEntry;
    },
    []
  );

  // 为日记追加附件
  const addAttachmentToEntry = useCallback((entryId: string, attachment: KnowledgeAttachment) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== entryId) return item;
        const currentAtts = item.attachments || [];
        return {
          ...item,
          attachments: [...currentAtts, attachment],
          updatedAt: Date.now(),
        };
      })
    );
  }, []);

  // 为日记移除附件
  const removeAttachmentFromEntry = useCallback((entryId: string, attachmentId: string) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== entryId) return item;
        return {
          ...item,
          attachments: (item.attachments || []).filter((a) => a.id !== attachmentId),
          updatedAt: Date.now(),
        };
      })
    );
  }, []);

  // 更新日记
  const updateEntry = useCallback((id: string, updates: Partial<JournalEntry>) => {
    setEntries((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: Date.now() } : item
      )
    );
  }, []);

  // 删除日记
  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // 置顶切换
  const togglePin = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isPinned: !item.isPinned, updatedAt: Date.now() } : item
      )
    );
  }, []);

  // 保存 AI 复盘建议
  const saveAiReflection = useCallback((id: string, reflection: string) => {
    setEntries((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, aiReflection: reflection, updatedAt: Date.now() } : item
      )
    );
  }, []);

  // 提取所有标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => e.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [entries]);

  return {
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
    saveAiReflection,
    addAttachmentToEntry,
    removeAttachmentFromEntry,
    allTags,
  };
}
