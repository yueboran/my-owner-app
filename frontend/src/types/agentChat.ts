/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 对话智能体与 Dify / OpenCode 工作流核心类型定义
 */

export type MessageRole = 'user' | 'assistant' | 'system';

// 智能体分步执行计划步骤类型
export type PlanStepType = 'analysis' | 'skill_call' | 'tool_call' | 'draft_render' | 'review';
export type PlanStepStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface PlanStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: PlanStepType;
  status: PlanStepStatus;
  targetSkillOrToolId?: string; // 关联的 Skill 或 Tool 标识
  targetName?: string;          // 显示名称，如 '周报/日报智能提炼'
  targetCategory?: 'skill' | 'tool' | 'prompt';
  outputSummary?: string;       // 步骤产出摘要
}

// 整个会话当前的工作流计划
export interface WorkflowPlan {
  id: string;
  targetModule: string;         // 如 'journal' | 'business-analysis'
  moduleLabel: string;          // 如 '工作日记'
  userGoal: string;             // 用户最终目标
  steps: PlanStep[];
  activeStepIndex: number;      // 当前处于哪一步待确认执行
  isCompleted: boolean;
}

// 多轮信息收集问答状态
export interface ClarificationQuestion {
  targetModule: string;
  moduleLabel: string;
  missingFields: string[];      // 缺失的核心要素名称列表，如 ['日记标题/业务方向', '今日主要进展']
  questionText: string;         // AI 友好的多轮询问语
  quickSuggestions: string[];   // 快速点击填入的选项胶囊
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  agentId?: string;
  workflowNode?: string; // 所调用的 Dify 工作流节点/技能说明
  modelName?: string;    // 当前模型名称标识
  isStreaming?: boolean;
  plan?: WorkflowPlan;   // 关联的执行步骤清单
  clarification?: ClarificationQuestion; // 多轮询问引导
}

export interface ChatFolder {
  id: string;
  name: string;
  parentId?: string | null; // 上级目录 ID，为 null 或 undefined 表示根目录
  createdAt: number;
  isExpanded?: boolean; // 目录展开/收起状态
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  selectedAgentId: string;
  isPinned?: boolean;
  isUnread?: boolean;
  draft?: any; // 关联的结构化草案
  routedType?: string;
  folderId?: string | null; // 所属多级目录 ID，null 或 undefined 表示未归档/根目录
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  avatarIcon: string;
  difyWorkflowKey?: string;
  opencodeEngine?: string;
  category: 'general' | 'workflow' | 'analysis' | 'code';
}

export interface PromptTemplate {
  id: string;
  title: string;
  prompt: string;
  category: string;
  agentId?: string;
}

// 预设可用智能体列表（支持 Dify 工作流与 OpenCode 底座）
export const PRESET_AGENTS: AgentInfo[] = [
  {
    id: 'general-assistant',
    name: '星图智胜强助理',
    description: '通用全能智能体，负责综合问答、任务拆解与协调调度',
    avatarIcon: 'Bot',
    opencodeEngine: 'opencode-glm-4',
    category: 'general',
  },
  {
    id: 'dify-report-agent',
    name: 'Dify 智能研报工作流',
    description: '接入 Dify 深度研报工作流，自动检索知识库并生成通信保障/技术分析报告',
    avatarIcon: 'FileText',
    difyWorkflowKey: 'dify_workflow_report_gen',
    category: 'workflow',
  },
  {
    id: 'opencode-dev-agent',
    name: 'OpenCode 架构与研发助理',
    description: '基于 OpenCode 底座的代码审查、算法优化与系统架构设计',
    avatarIcon: 'Code',
    opencodeEngine: 'opencode-deepseek-coder',
    category: 'code',
  },
  {
    id: 'knowledge-graph-agent',
    name: '知识图谱多跳推理 Agent',
    description: '穿透璀璨星图知识库，进行多跳实体关系抽取与证据链溯源',
    avatarIcon: 'Compass',
    difyWorkflowKey: 'dify_kg_rag_flow',
    category: 'analysis',
  },
];

// 预设常用模板与指令
export const PRESET_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'tpl-1',
    title: '通信保障报告',
    prompt: '请为我生成一份专业的通信保障与系统巡检报告，包含网络拓扑状态、故障风险评估与应急处置方案。',
    category: '报告生成',
    agentId: 'dify-report-agent',
  },
  {
    id: 'tpl-2',
    title: '架构重构审查',
    prompt: '请基于 Clean Architecture 与高内聚低耦合原则，审查当前业务模块的代码结构并给出重构方案。',
    category: '架构设计',
    agentId: 'opencode-dev-agent',
  },
  {
    id: 'tpl-3',
    title: '知识图谱实体抽取',
    prompt: '请分析上述业务方案，抽取其中的核心技术实体、关联依赖与落地风险点，并给出图谱三元组。',
    category: '知识分析',
    agentId: 'knowledge-graph-agent',
  },
  {
    id: 'tpl-4',
    title: '任务拆解与甘特规划',
    prompt: '请将该目标拆解为具体的 4 个里程碑阶段，并评估关键交付物与潜在技术卡点。',
    category: '综合助理',
    agentId: 'general-assistant',
  },
];

export interface ChatModelOption {
  id: string;
  name: string;
  provider: 'DeepSeek' | 'Google' | 'Anthropic' | 'OpenAI';
  tag: string;
  badgeColor: string;
  description: string;
  contextWindow: string;
  isRecommended?: boolean;
}

// 可选基座大模型配置清单
export const AVAILABLE_CHAT_MODELS: ChatModelOption[] = [
  {
    id: 'opencode-coder',
    name: 'OpenCode · 架构与研发助理',
    provider: 'DeepSeek',
    tag: '本地+算力连通',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: '接入本地 OpenCode 服务与 SiliconFlow，专精代码审查、重构与架构推演',
    contextWindow: '128K',
    isRecommended: true,
  },
  {
    id: 'deepseek-v3',
    name: '星图智言 · DeepSeek-V3',
    provider: 'DeepSeek',
    tag: '旗舰通用',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: '综合理解敏锐，长文本业务提炼与结构化组件格式化首选',
    contextWindow: '128K',
  },
  {
    id: 'deepseek-r1',
    name: '星图智言 · DeepSeek-R1',
    provider: 'DeepSeek',
    tag: '深度思考',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: '具备完整思维链 (CoT)，擅长复杂系统架构、算法推演与严密逻辑',
    contextWindow: '128K',
  },
  {
    id: 'gemini-2-5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    tag: '超长上下文',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: '多模态感知与百万 Token 吞吐，多篇超长文档综合检索与关联分析',
    contextWindow: '1000K',
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    tag: '编程大师',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    description: '全栈工程化代码设计与交互式组件生成大师，遵循规范极其严谨',
    contextWindow: '200K',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o 全球基座',
    provider: 'OpenAI',
    tag: '全能平衡',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: '响应敏捷的高情商通用大模型，擅长开放式头脑风暴与跨领域对话',
    contextWindow: '128K',
  },
];

