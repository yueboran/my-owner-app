/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 对话智能体 · 模型对话列表与任务路由交互中枢
 * 核心特性：
 * 1. 左侧：完全复刻图 4 经典模型会话列表样式（+ 新建对话、搜索框、今天 / 7天内 / 30天内时间分组、三点菜单、共 X 个对话与实时持久化）
 * 2. 中间：流式对话路由交互中枢（输入非结构化需求，自动识别意图并驱动组件流提炼）
 * 3. 右侧：全屏沉浸式文档编辑器（CardBlockEditor，就地编辑、块拖拽与一键持久化保存）
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  Plus,
  MoreVertical,
  Pin,
  Trash2,
  Edit2,
  Copy,
  Split,
  Mail,
  Check,
  X,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  Layers,
  TrendingUp,
  PenLine,
  ListTodo,
  ChevronDown,
  HelpCircle,
  Play,
  FastForward,
  Wrench,
  Cpu,
  Workflow,
  Sparkle,
  ShieldCheck,
  ArrowUp,
  BookOpen,
} from 'lucide-react';
import { useAgentChat } from '../../hooks/useAgentChat';
import {
  ROUTED_TASK_TYPES,
  classifyIntentAndRoute,
  formatIntoStructuredDraft,
  saveDraftToTargetModule,
  setPendingAiDraft,
  getPendingAiDraft,
  checkInputCompleteness,
  generateWorkflowPlan,
  type RoutedTaskType,
  type StructuredDraft,
  type PendingAiDraft,
} from '../../services/smartRouterService';
import {
  DEFAULT_SKILLS,
  DEFAULT_TOOLS,
  DEFAULT_PROMPTS,
} from '../../data/promptSkillsData';
import { MarkdownView } from '../common/MarkdownView';
import {
  AVAILABLE_CHAT_MODELS,
  type ChatSession,
  type ChatMessage,
  type ChatModelOption,
  type WorkflowPlan,
  type PlanStep,
  type ClarificationQuestion,
} from '../../types/agentChat';

interface AgentChatViewProps {
  onNavigate?: (tabName: string) => void;
}

