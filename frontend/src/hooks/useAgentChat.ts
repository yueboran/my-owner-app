/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 对话智能体状态管理与会话流 Hook
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  ChatSession,
  ChatMessage,
  AgentInfo,
  ChatFolder,
} from '../types/agentChat';
import { PRESET_AGENTS } from '../types/agentChat';

const STORAGE_SESSIONS_KEY = 'hk_agent_chat_sessions_v1';
const STORAGE_CURRENT_SESSION_KEY = 'hk_agent_active_session_id_v1';
const STORAGE_FOLDERS_KEY = 'hk_agent_chat_folders_v1';

// 初始多级目录结构
export const INITIAL_FOLDERS: ChatFolder[] = [
  {
    id: 'folder-arch',
    name: '架构设计与研发',
    parentId: null,
    createdAt: Date.now() - 86400000 * 7,
    isExpanded: true,
  },
  {
    id: 'folder-pipeline',
    name: '生产级流水线',
    parentId: 'folder-arch',
    createdAt: Date.now() - 86400000 * 5,
    isExpanded: true,
  },
  {
    id: 'folder-biz',
    name: '商业与行业分析',
    parentId: null,
    createdAt: Date.now() - 86400000 * 3,
    isExpanded: true,
  },
  {
    id: 'folder-daily',
    name: '工作日记与复盘',
    parentId: null,
    createdAt: Date.now() - 86400000 * 2,
    isExpanded: true,
  },
];

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: 'session-demo-china-map',
    title: 'Interactive China Map 足迹分析',
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2,
    selectedAgentId: 'general-assistant',
    isPinned: true,
    folderId: null, // 根目录未分类文档

    messages: [
      {
        id: 'msg-cm-1',
        role: 'user',
        content: '我刚去了西安和杭州，帮我把这两个城市的足迹记录下来，西安重点标兵马俑和肉夹馍，杭州标注西湖十景和龙井茶文脉',
        createdAt: Date.now() - 3600000 * 2,
      },
      {
        id: 'msg-cm-2',
        role: 'assistant',
        content: '已为您智能识别意图并路由至【华夏足迹】与【知识收集】模块！\n\n已提炼：\n• 陕西·西安：已点亮秦始皇陵兵马俑（名胜古迹）、老潼关肉夹馍（特色美食）、汉唐长安十三朝文脉；\n• 浙江·杭州：已点亮西湖文化景观、西湖龙井茶非遗技艺（文化渊源）。\n已在右侧整理为格式化草案，可随时审阅补充并保存！',
        createdAt: Date.now() - 3600000 * 2 + 1000,
      },
    ],
  },
  {
    id: 'session-demo-sidebar-ui',
    title: '侧边栏样式优化设计',
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5,
    selectedAgentId: 'general-assistant',
    folderId: 'folder-arch',
    messages: [
      {
        id: 'msg-sb-1',
        role: 'user',
        content: '需要把对话智能体移动到应用广场正下方，同时左侧要有会话历史管理列表，顶部带新建对话，每个条目右侧有三点菜单支持重命名、未读、复制、删除等。',
        createdAt: Date.now() - 3600000 * 5,
      },
      {
        id: 'msg-sb-2',
        role: 'assistant',
        content: '收到！布局已重构为三栏体系：左侧会话历史面板（带新建按钮与⋮管理菜单），中间流式对话路由中枢，右侧人工审阅补充工作台。整体遵循现代极简圆角高光风格。',
        createdAt: Date.now() - 3600000 * 5 + 1000,
      },
    ],
  },
  {
    id: 'session-demo-biz-ai',
    title: '具身智能人形机器人商业分析',
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 24,
    selectedAgentId: 'general-assistant',
    folderId: 'folder-biz',
    messages: [
      {
        id: 'msg-bz-1',
        role: 'user',
        content: '今天调研了具身智能人形机器人的商业落地路径，核心痛点是灵巧手成本高且缺乏通用大模型泛化，商业模式主要是工业巡检租赁与特种作业定制，市场规模2028年预计超500亿，竞争壁垒在数据闭环与高精度减速器供应链。',
        createdAt: Date.now() - 3600000 * 24,
      },
      {
        id: 'msg-bz-2',
        role: 'assistant',
        content: '已为您识别意图并归档至【商业分析】。\n\n### 核心要点提炼\n• **关键痛点**：灵巧手成本高且缺乏通用大模型泛化能力\n• **商业路径**：工业巡检租赁与特种作业定制方案\n• **市场规模**：预计2028年规模突破 500 亿元\n• **核心壁垒**：数据飞轮闭环与高精度减速器供应链协同\n\n已在右侧**文档编辑器**中整理成完整模块，请审阅后保存。',
        createdAt: Date.now() - 3600000 * 24 + 1000,
      },
    ],
  },
  {
    id: 'session-demo-daily-review',
    title: '今日前端流水线生产重构复盘',
    createdAt: Date.now() - 3600000 * 48,
    updatedAt: Date.now() - 3600000 * 48,
    selectedAgentId: 'general-assistant',
    folderId: 'folder-daily',
    messages: [
      {
        id: 'msg-dr-1',
        role: 'user',
        content: '今天完成了星图前端生产级流水线重构，把组件库封装好了，感觉分层清晰了很多，明天计划对接Dify工作流和图谱实体穿透，今天心情很充实，需要持续保持敏捷迭代节奏。',
        createdAt: Date.now() - 3600000 * 48,
      },
    ],
  },
  {
    id: 'session-demo-hello',
    title: '你好',
    createdAt: Date.now() - 3600000 * 72,
    updatedAt: Date.now() - 3600000 * 72,
    selectedAgentId: 'general-assistant',
    folderId: 'folder-pipeline',
    messages: [],
  },
];

