import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ListTodo,
  Sparkles,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  ArrowRight,
  RefreshCw,
  X,
  AlertCircle,
  Flame,
  Check,
  Send,
  GitBranch,
  Flag,
  HelpCircle,
  Bot,
  User,
  ChevronDown,
  ChevronRight,
  Layers,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import type { TodoItem, TodoStatus } from '../../types/todo';
import { useEventFlows } from '../../hooks/useEventFlows';
import type { EventFlow } from '../../types/eventFlow';

const STORAGE_KEY = 'starmap-todos-v1';

// 人工确认动作结构
export interface PendingActionProposal {
  id: string;
  type: 'add_next_step' | 'close_event' | 'create_branch' | 'create_event';
  targetEventId: string;
  targetEventTitle: string;
  details: {
    nodeName?: string;
    description?: string;
    dueDate?: string;
    branchName?: string;
    closureSummary?: string;
  };
  status: 'pending' | 'confirmed' | 'cancelled';
}

// 智能体消息结构
export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: string;
  thinking?: string; // AI 内部思考推理与事件索引分析
  content: string; // 回复自然语言正文
  // 信息不全时的引导补全选项
  clarification?: {
    prompt: string;
    options: { label: string; textToInput: string }[];
  };
  // 人工确认操作卡片
  pendingAction?: PendingActionProposal;
}

interface TodoReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTodos?: () => void;
  showToast?: (msg: string) => void;
}

