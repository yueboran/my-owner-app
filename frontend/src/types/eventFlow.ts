/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 事件流程 (Event Flow) 核心数据模型与大模型交互接口
 * 规范：
 * 1. 以“事件 (Event)”为基本单元，分为进行中 (in_progress) 和已完成 (completed) 两个库
 * 2. 底层以自解释、高语义强度的标准 JSON 表示，易于大模型 (LLM) 秒级理解与指令生成
 * 3. 支持下一步创建新分支 (branching)，支持全生命周期闭环 (closure)
 * 4. 节点与边模型同时与 Vue Flow / React Flow 规范 100% 对应
 */

export type EventStatus = 'in_progress' | 'completed';
export type EventPriority = 'high' | 'medium' | 'low';
export type EventCategory = '业务攻坚' | '架构演进' | '流程审批' | '学习探索' | '日常事务';

export type FlowNodeType =
  | 'start'      // 起始节点
  | 'process'    // 核心推进节点
  | 'decision'   // 决策分流节点
  | 'branch'     // 并行/条件分支节点
  | 'milestone'  // 里程碑节点
  | 'closure';   // 闭环节点

export type FlowNodeStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

/** 流程节点 (易于 LLM 理解的标准结构) */
export interface FlowNodeItem {
  id: string;
  name: string;
  type: FlowNodeType;
  status: FlowNodeStatus;
  description?: string;
  assignee?: string;           // 责任人 / 智能体
  publishDate?: string;        // 发布日期 (YYYY-MM-DD)
  dueDate?: string;            // 兼容旧字段
  branchId?: string;           // 归属的分支ID (主干为主流程)
  outputs?: string[];          // 产出物 / 交付物
  notes?: string;              // 推进备注
}

/** 流程连接边 */
export interface FlowEdgeItem {
  id: string;
  source: string;              // 起始节点 ID
  target: string;              // 目标节点 ID
  label?: string;              // 流转逻辑说明 (例如: "下一步", "评审通过", "分支衍生")
  condition?: string;          // 流转条件
}

/** 分支结构 (Branch) */
export interface FlowBranchItem {
  id: string;
  name: string;
  sourceNodeId: string;        // 分支发起的源节点 ID
  status: 'active' | 'merged' | 'abandoned';
  description?: string;
  createdAt: string;
}

/** 事件流程核心数据模型 (每个事件底层用此 JSON 完整表达) */
export interface EventFlow {
  id: string;
  title: string;
  status: EventStatus;         // in_progress: 进行中库 | completed: 已完成库
  category: EventCategory;
  priority: EventPriority;
  description: string;
  currentStage: string;        // 当前所在阶段摘要
  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
  closedAt?: string | null;    // 闭环归档时间
  closureSummary?: string;     // 闭环复盘总结报告 (由人工或 AI 提炼)
  tags: string[];
  nodes: FlowNodeItem[];       // 流程节点集合
  edges: FlowEdgeItem[];       // 流程拓扑关联边
  branches: FlowBranchItem[];  // 分支体系
  folderId?: string | null;    // 所属多级目录分组ID
  attachments?: any[];         // 配套图文附件清单
  blocks?: any[];              // 块编辑器组件节点
  globalFontSize?: string;     // 全局正文字号
  llmMetadata?: {              // 针对大模型推理优化的辅助元数据
    targetGoal: string;
    nextRecommendedAction?: string;
    riskAlert?: string;
  };
}

export interface EventFlowFolder {
  id: string;
  name: string;
  parentId?: string | null;
  isExpanded?: boolean;
  createdAt: number;
}