export function useAgentChat() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse agent sessions:', e);
    }
    return INITIAL_SESSIONS;
  });

  // 多级目录状态管理
  const [folders, setFolders] = useState<ChatFolder[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_FOLDERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse chat folders:', e);
    }
    return INITIAL_FOLDERS;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_CURRENT_SESSION_KEY);
    return stored || sessions[0]?.id || 'session-demo-1';
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 持久化会话
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save sessions:', e);
    }
  }, [sessions]);

  // 持久化多级目录
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save chat folders:', e);
    }
  }, [folders]);

  // 持久化当前激活会话 ID
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CURRENT_SESSION_KEY, activeSessionId);
    } catch (e) {
      console.error('Failed to save activeSessionId:', e);
    }
  }, [activeSessionId]);

  // 创建新文件夹（支持多级目录）
  const createFolder = useCallback((name: string, parentId: string | null = null) => {
    const newFolder: ChatFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || '未命名文件夹',
      parentId: parentId || null,
      createdAt: Date.now(),
      isExpanded: true,
    };
    setFolders((prev) => [...prev, newFolder]);
    return newFolder;
  }, []);

  // 重命名文件夹
  const renameFolder = useCallback((folderId: string, newName: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name: newName.trim() || f.name } : f))
    );
  }, []);

  // 删除文件夹（子级文件夹与内部会话安全提升一级或移到根目录）
  const deleteFolder = useCallback((folderId: string) => {
    setFolders((prev) => {
      const target = prev.find((f) => f.id === folderId);
      const targetParentId = target?.parentId || null;
      return prev
        .filter((f) => f.id !== folderId)
        .map((f) => (f.parentId === folderId ? { ...f, parentId: targetParentId } : f));
    });

    setSessions((prev) =>
      prev.map((s) => (s.folderId === folderId ? { ...s, folderId: null } : s))
    );
  }, []);

  // 展开 / 收起文件夹
  const toggleFolderExpand = useCallback((folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f))
    );
  }, []);

  // 移动会话到指定文件夹（拖拽快速调整路径或下拉选择）
  const moveSessionToFolder = useCallback(
    (sessionId: string, targetFolderId: string | null = null) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, folderId: targetFolderId, updatedAt: Date.now() } : s
        )
      );
    },
    []
  );

  // 当前激活的会话对象
  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;
  }, [sessions, activeSessionId]);

  // 当前激活的智能体
  const currentAgent = useMemo(() => {
    const agentId = currentSession?.selectedAgentId || 'general-assistant';
    return PRESET_AGENTS.find((a) => a.id === agentId) || PRESET_AGENTS[0];
  }, [currentSession]);

  // 创建新会话（支持指定目标目录）
  const createNewSession = useCallback(
    (
      agentId: string = 'general-assistant',
      initialTitle: string = '新对话',
      folderId: string | null = null
    ) => {
      const newSession: ChatSession = {
        id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: initialTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        selectedAgentId: agentId,
        folderId: folderId || null,
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      return newSession;
    },
    []
  );

  // 切换会话
  const selectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  // 删除会话
  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== sessionId);
        if (next.length === 0) {
          const fallback = {
            id: `session-${Date.now()}`,
            title: '新对话',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [],
            selectedAgentId: 'general-assistant',
          };
          setActiveSessionId(fallback.id);
          return [fallback];
        }
        if (activeSessionId === sessionId) {
          setActiveSessionId(next[0].id);
        }
        return next;
      });
    },
    [activeSessionId]
  );

  // 切换会话所使用的智能体
  const switchAgent = useCallback((sessionId: string, agentId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, selectedAgentId: agentId } : s))
    );
  }, []);

  // 重命名会话
  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle.trim() } : s))
    );
  }, []);

  // 切换会话置顶状态
  const togglePinSession = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s))
    );
  }, []);

  // 切换未读状态
  const toggleUnreadSession = useCallback((sessionId: string, state?: boolean) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, isUnread: state !== undefined ? state : !s.isUnread } : s
      )
    );
  }, []);

  // 更新会话关联的结构化草案
  const updateSessionDraft = useCallback((sessionId: string, draft: any) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, draft, updatedAt: Date.now() } : s))
    );
  }, []);

  // 复制/拆分会话 (Split / Duplicate)
  const duplicateSession = useCallback(
    (sessionId: string) => {
      const source = sessions.find((s) => s.id === sessionId);
      if (!source) return;
      const newSession: ChatSession = {
        ...source,
        id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: `${source.title} (副本)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPinned: false,
        isUnread: false,
        messages: source.messages.map((m) => ({ ...m, id: `msg-copy-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })),
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      return newSession;
    },
    [sessions]
  );

  // 发送消息并触发大模型 / Dify 工作流处理
  const sendMessage = useCallback(
    async (userInput: string, customAgentId?: string) => {
      if (!userInput.trim() || isGenerating) return;

      const trimmedText = userInput.trim();
      let targetSessionId = activeSessionId;
      let sessionObj = sessions.find((s) => s.id === targetSessionId);

      // 如果当前没有可用会话，新建一个
      if (!sessionObj) {
        const created = createNewSession(customAgentId || 'general-assistant');
        targetSessionId = created.id;
        sessionObj = created;
      }

      const agentId = customAgentId || sessionObj.selectedAgentId || 'general-assistant';
      const agentConfig = PRESET_AGENTS.find((a) => a.id === agentId) || PRESET_AGENTS[0];

      // 1. 追加用户消息
      const userMsg: ChatMessage = {
        id: `msg-user-${Date.now()}`,
        role: 'user',
        content: trimmedText,
        createdAt: Date.now(),
      };

      // 2. 占位 Assistant 消息（流式）
      const assistantMsgId = `msg-ai-${Date.now()}`;
      const assistantPlaceholder: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        agentId: agentConfig.id,
        workflowNode: agentConfig.difyWorkflowKey
          ? `调用 Dify [${agentConfig.name}] 工作流...`
          : `OpenCode 底座引擎 [${agentConfig.opencodeEngine || 'LLM'}] 推理中...`,
        content: '',
        createdAt: Date.now(),
        isStreaming: true,
      };

      // 如果是新会话的第一条消息，自动将标题更新为输入内容摘要
      const isFirstMessage = sessionObj.messages.length === 0;
      const newTitle = isFirstMessage ? trimmedText.slice(0, 18) : sessionObj.title;

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              title: newTitle,
              updatedAt: Date.now(),
              selectedAgentId: agentId,
              messages: [...s.messages, userMsg, assistantPlaceholder],
            };
          }
          return s;
        })
      );

      setIsGenerating(true);
      abortControllerRef.current = new AbortController();

      try {
        // 调用后端 API 或智能生成
        const promptPayload = {
          content: `【智能体】：${agentConfig.name}\n【底座/工作流】：${
            agentConfig.difyWorkflowKey || agentConfig.opencodeEngine
          }\n【用户需求】：${trimmedText}`,
        };

        const response = await fetch('/api/knowledge/format', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(promptPayload),
          signal: abortControllerRef.current.signal,
        });

        let fullReply = '';
        if (response.ok) {
          const data = await response.json();
          fullReply =
            data.data?.content ||
            data.formatted_text ||
            `已成功执行【${agentConfig.name}】调度任务。\n针对需求「${trimmedText}」，系统已完成相关知识库穿透与逻辑推理，结果已结构化输出。`;
        } else {
          throw new Error('API request failed');
        }

        // 模拟打字机流式渐进展现体验
        let currentLen = 0;
        const totalLen = fullReply.length;
        const chunkSize = Math.max(2, Math.floor(totalLen / 20));

        const interval = setInterval(() => {
          currentLen += chunkSize;
          if (currentLen >= totalLen) {
            currentLen = totalLen;
            clearInterval(interval);
            setIsGenerating(false);
          }

          const partialText = fullReply.slice(0, currentLen);
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === targetSessionId) {
                return {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content: partialText,
                          isStreaming: currentLen < totalLen,
                          workflowNode: `${agentConfig.name} · 执行完成`,
                        }
                      : m
                  ),
                };
              }
              return s;
            })
          );
        }, 35);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Generation stopped by user');
        } else {
          // 本地智能回退生成
          const fallbackText = `### 🤖 ${agentConfig.name} 回复

针对您的提问：**「${trimmedText}」**

1. **核心解析**：系统基于 ${
            agentConfig.difyWorkflowKey ? 'Dify 编排工作流' : 'OpenCode 底座能力'
          }，对上下文和专业知识进行了多维度推理。
2. **执行建议**：
   - 建议在璀璨星图知识库中保持条目实时更新。
   - 可在左侧选择特定智能体或模板库一键生成深度文档。
3. **状态**：相关数据已留档于当前会话。`;

          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === targetSessionId) {
                return {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content: fallbackText,
                          isStreaming: false,
                          workflowNode: `${agentConfig.name} · 响应就绪`,
                        }
                      : m
                  ),
                };
              }
              return s;
            })
          );
        }
        setIsGenerating(false);
      }
    },
    [activeSessionId, isGenerating, sessions, createNewSession]
  );

  // 停止生成
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  }, []);

  // 追加单条消息或直接更新整个消息列表，确保 React 状态即时响应渲染
  const updateSessionMessages = useCallback(
    (sessionId: string, messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === sessionId) {
            const nextList = typeof messages === 'function' ? messages(s.messages) : messages;
            return {
              ...s,
              messages: nextList,
              updatedAt: Date.now(),
            };
          }
          return s;
        })
      );
    },
    []
  );

  const appendMessage = useCallback((sessionId: string, message: ChatMessage) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: [...s.messages, message],
            updatedAt: Date.now(),
          };
        }
        return s;
      })
    );
  }, []);

  return {
    sessions,
    activeSessionId,
    currentSession,
    currentAgent,
    isGenerating,
    createNewSession,
    selectSession,
    deleteSession,
    renameSession,
    togglePinSession,
    toggleUnreadSession,
    updateSessionDraft,
    updateSessionMessages,
    appendMessage,
    duplicateSession,
    switchAgent,
    sendMessage,
    stopGeneration,
    // 多级目录状态与操作
    folders,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleFolderExpand,
    moveSessionToFolder,
  };
}