export const TodoReminderModal: React.FC<TodoReminderModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTodos,
  showToast,
}) => {
  // 接入系统真实的事件流程状态总线
  const {
    events,
    inProgressEvents,
    completedEvents,
    addNextStepNode,
    createBranch,
    closeEvent,
    createEvent,
  } = useEventFlows();

  // 待办事项列表
  const [todos, setTodos] = useState<TodoItem[]>([]);

  // 多轮对话聊天记录
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      timestamp: '刚刚',
      content:
        '您好！我是**事件流程推进智能体**。\n我能够接受您的自然语言输入，先分析理解您的推进意图，并在当前事件库中进行搜索索引。\n\n接下来，我会帮您规划创建下一步节点或决定是否闭环结项。**每一步操作我都会为您生成结果预览并弹出人工确认按钮**，只有经您确认后才会真正写入系统。如果信息不全，我也会引导您补全！',
      clarification: {
        prompt: '您也可以直接点击以下快捷指令开启推进：',
        options: [
          {
            label: '🚀 推进《璀璨星图前端工程重构》',
            textToInput: '帮我推进《璀璨星图前端工程重构与事件流系统建设》到下一步',
          },
          {
            label: '🔍 索引推进《3D知识图谱算法》',
            textToInput: '看一下3D知识图谱算法优化进展，帮我规划下一步',
          },
          {
            label: '🏁 结项闭环《生产级企业UI规范》',
            textToInput: '生产级企业UI设计规范已经全部完成验收，请帮我执行闭环结项',
          },
        ],
      },
    },
  ]);

  // 当前用户输入框内容与加载状态
  const [inputValue, setInputValue] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Record<string, boolean>>({});

  // 聊天滚动定位
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  // 加载系统待办事项
  const loadTodos = () => {
    try {
      const items: TodoItem[] = [];
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        items.push(...JSON.parse(stored));
      }
      setTodos(items);
    } catch (e) {
      console.error('Failed to load todos for reminder:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTodos();
    }
  }, [isOpen]);

  // 统计指标
  const stats = useMemo(() => {
    return {
      inProgressCount: inProgressEvents.length,
      completedCount: completedEvents.length,
      totalEvents: events.length,
    };
  }, [events, inProgressEvents, completedEvents]);

  // 折叠/展开思考
  const toggleThinking = (msgId: string) => {
    setExpandedThinkingIds((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // 核心：处理用户发送的多轮对话请求
  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isAiThinking) return;

    // 1. 添加用户消息
    const userMsgId = `msg-user-${Date.now()}`;
    const newMessages: AgentChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        content: query,
      },
    ];

    setMessages(newMessages);
    setInputValue('');
    setIsAiThinking(true);

    // 2. 模拟 AI 多轮意图分析、事件索引与推演
    setTimeout(() => {
      processAgentReasoning(query, newMessages);
    }, 700);
  };

  // 智能体核心分析与事件索引引擎
  const processAgentReasoning = (userInput: string, currentHistory: AgentChatMessage[]) => {
    const inputLower = userInput.toLowerCase();

    // A. 意图判别
    const isClosureIntent =
      inputLower.includes('闭环') ||
      inputLower.includes('结项') ||
      inputLower.includes('归档') ||
      inputLower.includes('完成全部') ||
      inputLower.includes('验收');

    const isBranchIntent =
      inputLower.includes('分支') ||
      inputLower.includes('并行') ||
      inputLower.includes('衍生') ||
      inputLower.includes('探索');

    const isCreateEventIntent =
      inputLower.includes('新建事件') ||
      inputLower.includes('创建新事件') ||
      inputLower.includes('发起新项目');

    // B. 事件搜索索引匹配
    // 在系统所有事件（包括进行中和已完成）中进行匹配度打分
    let matchedEvent: EventFlow | null = null;
    let matchScore = 0;

    for (const evt of events) {
      let score = 0;
      if (inputLower.includes(evt.title.toLowerCase())) score += 10;
      if (evt.tags.some((t) => inputLower.includes(t.toLowerCase()))) score += 4;
      if (inputLower.includes(evt.currentStage.toLowerCase())) score += 3;
      if (evt.nodes.some((n) => inputLower.includes(n.name.toLowerCase()))) score += 3;

      // 提取简短关键词匹配（如“璀璨星图”、“3D”、“UI规范”等）
      if (evt.title.includes('璀璨星图') && (inputLower.includes('璀璨') || inputLower.includes('星图') || inputLower.includes('前端工程'))) {
        score += 8;
      }
      if (evt.title.includes('3D') && (inputLower.includes('3d') || inputLower.includes('知识图谱') || inputLower.includes('力导向') || inputLower.includes('算法'))) {
        score += 8;
      }
      if (evt.title.includes('UI 设计') && (inputLower.includes('ui') || inputLower.includes('设计规范') || inputLower.includes('tokens'))) {
        score += 8;
      }

      if (score > matchScore) {
        matchScore = score;
        matchedEvent = evt;
      }
    }

    // C. 场景 1：如果用户输入信息不全（没有指定任何事件，且当前无法确定上下文）
    if (!matchedEvent && !isCreateEventIntent) {
      const thinkingText = `【意图分析】检测到用户请求：“${userInput}”。\n【知识索引】在系统事件库中搜索（共 ${events.length} 个事件），未能匹配到明确的目标事件。\n【完整度评估】信息不完整（缺少 target_event 标识）。\n【策略】触发多轮澄清机制，主动展示当前进行中的候选事件，引导用户选择补全。`;

      const assistantMsg: AgentChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        thinking: thinkingText,
        content: `我已理解您的操作意向，但您在输入中**未指明具体的目标事件**。\n\n请在下方点击选择您希望推进或操作的事件，或直接输入事件关键词：`,
        clarification: {
          prompt: '当前进行中库中的核心事件：',
          options: inProgressEvents.map((ev) => ({
            label: `📌 ${ev.title.length > 18 ? ev.title.slice(0, 18) + '...' : ev.title}`,
            textToInput: `针对事件《${ev.title}》，请帮我推进下一步`,
          })),
        },
      };

      setMessages([...currentHistory, assistantMsg]);
      setExpandedThinkingIds((prev) => ({ ...prev, [assistantMsg.id]: true }));
      setIsAiThinking(false);
      return;
    }

    // D. 场景 2：匹配到具体事件，处理“闭环归档”
    if (isClosureIntent && matchedEvent) {
      const isAlreadyClosed = matchedEvent.status === 'completed';
      const completedNodeCount = matchedEvent.nodes.filter((n) => n.status === 'completed').length;

      const thinkingText = `【意图分析】用户明确表达了闭环结项诉求（关键词识别：“${userInput}”）。\n【事件索引】成功定位事件《${matchedEvent.title}》（ID: ${matchedEvent.id}，当前状态: ${matchedEvent.status}）。\n【闭环评估】该事件当前共 ${matchedEvent.nodes.length} 个节点，已推进 ${completedNodeCount} 个。具备收敛闭环条件。\n【安全策略】不直接修改底层数据，生成闭环归档的人工确认卡片，展示 AI 生成的复盘总结草案，等待用户人工确认。`;

      const summaryDraft = `🎉 **《${matchedEvent.title}》全流程闭环总结**：\n- 核心里程碑：共达成 ${completedNodeCount} 个关键节点，阶段任务全部达标；\n- 分支演化：共收敛 ${matchedEvent.branches.length} 个衍生分支；\n- 闭环结论：已完成质量与技术验收，正式归档至【已完成库】并固化为系统长效资产。`;

      const proposal: PendingActionProposal = {
        id: `act-${Date.now()}`,
        type: 'close_event',
        targetEventId: matchedEvent.id,
        targetEventTitle: matchedEvent.title,
        details: {
          closureSummary: summaryDraft,
        },
        status: 'pending',
      };

      const assistantMsg: AgentChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        thinking: thinkingText,
        content: isAlreadyClosed
          ? `提示：事件《**${matchedEvent.title}**》当前已经在【已完成库】中。若需要更新闭环复盘总结，请通过下方卡片人工确认更新。`
          : `已为您索引到事件《**${matchedEvent.title}**》。\n\nAI 已分析该事件的全生命周期流转记录并为您起草了**全流程闭环复盘总结**。请检查下方的人工确认卡片，点击**【确认闭环并归档】**将正式将其移入已完成库：`,
        pendingAction: proposal,
      };

      setMessages([...currentHistory, assistantMsg]);
      setExpandedThinkingIds((prev) => ({ ...prev, [assistantMsg.id]: true }));
      setIsAiThinking(false);
      return;
    }

    // E. 场景 3：匹配到具体事件，处理“创建新分支”
    if (isBranchIntent && matchedEvent) {
      const branchName = inputLower.includes('移动端')
        ? '移动端轻量化适配分支'
        : inputLower.includes('性能')
        ? '渲染性能深度压测分支'
        : '并行探索与技术验证分支';

      const firstNodeName = `${branchName} - 调研与架构方案`;

      const thinkingText = `【意图分析】检测到开辟新分支诉求（关键词识别：“${userInput}”）。\n【事件索引】已定位事件《${matchedEvent.title}》。\n【分支规划】拟创建新分支【${branchName}】，起始挂载节点为最新主干节点。\n【安全策略】生成开辟分支的人工确认卡片，等待人工确认后写入拓扑图。`;

      const proposal: PendingActionProposal = {
        id: `act-${Date.now()}`,
        type: 'create_branch',
        targetEventId: matchedEvent.id,
        targetEventTitle: matchedEvent.title,
        details: {
          branchName: branchName,
          nodeName: firstNodeName,
          description: `基于当前主干节点开辟新分支探索，保持与主线解耦演进。`,
        },
        status: 'pending',
      };

      const assistantMsg: AgentChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        thinking: thinkingText,
        content: `已为您在事件《**${matchedEvent.title}**》中规划了新的演进分支路径。\n请在下方卡片中核对分支名称与首个启动节点，确认无误后点击执行：`,
        pendingAction: proposal,
      };

      setMessages([...currentHistory, assistantMsg]);
      setExpandedThinkingIds((prev) => ({ ...prev, [assistantMsg.id]: true }));
      setIsAiThinking(false);
      return;
    }

    // F. 场景 4：匹配到具体事件，推进“下一步节点 (Next Step)”
    if (matchedEvent) {
      const lastNode = matchedEvent.nodes[matchedEvent.nodes.length - 1];

      // 根据事件当前所处的阶段，智能推演高契合度的下一步节点
      let nextNodeName = '端到端联调测试与交付验收';
      let nextNodeDesc = '对已完成的功能模块进行集成测试，确保数据链路自洽与边界容错。';

      if (matchedEvent.title.includes('璀璨星图') || matchedEvent.title.includes('前端工程')) {
        nextNodeName = '渲染性能调优与大规模数据虚拟化';
        nextNodeDesc = '优化节点拖拽高帧率表现，确保大数据量拓扑图丝滑响应无卡顿。';
      } else if (matchedEvent.title.includes('3D') || matchedEvent.title.includes('算法')) {
        nextNodeName = '多维引力参数在 WebGL 场景下的碰撞回弹测试';
        nextNodeDesc = '调整节点斥力常数与弹簧阻尼系数，避免多星云交错时发生重叠穿透。';
      }

      // 如果用户在输入中明确提到了具体想做的事情，优先提取用户的输入
      if (userInput.includes('做') || userInput.includes('进行') || userInput.includes('实现')) {
        const customParts = userInput.split(/做|进行|实现/);
        if (customParts[1] && customParts[1].trim().length > 2) {
          nextNodeName = customParts[1].trim().slice(0, 20);
          nextNodeDesc = `用户指定推进目标：${customParts[1].trim()}`;
        }
      }

      const today = new Date();
      today.setDate(today.getDate() + 3);
      const suggestedDueDate = today.toISOString().slice(0, 10);

      const thinkingText = `【意图分析】用户期望推进流程下一步。\n【事件索引】精准索引到事件《${matchedEvent.title}》（当前阶段: ${matchedEvent.currentStage}）。\n【下一步推演】上一节点为【${lastNode?.name || '初始节点'}】。AI 推演下一步高价值交付物为【${nextNodeName}】。\n【安全机制】弹出人工确认卡片，展示拟创建节点的标题、简介和排期，等待人工审核确认。`;

      const proposal: PendingActionProposal = {
        id: `act-${Date.now()}`,
        type: 'add_next_step',
        targetEventId: matchedEvent.id,
        targetEventTitle: matchedEvent.title,
        details: {
          nodeName: nextNodeName,
          description: nextNodeDesc,
          dueDate: suggestedDueDate,
        },
        status: 'pending',
      };

      const assistantMsg: AgentChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        thinking: thinkingText,
        content: `已成功索引到事件《**${matchedEvent.title}**》（当前阶段：\`${matchedEvent.currentStage}\`）。\n\nAI 已结合前置节点上下文，为您推演生成了下一步的流程节点方案。**请在下方人工确认卡片中预览结果并决定是否执行写入系统**：`,
        pendingAction: proposal,
      };

      setMessages([...currentHistory, assistantMsg]);
      setExpandedThinkingIds((prev) => ({ ...prev, [assistantMsg.id]: true }));
      setIsAiThinking(false);
      return;
    }

    // 默认兜底
    setIsAiThinking(false);
  };

  // 用户点击“人工确认并写入系统”按钮
  const handleConfirmAction = (msgId: string, action: PendingActionProposal) => {
    try {
      if (action.type === 'add_next_step') {
        addNextStepNode(action.targetEventId, {
          name: action.details.nodeName || '下一步推进节点',
          description: action.details.description || '',
          dueDate: action.details.dueDate,
          assignee: 'AI Agent',
        });
        showToast?.(`已成功推进事件《${action.targetEventTitle}》的下一步！`);
      } else if (action.type === 'close_event') {
        closeEvent(action.targetEventId, action.details.closureSummary || '全流程闭环达成。');
        showToast?.(`事件《${action.targetEventTitle}》已圆满闭环并归档至已完成库！`);
      } else if (action.type === 'create_branch') {
        createBranch(action.targetEventId, {
          branchName: action.details.branchName || '并行探索分支',
          firstNodeName: action.details.nodeName || '分支启动节点',
          description: action.details.description || '',
        });
        showToast?.(`已成功为事件《${action.targetEventTitle}》开辟新分支！`);
      }

      // 更新该条消息的动作状态为 confirmed
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.pendingAction) {
            return {
              ...m,
              pendingAction: {
                ...m.pendingAction,
                status: 'confirmed',
              },
            };
          }
          return m;
        })
      );

      // 追加一条系统反馈成功消息
      const successFeedbackMsg: AgentChatMessage = {
        id: `msg-feedback-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        content: `✅ **执行成功！** 数据已即时持久化到底层标准 JSON 并广播更新。\n- 目标事件：**《${action.targetEventTitle}》**\n- 执行动作：\`${action.type === 'add_next_step' ? '推进下一步节点' : action.type === 'close_event' ? '全流程闭环归档' : '开辟新分支'}\`\n\n您可以在左侧面板中查看最新进度，或前往**事件流程拓扑图**查看最新的可视化节点连线与流向箭头！`,
      };

      setMessages((prev) => [...prev, successFeedbackMsg]);
    } catch (err) {
      console.error('Failed to execute confirmed action:', err);
      showToast?.('执行失败，请稍后重试');
    }
  };

  // 用户点击“取消操作”
  const handleCancelAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.pendingAction) {
          return {
            ...m,
            pendingAction: {
              ...m.pendingAction,
              status: 'cancelled',
            },
          };
        }
        return m;
      })
    );
    showToast?.('已取消该步操作，未写入系统');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 头部标题栏 */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5146D8] to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  事件跟踪多轮推进智能体
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  多轮对话 · 意图索引 · 人工确认
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                接收自然语言输入，智能分析意图并索引对应事件，推演下一步或闭环决策，每步均弹出人工确认卡片。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 顶部指标统计条 */}
        <div className="px-6 py-2.5 border-b border-[#E5E7EB] bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <span>
              总事件库: <strong className="text-slate-900 font-bold">{stats.totalEvents}</strong> 项
            </span>
            <span className="text-indigo-600">
              进行中库: <strong className="font-bold">{stats.inProgressCount}</strong> 项
            </span>
            <span className="text-emerald-600">
              已闭环归档: <strong className="font-bold">{stats.completedCount}</strong> 项
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToTodos?.();
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <span>进入事件跟踪拓扑图</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* 主体分栏内容 */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-[#F7F8FA]">
          {/* 左侧：系统事件与待办原始数据（占 4 栏） */}
          <div className="lg:col-span-4 border-r border-[#E5E7EB] bg-white flex flex-col h-full overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers size={14} className="text-[#5146D8]" />
                <span>系统事件与待办索引源</span>
              </span>
              <span className="text-[10px] text-slate-400">点击快捷填入推进</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-400 px-1">
                进行中事件 ({inProgressEvents.length})
              </div>

              {inProgressEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl border border-slate-200/90 bg-white hover:border-[#5146D8]/50 shadow-2xs transition-all text-left group"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {evt.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium shrink-0">
                      {evt.category}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed">
                    当前阶段: {evt.currentStage}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
                    <span>包含 {evt.nodes.length} 个节点</span>
                    <button
                      type="button"
                      onClick={() => handleSendMessage(`请帮我推进事件《${evt.title}》`)}
                      className="text-[#5146D8] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles size={11} />
                      <span>呼唤 AI 推进</span>
                    </button>
                  </div>
                </div>
              ))}

              {completedEvents.length > 0 && (
                <>
                  <div className="text-[11px] font-semibold text-slate-400 px-1 pt-2">
                    已闭环归档 ({completedEvents.length})
                  </div>
                  {completedEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 opacity-70 text-left"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-slate-600 truncate line-through">
                          {evt.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100/80 text-emerald-700 font-semibold shrink-0">
                          已闭环
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {evt.closureSummary || '已达成所有既定目标'}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* 右侧：多轮对话智能体交互主面板（占 8 栏） */}
          <div className="lg:col-span-8 flex flex-col h-full bg-[#F7F8FA] overflow-hidden">
            {/* 对话历史滚动视窗 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const isThinkingExpanded = expandedThinkingIds[msg.id];

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} text-xs`}
                  >
                    {/* 头像 */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isUser
                          ? 'bg-slate-800 text-white'
                          : 'bg-gradient-to-tr from-[#5146D8] to-indigo-600 text-white'
                      }`}
                    >
                      {isUser ? <User size={16} /> : <Sparkles size={16} />}
                    </div>

                    {/* 消息气泡区 */}
                    <div className={`max-w-[85%] space-y-2.5 ${isUser ? 'text-right' : 'text-left'}`}>
                      {/* AI 思考推理步骤 (可展开查看) */}
                      {!isUser && msg.thinking && (
                        <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-xl overflow-hidden text-left">
                          <button
                            type="button"
                            onClick={() => toggleThinking(msg.id)}
                            className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100/50 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Sparkles size={12} className="text-[#5146D8]" />
                              <span>AI 内部思考与事件索引推演</span>
                            </span>
                            {isThinkingExpanded ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </button>

                          {isThinkingExpanded && (
                            <div className="px-3 py-2 text-[11px] text-slate-600 bg-white/70 border-t border-indigo-100/60 font-mono whitespace-pre-line leading-relaxed">
                              {msg.thinking}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 消息正文文本 */}
                      <div
                        className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                          isUser
                            ? 'bg-[#5146D8] text-white rounded-tr-xs shadow-xs'
                            : 'bg-white border border-[#E5E7EB] text-slate-800 rounded-tl-xs shadow-2xs'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* 信息不全时的引导补全选项 */}
                      {!isUser && msg.clarification && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2 text-left">
                          <div className="text-[11px] font-medium text-slate-500">
                            {msg.clarification.prompt}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.clarification.options.map((opt, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSendMessage(opt.textToInput)}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 text-[#5146D8] text-[11px] font-medium border border-indigo-200/60 transition-all cursor-pointer hover:shadow-2xs"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 人工确认卡片 (Human Confirmation Card) */}
                      {!isUser && msg.pendingAction && (
                        <div className="bg-white p-4 rounded-xl border-2 border-indigo-300 shadow-md space-y-3 text-left animate-in fade-in duration-200">
                          {/* 卡片头部 */}
                          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                              {msg.pendingAction.type === 'close_event' ? (
                                <Flag size={14} className="text-emerald-600" />
                              ) : msg.pendingAction.type === 'create_branch' ? (
                                <GitBranch size={14} className="text-purple-600" />
                              ) : (
                                <Sparkles size={14} className="text-[#5146D8]" />
                              )}
                              <span>
                                {msg.pendingAction.type === 'close_event'
                                  ? '拟执行：全流程闭环归档'
                                  : msg.pendingAction.type === 'create_branch'
                                  ? '拟执行：开辟新分支'
                                  : '拟执行：推进下一步节点'}
                              </span>
                            </span>

                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                msg.pendingAction.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : msg.pendingAction.status === 'cancelled'
                                  ? 'bg-slate-100 text-slate-500'
                                  : 'bg-amber-100 text-amber-800 animate-pulse'
                              }`}
                            >
                              {msg.pendingAction.status === 'confirmed'
                                ? '已人工确认并生效'
                                : msg.pendingAction.status === 'cancelled'
                                ? '已取消操作'
                                : '等待人工确认'}
                            </span>
                          </div>

                          {/* 目标事件信息 */}
                          <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                            <div>
                              目标事件：<strong className="text-slate-900 font-bold">《{msg.pendingAction.targetEventTitle}》</strong>
                            </div>

                            {msg.pendingAction.details.nodeName && (
                              <div>
                                节点标题：<span className="text-[#5146D8] font-bold">{msg.pendingAction.details.nodeName}</span>
                              </div>
                            )}

                            {msg.pendingAction.details.description && (
                              <div>
                                节点简介：<span className="text-slate-600">{msg.pendingAction.details.description}</span>
                              </div>
                            )}

                            {msg.pendingAction.details.dueDate && (
                              <div>
                                发布日期：<span className="text-indigo-600 font-semibold">{msg.pendingAction.details.dueDate}</span>
                              </div>
                            )}

                            {msg.pendingAction.details.closureSummary && (
                              <div className="mt-1 pt-1 border-t border-slate-200/80">
                                复盘总结：<div className="text-slate-700 whitespace-pre-line text-[11px] mt-0.5">{msg.pendingAction.details.closureSummary}</div>
                              </div>
                            )}
                          </div>

                          {/* 人工确认按钮栏 */}
                          {msg.pendingAction.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleCancelAction(msg.id)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-medium text-[11px] transition-colors cursor-pointer"
                              >
                                暂不执行
                              </button>

                              <button
                                type="button"
                                onClick={() => handleConfirmAction(msg.id, msg.pendingAction!)}
                                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#5146D8] to-indigo-600 hover:from-[#4338CA] hover:to-indigo-700 text-white font-semibold text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                              >
                                <CheckCircle2 size={13} />
                                <span>确认并执行写入系统</span>
                              </button>
                            </div>
                          )}

                          {msg.pendingAction.status === 'confirmed' && (
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                              <CheckCircle2 size={13} />
                              <span>已写入底层事件库，拓扑图已实时同步更新！</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* AI 思考中加载态 */}
              {isAiThinking && (
                <div className="flex gap-3 text-left">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#5146D8] to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Sparkles size={16} className="animate-spin" />
                  </div>
                  <div className="bg-white border border-[#E5E7EB] p-3.5 rounded-2xl rounded-tl-xs shadow-2xs flex items-center gap-2 text-xs text-slate-500">
                    <RefreshCw size={13} className="animate-spin text-[#5146D8]" />
                    <span>AI 正在分析理解输入并搜索索引对应事件...</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* 底部输入控制条 */}
            <div className="p-3.5 sm:p-4 border-t border-[#E5E7EB] bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="输入自然语言，例如：帮我推进璀璨星图前端工程重构到下一步..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5146D8]/30 focus:bg-white transition-all"
                />

                <button
                  type="submit"
                  disabled={!inputValue.trim() || isAiThinking}
                  className="px-4 py-2.5 rounded-xl bg-[#5146D8] hover:bg-[#4338CA] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Send size={13} />
                  <span>发送</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