/** 格式化为大模型最容易理解的高密度精简 JSON */
export function formatEventToLlmJson(event: EventFlow): string {
  const plain = {
    id: event.id,
    title: event.title,
    status: event.status === 'in_progress' ? '进行中' : '已完成闭环',
    category: event.category,
    priority: event.priority,
    currentStage: event.currentStage,
    description: event.description,
    createdAt: event.createdAt,
    closedAt: event.closedAt || null,
    closureSummary: event.closureSummary || null,
    nodes: event.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      status: n.status,
      description: n.description || '',
      assignee: n.assignee || '未指派',
      dueDate: n.dueDate || null,
    })),
    edges: event.edges.map((e) => ({
      from: e.source,
      to: e.target,
      label: e.label || '流转',
    })),
    branches: event.branches.map((b) => ({
      id: b.id,
      name: b.name,
      fromNode: b.sourceNodeId,
      status: b.status,
    })),
  };
  return JSON.stringify(plain, null, 2);
}

/** 针对 Vue Flow / React Flow 规范，将事件 nodes 与 edges 计算为拓扑图坐标 */
export function convertToGraphLayout(event: EventFlow) {
  const horizontalGap = 290;
  const verticalGap = 130;

  // 1. 确保连线完备：如果 event.edges 为空但节点有多个，自动构建拓扑连线
  let effectiveEdges = Array.isArray(event.edges) ? [...event.edges] : [];
  if (effectiveEdges.length === 0 && event.nodes && event.nodes.length > 1) {
    const mainNodes = event.nodes.filter((n) => !n.branchId);
    for (let i = 0; i < mainNodes.length - 1; i++) {
      effectiveEdges.push({
        id: `auto-e-${mainNodes[i].id}-${mainNodes[i + 1].id}`,
        source: mainNodes[i].id,
        target: mainNodes[i + 1].id,
        label: '推进下一步',
      });
    }

    // 分支节点连回主干源节点
    event.nodes
      .filter((n) => n.branchId)
      .forEach((bn) => {
        const branchMeta = event.branches?.find((b) => b.id === bn.branchId);
        const sourceId = branchMeta?.sourceNodeId || mainNodes[0]?.id || bn.id;
        effectiveEdges.push({
          id: `auto-e-${sourceId}-${bn.id}`,
          source: sourceId,
          target: bn.id,
          label: '分支衍生',
        });
      });
  }

  // 2. 按依赖拓扑对节点进行简单分层
  const levelMap = new Map<string, number>();
  const branchMap = new Map<string, number>();

  // 初始节点
  const startNode = event.nodes.find((n) => n.type === 'start') || event.nodes[0];
  if (startNode) {
    levelMap.set(startNode.id, 0);
  }

  // 广度遍历计算层级
  const queue = startNode ? [startNode.id] : [];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentLevel = levelMap.get(currentId) || 0;

    const outgoingEdges = effectiveEdges.filter((e) => e.source === currentId);
    outgoingEdges.forEach((e) => {
      if (!levelMap.has(e.target)) {
        levelMap.set(e.target, currentLevel + 1);
        queue.push(e.target);
      }
    });
  }

  // 分配分支 Y 轴偏移
  let branchCount = 0;
  (event.branches || []).forEach((b) => {
    branchCount += 1;
    branchMap.set(b.id, branchCount * verticalGap);
  });

  const levelRowTracker = new Map<number, number>();

  const graphNodes = event.nodes.map((n, index) => {
    const lvl = levelMap.has(n.id) ? levelMap.get(n.id)! : index;
    const branchOffset = n.branchId ? branchMap.get(n.branchId) || verticalGap : 0;
    const rowInLevel = levelRowTracker.get(lvl) || 0;
    levelRowTracker.set(lvl, rowInLevel + 1);

    const x = 50 + lvl * horizontalGap;
    const y = 80 + branchOffset + rowInLevel * verticalGap;

    return {
      id: n.id,
      type: 'customEventNode',
      position: { x, y },
      data: {
        ...n,
        eventTitle: event.title,
        priority: event.priority,
      },
    };
  });

  const graphEdges = effectiveEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#6366F1', strokeWidth: 2.5 },
    markerEnd: {
      type: 'arrowclosed',
      width: 20,
      height: 20,
      color: '#6366F1',
    },
  }));

  return { graphNodes, graphEdges };
}