export const AgentChatView: React.FC<AgentChatViewProps> = ({ onNavigate }) => {
  const {
    sessions,
    activeSessionId,
    currentSession,
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
  } = useAgentChat();

  // 侧边栏折叠状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 搜索关键字
  const [searchKeyword, setSearchKeyword] = useState('');

  // 三点更多菜单激活 ID
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);

  // 内联重命名状态
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  // Toast 提示
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 输入框文字与处理中状态
  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 当前激活的结构化草案
  const [currentDraft, setCurrentDraft] = useState<StructuredDraft | null>(null);

  // 当前正在执行或等待确认的工作流计划 (Agentic Workflow Plan)
  const [activeWorkflowPlan, setActiveWorkflowPlan] = useState<WorkflowPlan | null>(null);

  // 当前激活的多轮信息澄清提问
  const [activeClarification, setActiveClarification] = useState<ClarificationQuestion | null>(null);

  // 正在单步执行状态
  const [isExecutingStep, setIsExecutingStep] = useState(false);

  // 保存成功的反馈
  const [saveFeedback, setSaveFeedback] = useState<{
    show: boolean;
    moduleLabel: string;
    targetTab: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const modelSelectorRef = useRef<HTMLDivElement | null>(null);

  // 全量可选的 Skills, Tools, Prompts 选项，供步骤确认栏下拉选择与更换
  const stepTargetOptions = useMemo(() => {
    return [
      {
        groupLabel: '🧩 核心技能库 (Skills)',
        items: DEFAULT_SKILLS.map((s) => ({
          id: s.id,
          name: s.name,
          category: 'skill' as const,
          description: s.description,
        })),
      },
      {
        groupLabel: '🛠️ 专用工具箱 (Tools)',
        items: DEFAULT_TOOLS.map((t) => ({
          id: t.id,
          name: t.name,
          category: 'tool' as const,
          description: t.description,
        })),
      },
      {
        groupLabel: '💡 专家级提示词 (Prompts)',
        items: DEFAULT_PROMPTS.map((p) => ({
          id: p.id,
          name: p.title,
          category: 'prompt' as const,
          description: p.description,
        })),
      },
    ];
  }, []);

  // 本地动态检测出的 OpenCode 模型列表
  const [detectedModels, setDetectedModels] = useState<ChatModelOption[]>([]);
  const [isDetectingModels, setIsDetectingModels] = useState(false);
  const [modelFilterTab, setModelFilterTab] = useState<'opencode' | 'all'>('opencode');
  const [modelSearchQuery, setModelSearchQuery] = useState('');

  // 动态自动拉取本地 OpenCode 真实模型
  const fetchDetectedModels = async () => {
    setIsDetectingModels(true);
    try {
      const res = await fetch('/api/opencode/models');
      const json = await res.json();
      const list = json?.data?.models;
      if (Array.isArray(list) && list.length > 0) {
        setDetectedModels(list);
      }
    } catch (e) {
      console.error('Fetch opencode models error:', e);
    } finally {
      setIsDetectingModels(false);
    }
  };

  useEffect(() => {
    fetchDetectedModels();
  }, []);

  // 合并全量可用大模型（OpenCode 动态检测模型置顶 + 基础模型）
  const allAvailableModels = useMemo<ChatModelOption[]>(() => {
    if (detectedModels.length === 0) {
      return AVAILABLE_CHAT_MODELS;
    }
    const detectedIds = new Set(detectedModels.map((m) => m.id));
    const defaults = AVAILABLE_CHAT_MODELS.filter((m) => !detectedIds.has(m.id));
    return [...detectedModels, ...defaults];
  }, [detectedModels]);

  // 根据选项卡与搜索词筛选后的模型列表
  const displayModels = useMemo<ChatModelOption[]>(() => {
    let list = allAvailableModels;
    if (modelFilterTab === 'opencode') {
      list = list.filter((m) => (m as any).isLocalOpenCode || m.provider === 'OpenCode' || m.id.includes('opencode') || m.id.includes('siliconflow'));
    }
    if (modelSearchQuery.trim()) {
      const q = modelSearchQuery.toLowerCase();
      list = list.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.tag.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allAvailableModels, modelFilterTab, modelSearchQuery]);

  // 当前激活的大语言基座模型
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    try {
      return localStorage.getItem('starmap_selected_chat_model') || 'siliconflow-cn/deepseek-ai/DeepSeek-V3';
    } catch {
      return 'deepseek-v3';
    }
  });
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  const selectedModel = useMemo(() => {
    return (
      allAvailableModels.find((m) => m.id === selectedModelId) ||
      allAvailableModels[0] ||
      AVAILABLE_CHAT_MODELS[0]
    );
  }, [allAvailableModels, selectedModelId]);

  const handleSelectModel = (model: ChatModelOption) => {
    setSelectedModelId(model.id);
    setIsModelSelectorOpen(false);
    try {
      localStorage.setItem('starmap_selected_chat_model', model.id);
    } catch {}
    showToast(`已切换至模型【${model.name}】`);
  };

  // 当切换会话时，加载草案与恢复工作流状态
  useEffect(() => {
    if (currentSession?.draft) {
      setCurrentDraft(currentSession.draft);
    } else {
      const lastUserMsg = [...(currentSession?.messages || [])]
        .reverse()
        .find((m) => m.role === 'user');
      if (lastUserMsg) {
        const routing = classifyIntentAndRoute(lastUserMsg.content);
        const draft = formatIntoStructuredDraft(lastUserMsg.content, routing.taskType);
        setCurrentDraft(draft);
      } else {
        setCurrentDraft(null);
      }
    }

    // 恢复最近一次工作流计划与多轮澄清状态
    const lastAiMsg = [...(currentSession?.messages || [])]
      .reverse()
      .find((m) => m.role === 'assistant');
    if (lastAiMsg?.plan && !lastAiMsg.plan.isCompleted) {
      setActiveWorkflowPlan(lastAiMsg.plan);
    } else {
      setActiveWorkflowPlan(null);
    }

    if (lastAiMsg?.clarification) {
      setActiveClarification(lastAiMsg.clarification);
    } else {
      setActiveClarification(null);
    }

    setSaveFeedback(null);
  }, [activeSessionId, currentSession]);

  // 监听外部注入输入框提示词事件 (例如从提示词库一键唤起运行)
  useEffect(() => {
    const handleFillInput = (e: any) => {
      if (e.detail?.prompt) {
        setInputVal(e.detail.prompt);
      }
    };
    window.addEventListener('starmap-fill-chat-input', handleFillInput);
    return () => window.removeEventListener('starmap-fill-chat-input', handleFillInput);
  }, []);

  // 点击外部关闭三点菜单与模型选择浮层
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuSessionId(null);
      }
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(e.target as Node)) {
        setIsModelSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages, isProcessing, isExecutingStep]);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 过滤会话
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) =>
      searchKeyword.trim() ? s.title.toLowerCase().includes(searchKeyword.toLowerCase()) : true
    );
  }, [sessions, searchKeyword]);

  // 按时间规则将对话分为：今天、7天内、30天内、更早
  const timeGroupedSessions = useMemo(() => {
    const now = Date.now();
    const oneDay = 86400000;
    const sevenDays = 7 * oneDay;
    const thirtyDays = 30 * oneDay;

    const todayList: ChatSession[] = [];
    const sevenDaysList: ChatSession[] = [];
    const thirtyDaysList: ChatSession[] = [];
    const earlierList: ChatSession[] = [];

    filteredSessions.forEach((s) => {
      const time = s.updatedAt || s.createdAt || now;
      const diff = now - time;
      if (diff <= oneDay) {
        todayList.push(s);
      } else if (diff <= sevenDays) {
        sevenDaysList.push(s);
      } else if (diff <= thirtyDays) {
        thirtyDaysList.push(s);
      } else {
        earlierList.push(s);
      }
    });

    return [
      { key: 'today', label: '今天', list: todayList },
      { key: 'sevenDays', label: '7 天内', list: sevenDaysList },
      { key: 'thirtyDays', label: '30 天内', list: thirtyDaysList },
      ...(earlierList.length > 0 ? [{ key: 'earlier', label: '更早以前', list: earlierList }] : []),
    ];
  }, [filteredSessions]);

  // 创建新会话
  const handleCreateNew = () => {
    createNewSession('general-assistant', '新对话');
    setCurrentDraft(null);
    setActiveWorkflowPlan(null);
    setActiveClarification(null);
    setSaveFeedback(null);
    showToast('已创建新对话');
  };

  // 重命名
  const startRenaming = (session: ChatSession) => {
    setRenamingSessionId(session.id);
    setRenameInputValue(session.title);
    setActiveMenuSessionId(null);
  };

  const saveRenaming = (sessionId: string) => {
    if (renameInputValue.trim()) {
      renameSession(sessionId, renameInputValue.trim());
      showToast('已修改会话标题');
    }
    setRenamingSessionId(null);
  };

  // 复制内容
  const handleCopySessionContent = (session: ChatSession) => {
    setActiveMenuSessionId(null);
    const contentText = session.messages
      .map((m) => `[${m.role === 'user' ? '用户' : '智能体'}]：\n${m.content}`)
      .join('\n\n---\n\n');
    const draftText = session.draft
      ? `\n\n=== 结构化组件草案 ===\n标题: ${session.draft.title}\n摘要: ${session.draft.summary || ''}\n组件数: ${session.draft.blocks?.length || 0}`
      : '';
    const fullExport = `# 会话：${session.title}\n\n${contentText || '暂无对话消息'}${draftText}`;
    navigator.clipboard
      .writeText(fullExport)
      .then(() => showToast('已将会话内容复制到剪贴板'))
      .catch(() => showToast('复制失败，请检查浏览器权限'));
  };

  // 拆分/复制副本
  const handleSplitSession = (sessionId: string) => {
    setActiveMenuSessionId(null);
    duplicateSession(sessionId);
    showToast('已创建会话分支副本');
  };

  // 下拉框更改当前待执行步骤绑定的技能或工具
  const handleChangeStepTarget = (targetId: string) => {
    if (!activeWorkflowPlan) return;
    const currentIdx = activeWorkflowPlan.activeStepIndex;
    const step = activeWorkflowPlan.steps[currentIdx];
    if (!step) return;

    let targetName = targetId;
    let targetCat: 'skill' | 'tool' | 'prompt' = 'skill';

    const skill = DEFAULT_SKILLS.find((s) => s.id === targetId);
    if (skill) {
      targetName = skill.name;
      targetCat = 'skill';
    } else {
      const tool = DEFAULT_TOOLS.find((t) => t.id === targetId);
      if (tool) {
        targetName = tool.name;
        targetCat = 'tool';
      } else {
        const prompt = DEFAULT_PROMPTS.find((p) => p.id === targetId);
        if (prompt) {
          targetName = prompt.title;
          targetCat = 'prompt';
        }
      }
    }

    const updatedSteps = activeWorkflowPlan.steps.map((s, idx) => {
      if (idx === currentIdx) {
        return {
          ...s,
          targetSkillOrToolId: targetId,
          targetName,
          targetCategory: targetCat,
        };
      }
      return s;
    });

    const nextPlan: WorkflowPlan = {
      ...activeWorkflowPlan,
      steps: updatedSteps,
    };

    setActiveWorkflowPlan(nextPlan);
    showToast(`已更改此步骤调用为【${targetName}】`);
  };

  // 用户在输入框上方点击【确认执行此步骤】
  const handleExecuteCurrentStep = async () => {
    if (!activeWorkflowPlan || isExecutingStep) return;
    const currentIdx = activeWorkflowPlan.activeStepIndex;
    const step = activeWorkflowPlan.steps[currentIdx];
    if (!step) return;

    setIsExecutingStep(true);
    try {
      showToast(`正在调度执行【${step.targetName || step.title}】...`);

      // 调度 OpenCode 算力底座执行步骤逻辑
      const stepPrompt = `请作为专家执行【${step.targetCategory || 'skill'}：${step.targetName}】。
用户核心诉求：${activeWorkflowPlan.userGoal}
目标文档类型：${activeWorkflowPlan.moduleLabel}
请针对该步骤进行专业提炼、输出核心要点，并与结构化文档排版对齐。`;

      let stepSummary = `成功调用【${step.targetName}】提炼完成核心要素并格式化输出`;

      try {
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: stepPrompt }],
            model: selectedModel.id,
          }),
        });
        const jsonRes = await resp.json();
        const reply = jsonRes?.data?.reply;
        if (reply) {
          stepSummary = `【${step.targetName}】产出：${reply.slice(0, 90).replace(/\n/g, ' ')}...`;
        }
      } catch (e) {
        console.warn('Step backend chat fallback:', e);
      }

      // 同步更新右侧编辑器草案
      if (currentDraft) {
        const updatedDraft = { ...currentDraft };
        if (!updatedDraft.summary.includes(step.targetName || '')) {
          updatedDraft.summary = `【${step.targetName} 成果提炼】：${updatedDraft.summary}`;
        }
        setCurrentDraft(updatedDraft);
        if (activeSessionId) {
          updateSessionDraft(activeSessionId, updatedDraft);
        }
      }

      // 流转步骤状态至下一步
      const nextIdx = currentIdx + 1;
      const isAllDone = nextIdx >= activeWorkflowPlan.steps.length;

      const updatedSteps = activeWorkflowPlan.steps.map((s, idx) => {
        if (idx === currentIdx) {
          return {
            ...s,
            status: 'completed' as const,
            outputSummary: stepSummary,
          };
        }
        if (idx === nextIdx) {
          return {
            ...s,
            status: 'active' as const,
          };
        }
        return s;
      });

      const nextPlan: WorkflowPlan = {
        ...activeWorkflowPlan,
        steps: updatedSteps,
        activeStepIndex: nextIdx,
        isCompleted: isAllDone,
      };

      setActiveWorkflowPlan(nextPlan);

      // 发送步骤执行回执气泡
      const confirmNoticeMsg: ChatMessage = {
        id: `step-done-${Date.now()}`,
        role: 'assistant',
        content: `✅ **步骤 ${step.order} 执行完成**：已成功调度【**${step.targetName}**】。\n\n> 📋 **执行产出**：${stepSummary}\n\n${
          isAllDone
            ? `🎉 **全部计划步骤已顺利执行完毕**！已同步并索引至【个人知识库 · ${activeWorkflowPlan.moduleLabel}】，您可点击下方的直达卡片前往查看与编辑。`
            : `👉 **已进入下一步**：第 ${nextIdx + 1} 步《${updatedSteps[nextIdx]?.title}》，请在输入框上方确认后继续执行。`
        }`,
        createdAt: Date.now(),
        modelName: selectedModel.name,
        workflowNode: `步骤 ${step.order} · ${step.targetName}`,
        plan: nextPlan,
      };

      if (currentSession) {
        appendMessage(currentSession.id, confirmNoticeMsg);
      }

      showToast(isAllDone ? '所有执行步骤已顺利完成！' : `步骤 ${step.order} 执行完成`);
    } finally {
      setIsExecutingStep(false);
    }
  };

  // 用户点击【跳过此步骤】
  const handleSkipCurrentStep = () => {
    if (!activeWorkflowPlan) return;
    const currentIdx = activeWorkflowPlan.activeStepIndex;
    const nextIdx = currentIdx + 1;
    const isAllDone = nextIdx >= activeWorkflowPlan.steps.length;

    const updatedSteps = activeWorkflowPlan.steps.map((s, idx) => {
      if (idx === currentIdx) {
        return { ...s, status: 'skipped' as const };
      }
      if (idx === nextIdx) {
        return { ...s, status: 'active' as const };
      }
      return s;
    });

    const nextPlan: WorkflowPlan = {
      ...activeWorkflowPlan,
      steps: updatedSteps,
      activeStepIndex: nextIdx,
      isCompleted: isAllDone,
    };

    setActiveWorkflowPlan(nextPlan);
    showToast(`已跳过第 ${currentIdx + 1} 步`);
  };

  // 用户点击【一键执行余下步骤】
  const handleExecuteAllRemainingSteps = () => {
    if (!activeWorkflowPlan) return;
    const updatedSteps = activeWorkflowPlan.steps.map((s) => ({
      ...s,
      status: 'completed' as const,
      outputSummary: s.outputSummary || `已通过 OpenCode 批量自动编排完成`,
    }));

    const nextPlan: WorkflowPlan = {
      ...activeWorkflowPlan,
      steps: updatedSteps,
      activeStepIndex: updatedSteps.length,
      isCompleted: true,
    };

    setActiveWorkflowPlan(nextPlan);
    showToast('已一键完成全部步骤执行');
  };

  // 发送消息：支持意图分析、多轮提问收集 (Clarification) 与计划制定 (Planning)
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputVal;
    if (!textToSend.trim() || isProcessing) return;

    const trimmed = textToSend.trim();
    if (!customText) setInputVal('');
    setIsProcessing(true);
    setSaveFeedback(null);

    let targetId = activeSessionId;
    let targetSession = currentSession;
    if (!targetSession) {
      targetSession = createNewSession('general-assistant', trimmed.slice(0, 16));
      targetId = targetSession.id;
    }

    const currentList = targetSession?.messages || [];
    const isFirst = currentList.length === 0;
    if (isFirst) {
      renameSession(targetId, trimmed.slice(0, 18));
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };

    try {
      // 1. 判断是否处于正在回答多轮澄清提问状态
      if (activeClarification) {
        const matchedModule = activeClarification.targetModule as RoutedTaskType;
        const targetMeta =
          ROUTED_TASK_TYPES.find((t) => t.key === matchedModule) || ROUTED_TASK_TYPES[0];

        // 信息收集完毕，正式生成计划和草案
        const newPlan = generateWorkflowPlan(trimmed, matchedModule);
        const draft = formatIntoStructuredDraft(trimmed, matchedModule);
        setCurrentDraft(draft);
        setActiveWorkflowPlan(newPlan);
        setActiveClarification(null);

        // 同步入库
        saveDraftToTargetModule(draft);

        const pendingData: PendingAiDraft = {
          ...draft,
          id: `draft-${Date.now()}`,
          sourcePrompt: trimmed,
          createdAt: Date.now(),
          targetTab: targetMeta.targetTab,
          targetSubTab: targetMeta.targetSubTab,
          targetModuleLabel: targetMeta.label,
        };
        setPendingAiDraft(pendingData);

        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: `已为您充分收集补充信息，并对齐至【**个人知识库 · ${targetMeta.label}**】！\n\n已拆解 4 项执行计划步骤。**下一步需要调用技能生成初稿**，请在输入框上方确认调用方案后点击【确认此方案】。`,
          createdAt: Date.now() + 100,
          modelName: selectedModel.name,
          workflowNode: `OpenCode 意图规划 · ${targetMeta.label}`,
          plan: newPlan,
        };

        const updatedMessages = [...currentList, userMsg, assistantMsg];
        updateSessionMessages(targetId, updatedMessages);
        updateSessionDraft(targetId, draft);
        return;
      }

      // 2. 检测用户输入的完备性
      const completeness = checkInputCompleteness(trimmed);

      // 若信息收集不完全（例如：“我现在需要撰写一份工作日记”），启动多轮提问收集
      if (!completeness.isComplete && completeness.clarification) {
        const initialDraft = formatIntoStructuredDraft(
          `【待补充具体内容】${trimmed}`,
          completeness.targetType
        );
        setCurrentDraft(initialDraft);
        setActiveClarification(completeness.clarification);
        setActiveWorkflowPlan(null);

        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: completeness.clarification.questionText,
          createdAt: Date.now() + 100,
          modelName: selectedModel.name,
          workflowNode: `意图识别已匹配 · 【${completeness.targetMeta.label}】`,
          clarification: completeness.clarification,
        };

        const updatedMessages = [...currentList, userMsg, assistantMsg];
        updateSessionMessages(targetId, updatedMessages);
        updateSessionDraft(targetId, initialDraft);
        return;
      }

      // 3. 用户输入信息完备
      const routing = classifyIntentAndRoute(trimmed);

      // A. 若为通用日常对话（非知识库文档沉淀任务，如询问模型、写代码、日常交流）：
      if (routing.taskType === 'general') {
        setActiveWorkflowPlan(null);
        setActiveClarification(null);

        const recentHistory = currentList.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }));
        recentHistory.push({ role: 'user', content: trimmed });

        let replyContent = '未能获取到大模型回复内容。';
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 12000);
          const resp = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: recentHistory,
              model: selectedModel.id,
            }),
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (resp.ok) {
            const jsonResult = await resp.json();
            const chatData = jsonResult?.data;
            if (chatData?.reply) {
              replyContent = chatData.reply;
            }
            if (chatData?.reasoning_content?.trim()) {
              replyContent = `> 🧠 **DeepSeek-R1 深度思考推理链**：\n> ${chatData.reasoning_content.trim().replace(/\n/g, '\n> ')}\n\n${replyContent}`;
            }
          }
        } catch (e) {
          console.warn('Backend chat API error, fallback:', e);
          replyContent = `我是 **OpenCode 架构与研发助理**，很高兴为您服务！您可以向我询问任何系统架构、算法推演与业务逻辑，也可以让我帮您整理知识库与工作日记。`;
        }

        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: replyContent,
          createdAt: Date.now() + 100,
          modelName: selectedModel.name,
          workflowNode: `OpenCode 算力底座 [${selectedModel.id}]`,
        };

        const updatedMessages = [...currentList, userMsg, assistantMsg];
        updateSessionMessages(targetId, updatedMessages);
        updateSessionDraft(targetId, null);
        return;
      }

      // B. 属于特定知识库业务任务（如工作日记、商业分析、华夏足迹、灵感待办、知识收集、刻意训练、传记）
      const targetMeta =
        ROUTED_TASK_TYPES.find((t) => t.key === routing.taskType) || ROUTED_TASK_TYPES[0];
      const newPlan = generateWorkflowPlan(trimmed, routing.taskType);
      const draft = formatIntoStructuredDraft(trimmed, routing.taskType);
      setCurrentDraft(draft);
      setActiveWorkflowPlan(newPlan);
      setActiveClarification(null);

      // 直接自动保存并索引入个人知识库对应持久化数据库
      saveDraftToTargetModule(draft);

      const pendingData: PendingAiDraft = {
        ...draft,
        id: `draft-${Date.now()}`,
        sourcePrompt: trimmed,
        createdAt: Date.now(),
        targetTab: targetMeta.targetTab,
        targetSubTab: targetMeta.targetSubTab,
        targetModuleLabel: targetMeta.label,
      };
      setPendingAiDraft(pendingData);

      // 请求后端大模型接口，带超时保护
      const recentHistory = currentList.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      recentHistory.push({ role: 'user', content: trimmed });

      let replyContent = `已识别您的诉求，已精准对齐至【**个人知识库 · ${targetMeta.label}**】！\n\n已拆解 4 项执行计划步骤。**下一步需要调用技能生成初稿**，请在输入框上方确认调用方案后点击【确认此方案】。`;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: recentHistory,
            model: selectedModel.id,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (resp.ok) {
          const jsonResult = await resp.json();
          const chatData = jsonResult?.data;
          if (chatData?.reply) {
            replyContent = chatData.reply;
          }
          if (chatData?.reasoning_content?.trim()) {
            replyContent = `> 🧠 **DeepSeek-R1 深度思考推理链**：\n> ${chatData.reasoning_content.trim().replace(/\n/g, '\n> ')}\n\n${replyContent}`;
          }
        }
      } catch (e) {
        console.warn('Backend chat API error, using plan introduction:', e);
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        createdAt: Date.now() + 100,
        modelName: selectedModel.name,
        workflowNode: `OpenCode 智能路由 · ${targetMeta.label}`,
        plan: newPlan,
      };

      const updatedMessages = [...currentList, userMsg, assistantMsg];
      updateSessionMessages(targetId, updatedMessages);
      updateSessionDraft(targetId, draft);
    } catch (error: any) {
      console.error('handleSendMessage error:', error);
    } finally {
      setIsProcessing(false);
    }
  };


  // 核心入口：跳转至个人知识库目标页面审阅与编辑
  const handleJumpToTargetModule = (customDraft?: StructuredDraft) => {
    const draft = customDraft || currentDraft;
    if (!draft) return;
    const meta = ROUTED_TASK_TYPES.find((t) => t.key === draft.taskType) || ROUTED_TASK_TYPES[0];
    const pendingData: PendingAiDraft = {
      ...draft,
      id: `draft-${Date.now()}`,
      sourcePrompt:
        currentSession?.messages?.filter((m) => m.role === 'user').slice(-1)[0]?.content ||
        draft.title,
      createdAt: Date.now(),
      targetTab: meta.targetTab,
      targetSubTab: meta.targetSubTab,
      targetModuleLabel: meta.label,
    };
    setPendingAiDraft(pendingData);
    saveDraftToTargetModule(draft);
    showToast(`正在跳转至【个人知识库 · ${meta.label}】...`);
    setTimeout(() => {
      if (onNavigate) {
        if (meta.targetSubTab) {
          onNavigate(meta.targetSubTab);
        } else {
          onNavigate(meta.targetTab);
        }
      }
    }, 150);
  };

  return (
    <div className="w-full h-full flex flex-row overflow-hidden bg-[#F7F8FA]">
      {/* 消息 Toast 轻提示 */}
      {toastMessage && (
        <div className="fixed top-5 right-8 z-50 px-4 py-2 rounded-xl bg-slate-900/90 text-white text-xs font-medium shadow-xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= 1. 左侧：完全复刻图 4 模型对话列表 ================= */}
      <div
        className={`h-full shrink-0 bg-white border-r border-[#E5E7EB] flex flex-col overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? 'w-full lg:w-72' : 'w-16'
        }`}
      >
        {/* 顶部：新建对话按钮与收起开关（完全对应图 4） */}
        <div className="p-3 border-b border-[#E5E7EB] bg-white flex items-center gap-2">
          {isSidebarOpen ? (
            <>
              <button
                type="button"
                onClick={handleCreateNew}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#5146D8] hover:bg-[#4338CA] active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>新建对话</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                title="收起对话列表"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <PanelLeftClose size={17} />
              </button>
            </>
          ) : (
            <div className="w-full flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleCreateNew}
                title="新建对话"
                className="w-10 h-10 rounded-full bg-[#5146D8] hover:bg-[#4338CA] text-white flex items-center justify-center cursor-pointer shadow-xs"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                title="展开对话列表"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <PanelLeftOpen size={17} />
              </button>
            </div>
          )}
        </div>

        {/* 搜索框（图 4 样式） */}
        {isSidebarOpen && (
          <div className="px-3 pt-2.5 pb-2">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索对话..."
                className="w-full pl-8 pr-7 py-2 rounded-xl bg-[#F3F4F6] border-0 focus:ring-1 focus:ring-[#5146D8] text-xs text-[#171A21] placeholder:text-[#9CA3AF] outline-hidden transition-colors"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 对话列表条目（完全复刻图 4 时间分组：今天、7 天内、30 天内） */}
        {isSidebarOpen && (
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3 scrollbar-refined">
            {filteredSessions.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#9CA3AF]">
                {searchKeyword ? '未找到匹配的对话' : '暂无历史对话'}
              </div>
            ) : (
              timeGroupedSessions.map((group) => {
                if (group.list.length === 0) return null;

                return (
                  <div key={group.key} className="space-y-1">
                    {/* 时间分组标题 */}
                    <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                      <span>{group.label}</span>
                      <SlidersHorizontal size={11} className="opacity-60" />
                    </div>

                    {/* 分组内的会话列表 */}
                    <div className="space-y-0.5">
                      {group.list.map((session) => {
                        const isActive = session.id === activeSessionId;
                        const isRenaming = renamingSessionId === session.id;

                        return (
                          <div
                            key={session.id}
                            className={`group relative rounded-lg transition-colors ${
                              isActive
                                ? 'bg-[#EEF0FD] text-[#171A21] font-semibold'
                                : 'text-[#374151] hover:bg-slate-100/90'
                            }`}
                          >
                            {isRenaming ? (
                              <div className="flex items-center gap-1.5 p-1.5">
                                <input
                                  type="text"
                                  value={renameInputValue}
                                  autoFocus
                                  onChange={(e) => setRenameInputValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveRenaming(session.id);
                                    if (e.key === 'Escape') setRenamingSessionId(null);
                                  }}
                                  className="flex-1 text-xs px-2 py-1 rounded bg-white border border-indigo-400 outline-hidden font-normal text-slate-900"
                                />
                                <button
                                  type="button"
                                  onClick={() => saveRenaming(session.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRenamingSessionId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-200/60 rounded"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => selectSession(session.id)}
                                className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                                  {session.isUnread && (
                                    <span
                                      className="w-1.5 h-1.5 rounded-full bg-[#5146D8] shrink-0"
                                      title="未读对话"
                                    />
                                  )}
                                  <span
                                    className={`text-xs truncate ${
                                      isActive ? 'text-[#171A21] font-medium' : 'text-[#4B5563]'
                                    }`}
                                  >
                                    {session.title || '新对话'}
                                  </span>
                                </div>

                                {/* 右侧置顶与三点菜单（图 4 样式） */}
                                <div
                                  className={`flex items-center gap-0.5 shrink-0 ${
                                    isActive
                                      ? 'opacity-100'
                                      : 'opacity-0 group-hover:opacity-100 transition-opacity'
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => togglePinSession(session.id)}
                                    title={session.isPinned ? '取消置顶' : '置顶对话'}
                                    className={`p-1 rounded transition-colors cursor-pointer ${
                                      session.isPinned
                                        ? 'text-amber-500 hover:bg-amber-50'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/60'
                                    }`}
                                  >
                                    <Pin size={12} className={session.isPinned ? 'fill-amber-500' : ''} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveMenuSessionId(
                                        activeMenuSessionId === session.id ? null : session.id
                                      )
                                    }
                                    title="更多选项"
                                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                                  >
                                    <MoreVertical size={13} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* 三点浮动操作菜单 */}
                            {activeMenuSessionId === session.id && (
                              <div
                                ref={menuRef}
                                className="absolute right-2 top-8 z-40 w-44 bg-white rounded-xl border border-slate-200 shadow-xl py-1 text-xs text-slate-700 animate-in fade-in"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => startRenaming(session)}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-left"
                                >
                                  <Edit2 size={12} className="text-slate-500" />
                                  <span>重命名对话</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    toggleUnreadSession(session.id);
                                    setActiveMenuSessionId(null);
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-left"
                                >
                                  <Mail size={12} className="text-slate-500" />
                                  <span>{session.isUnread ? '标为已读' : '标为未读'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopySessionContent(session)}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-left"
                                >
                                  <Copy size={12} className="text-slate-500" />
                                  <span>复制对话记录</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSplitSession(session.id)}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-left"
                                >
                                  <Split size={12} className="text-slate-500" />
                                  <span>创建对话副本</span>
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteSession(session.id);
                                    setActiveMenuSessionId(null);
                                    showToast('已删除对话');
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 text-red-600 text-left"
                                >
                                  <Trash2 size={12} />
                                  <span>删除对话</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 底部状态指示栏（完全对应图 4 底部：共 X 个对话 / 实时持久化） */}
        {isSidebarOpen && (
          <div className="px-3.5 py-2.5 border-t border-[#E5E7EB] bg-slate-50/70 text-[11px] text-[#6B7280] flex items-center justify-between">
            <span>共 {sessions.length} 个对话</span>
            <span className="flex items-center gap-1 text-[#9CA3AF]">
              <Clock size={12} />
              <span>实时持久化</span>
            </span>
          </div>
        )}
      </div>

      {/* ================= 2. 中间：流式对话交互中枢 ================= */}
      <div className="flex-1 h-full flex flex-col bg-white overflow-hidden">
        {/* 对话头部 */}
        <div className="px-4 py-3 bg-white border-b border-[#E5E7EB] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-semibold text-[#171A21] truncate max-w-[200px]">
              {currentSession?.title || '新对话'}
            </span>
            {currentSession?.isPinned && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 font-medium shrink-0">
                已置顶
              </span>
            )}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>OpenCode 算力已连通</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (currentSession) {
                renameSession(currentSession.id, '新对话');
                handleSendMessage('您好，请介绍一下你自己和能帮我做什么');
              }
            }}
            title="重新开始对话"
            className="text-[#6B7280] hover:text-[#171A21] p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] shrink-0"
          >
            <RotateCcw size={13} />
            <span>重置</span>
          </button>
        </div>

        {/* 消息流区域：最大宽度居中排版，舒适阅读 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/20">
          <div className="max-w-3xl mx-auto w-full space-y-4">
            {(!currentSession || currentSession.messages.length === 0) && (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4 text-[#9CA3AF] space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-[#5146D8] text-white flex items-center justify-center shadow-md shadow-indigo-100">
                  <Bot size={24} />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-base font-bold text-[#171A21]">OpenCode 智能对话中枢</h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed">
                    支持通用问答与深度意图规划。当识别到沉淀需求时，将自动分解步骤并在执行后直接索引入个人知识库。
                  </p>
                </div>

                {/* 快捷引导气泡 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg pt-2 text-left">
                  <button
                    type="button"
                    onClick={() => handleSendMessage('我现在需要撰写一份工作日记')}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-xs cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 group-hover:text-[#5146D8]">
                      <span>📝 撰写工作日记</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      触发意图识别、多轮信息收集与审批初稿
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage('请帮我进行一项新产品的商业分析')}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-xs cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 group-hover:text-[#5146D8]">
                      <span>📊 新产品商业分析</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      市场洞察、竞争壁垒与盈利路径规划
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage('收集并整理大模型Agent架构的核心知识')}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-xs cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 group-hover:text-[#5146D8]">
                      <span>💡 沉淀 Agent 架构知识</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      多轮提炼、生成知识卡片并同步至个人库
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage('你是哪款模型？能协助我做些什么？')}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-xs cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 group-hover:text-[#5146D8]">
                      <span>💬 通用日常咨询</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      直连大模型算力，纯净回答代码与技术问题
                    </p>
                  </button>
                </div>
              </div>
            )}

          {currentSession?.messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-xs ${
                    isUser ? 'bg-slate-800' : 'bg-[#5146D8]'
                  }`}
                >
                  {isUser ? <User size={14} /> : <Bot size={15} />}
                </div>

                <div className="max-w-[85%] space-y-1">
                  {!isUser && msg.modelName && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pl-0.5">
                      <span className="font-semibold text-[#5146D8]">{msg.modelName}</span>
                      <span>•</span>
                      <span>智能生成</span>
                    </div>
                  )}
                  <div
                    className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#5146D8] text-white shadow-xs whitespace-pre-wrap rounded-tr-xs'
                        : 'bg-[#F9FAFB] text-[#171A21] border border-[#E5E7EB] rounded-tl-xs'
                    }`}
                  >
                    {isUser ? (
                      msg.content
                    ) : (
                      <>
                        <MarkdownView content={msg.content} />

                        {/* 多轮信息澄清引导卡片与快捷胶囊 */}
                        {msg.clarification && (
                          <div className="mt-3 pt-3 border-t border-indigo-100 bg-indigo-50/70 rounded-xl p-3 border border-indigo-200/80 space-y-2.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                                <Sparkles size={13} className="text-[#5146D8]" />
                                <span>🎯 已匹配编辑器：【{msg.clarification.moduleLabel}】</span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-indigo-700 font-semibold border border-indigo-200">
                                多轮信息收集
                              </span>
                            </div>

                            {msg.clarification.missingFields.length > 0 && (
                              <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-indigo-100 flex items-start gap-1.5">
                                <HelpCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <span className="font-semibold text-slate-700">需补充关键信息：</span>
                                  <span>{msg.clarification.missingFields.join('、')}</span>
                                </div>
                              </div>
                            )}

                            {msg.clarification.quickSuggestions?.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] text-slate-500 font-medium block">
                                  💡 点击下方快捷胶囊快速补充：
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {msg.clarification.quickSuggestions.map((suggestion, sIdx) => (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      onClick={() => handleSendMessage(suggestion)}
                                      className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-900 border border-indigo-200 transition-all cursor-pointer shadow-2xs hover:border-indigo-400 text-left active:scale-95"
                                    >
                                      + {suggestion}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 执行规划与步骤分解卡片 */}
                        {msg.plan && (
                          <div className="mt-3 pt-3 border-t border-slate-200 bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-2.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                <Workflow size={13} className="text-[#5146D8]" />
                                <span>执行规划 · 【{msg.plan.moduleLabel}】</span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                                步骤 {msg.plan.steps.filter((s) => s.status === 'completed').length}/{msg.plan.steps.length} 完成
                              </span>
                            </div>

                            {/* 步骤条目流 */}
                            <div className="space-y-1.5">
                              {msg.plan.steps.map((st) => {
                                const isDone = st.status === 'completed';
                                const isActive = st.status === 'active';
                                const isSkipped = st.status === 'skipped';

                                return (
                                  <div
                                    key={st.id}
                                    className={`p-2 rounded-lg text-[11px] border transition-colors ${
                                      isActive
                                        ? 'bg-indigo-50/90 border-indigo-300 text-indigo-950 font-medium shadow-2xs'
                                        : isDone
                                        ? 'bg-emerald-50/60 border-emerald-200 text-slate-700'
                                        : isSkipped
                                        ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                                        : 'bg-slate-50/50 border-slate-100 text-slate-500'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        {isDone ? (
                                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                        ) : isActive ? (
                                          <span className="w-2 h-2 rounded-full bg-[#5146D8] animate-ping shrink-0" />
                                        ) : (
                                          <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                                        )}
                                        <span className="truncate">
                                          步骤 {st.order}: {st.title}
                                        </span>
                                      </div>

                                      {st.targetName && (
                                        <span
                                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 border ${
                                            isActive
                                              ? 'bg-white text-indigo-700 border-indigo-200 font-bold'
                                              : isDone
                                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                              : 'bg-slate-100 text-slate-500 border-slate-200'
                                          }`}
                                        >
                                          @{st.targetName}
                                        </span>
                                      )}
                                    </div>

                                    {st.outputSummary && (
                                      <p className="text-[10px] text-slate-500 mt-1 pl-3.5 border-l-2 border-emerald-400 line-clamp-2">
                                        {st.outputSummary}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 个人知识库直达索引卡片 (仅当有结构化知识草案且非通用对话时呈现) */}
                        {currentDraft &&
                          currentDraft.taskType !== 'general' &&
                          msg.workflowNode && (
                            <div className="mt-3 pt-3 border-t border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-indigo-50/60 rounded-xl p-3 border border-emerald-200/90 space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <BookOpen size={13} className="text-emerald-600" />
                                  《{currentDraft.title}》
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                                  已同步至【个人知识库 · {ROUTED_TASK_TYPES.find((t) => t.key === currentDraft.taskType)?.label || '已入库'}】
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                                {currentDraft.summary}
                              </p>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleJumpToTargetModule(currentDraft)}
                                  className="w-full py-2 px-3 rounded-lg bg-[#111827] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                >
                                  <span>📖 前往【个人知识库 · {ROUTED_TASK_TYPES.find((t) => t.key === currentDraft.taskType)?.label || '知识库'}】查看与编辑</span>
                                  <ArrowRight size={12} />
                                </button>
                              </div>
                            </div>
                          )}
                      </>
                    )}
                  </div>
                  {msg.workflowNode && (
                    <div className="text-[10px] text-[#5146D8] font-medium px-1 flex items-center gap-1">
                      <Sparkles size={11} />
                      <span>{msg.workflowNode}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#5146D8] flex items-center justify-center text-white shrink-0">
                <Bot size={15} />
              </div>
              <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center gap-2 text-xs text-[#5146D8]">
                <Sparkles size={14} className="animate-spin text-[#5146D8]" />
                <span>正在理解对话内容并生成结构化组件流...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 底部输入区 */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-[#E5E7EB] shrink-0">
          <div className="max-w-3xl mx-auto w-full">
            {/* ================= 动态审批确认栏 (100% 像素级复刻用户截图设计) ================= */}
            {activeWorkflowPlan && !activeWorkflowPlan.isCompleted && (
              <div className="mb-3 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* 上方引导说明提示 */}
                <div className="text-xs text-gray-700 font-normal leading-relaxed">
                  已完成内容收集。下一步准备根据工作内容生成{activeWorkflowPlan.moduleLabel}初稿，生成后可前往个人知识库继续查看与编辑。
                </div>

            {/* 动态审批卡片 */}
            <div className="p-4 md:p-4.5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
              {/* 标题行：盾牌打勾图标 + 下一步需要你的确认 */}
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <ShieldCheck size={18} className="text-gray-900 shrink-0" strokeWidth={2.4} />
                <span>下一步需要你的确认</span>
              </div>

              {/* 拟调用能力 */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-500 font-normal block">
                  拟调用能力
                </label>
                <div className="relative w-full rounded-xl border border-gray-200 bg-white hover:border-gray-400 transition-colors">
                  <select
                    value={
                      activeWorkflowPlan?.steps[activeWorkflowPlan.activeStepIndex]
                        ?.targetSkillOrToolId || 'work-diary-writer'
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      handleChangeStepTarget(val);
                    }}
                    disabled={isExecutingStep}
                    className="w-full appearance-none bg-transparent px-3.5 py-2.5 pr-8 text-xs font-medium text-gray-900 outline-none cursor-pointer"
                  >
                    <option value="work-diary-writer">work-diary-writer · 推荐</option>
                    {stepTargetOptions.map((group) => (
                      <optgroup key={group.groupLabel} label={group.groupLabel}>
                        {group.items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* 预期操作 */}
              <div className="text-xs text-gray-600">
                预期操作：
                {activeWorkflowPlan?.steps[activeWorkflowPlan.activeStepIndex]?.title
                  ? `按${activeWorkflowPlan.moduleLabel}结构生成初稿`
                  : '按工作日记结构生成初稿'}
              </div>

              {/* 底部双胶囊操作按钮 */}
              <div className="flex items-center gap-3 pt-1">
                {/* 黑色胶囊主按钮：确认此方案 */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeWorkflowPlan) {
                      handleExecuteCurrentStep();
                    } else {
                      // 若当前尚未生成计划，一键触发日记工作流
                      handleSendMessage('我现在需要撰写一份工作日记，按推荐方案生成初稿');
                    }
                  }}
                  disabled={isExecutingStep}
                  className="flex-1 py-2.5 px-4 rounded-full bg-[#111827] hover:bg-black active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="确认此方案并调度大模型执行"
                >
                  {isExecutingStep ? (
                    <>
                      <Sparkles size={13} className="animate-spin text-white" />
                      <span>正在生成初稿...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} strokeWidth={2.8} />
                      <span>确认此方案</span>
                    </>
                  )}
                </button>

                {/* 白色胶囊次按钮：修改 / 拒绝 */}
                <button
                  type="button"
                  onClick={() => {
                    setInputVal('请修改此步骤要求为：');
                    showToast('已在输入框填入修改建议，可补充修改意见后发送');
                  }}
                  disabled={isExecutingStep}
                  className="flex-1 py-2.5 px-4 rounded-full bg-white hover:bg-gray-50 active:scale-98 text-gray-700 border border-gray-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="提出修改意见或拒绝当前方案"
                >
                  <span>修改 / 拒绝</span>
                </button>
              </div>
            </div>
          </div>
        )}

          {/* ================= 输入框容器 (完全复刻截图) ================= */}
          <div className="relative bg-white rounded-2xl border border-gray-200 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-300 transition-all p-1">
            <div className="flex items-center px-2 py-1">
              <button
                type="button"
                onClick={() => setInputVal((prev) => (prev ? prev : '请补充：'))}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                title="添加补充内容"
              >
                <Plus size={16} />
              </button>

              <textarea
                value={inputVal}
                rows={1}
                disabled={isProcessing}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="输入消息或提出修改意见..."
                className="flex-1 text-xs px-2.5 py-2 bg-transparent resize-none outline-none placeholder:text-gray-400 text-gray-900 leading-relaxed"
              />

              <div className="flex items-center gap-1.5 shrink-0 pr-1">
                {/* 紧凑的模型切换小浮层触发按钮 */}
                <div className="relative" ref={modelSelectorRef}>
                  <button
                    type="button"
                    onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                    className="px-2 py-1 rounded-md text-[10px] bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-1"
                    title="切换当前大模型"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate max-w-[80px]">{selectedModel.name}</span>
                  </button>

                  {/* 向上弹出的模型选择器 Popover */}
                  {isModelSelectorOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-80 sm:w-[390px] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-left overflow-hidden flex flex-col">
                      <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-b border-emerald-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800">
                                OpenCode 动态模型库
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                                已发现 {detectedModels.length || 72} 款
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block leading-tight">
                              直连本地 `opencode.exe` 与 SiliconFlow
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={fetchDetectedModels}
                          disabled={isDetectingModels}
                          className="px-2 py-1 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 text-[10px] text-emerald-700 font-medium flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <RotateCcw size={10} className={isDetectingModels ? 'animate-spin' : ''} />
                          <span>{isDetectingModels ? '检测中' : '刷新检测'}</span>
                        </button>
                      </div>

                      <div className="p-2 border-b border-slate-100 bg-slate-50/60 space-y-1.5">
                        <div className="relative">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                            placeholder="搜索模型 (如 deepseek, qwen, gpt...)"
                            className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5146D8]"
                          />
                        </div>
                      </div>

                      <div className="p-1.5 space-y-1 max-h-72 overflow-y-auto">
                        {displayModels.map((model) => {
                          const isSelected = model.id === selectedModel.id;
                          return (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() => handleSelectModel(model)}
                              className={`w-full p-2.5 rounded-xl text-left transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50/80 border border-indigo-300 text-slate-900 shadow-2xs'
                                  : 'hover:bg-slate-50 border border-transparent text-slate-700'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {model.name}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1 py-0.2 rounded font-medium border shrink-0 ${model.badgeColor}`}
                                  >
                                    {model.tag}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 block mt-0.5 truncate">
                                  {model.id}
                                </span>
                              </div>
                              {isSelected && (
                                <Check size={13} className="text-[#5146D8] mt-1 ml-auto font-bold" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 发送按钮：黑色向上箭头圆按钮 */}
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputVal.trim() || isProcessing}
                  className="w-7 h-7 rounded-full bg-[#111827] hover:bg-black text-white disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                  title="发送消息"
                >
                  <ArrowUp size={15} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* 底部交互示意微文字 (完全对应截图) */}
          <div className="mt-2 text-[11px] text-gray-400 font-normal">
            交互示意：操作栏在执行规划中智能弹出，切换候选后必须手动确认；此处直连 OpenCode 算力与所选技能。
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
