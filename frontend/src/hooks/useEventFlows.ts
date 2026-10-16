/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 事件流程状态与持久化管理器 (useEventFlows)
 * 职责：
 * 1. 管理进行中库 (in_progress) 和已完成库 (completed) 事件
 * 2. 支撑新建事件、推进下一步节点、创建新分支、事件闭环及大模型 JSON 导入
 * 3. 驱动持久化存储 (hk_event_flows_v1) 并广播跨组件同步事件
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  EventFlow,
  EventStatus,
  EventPriority,
  EventCategory,
  FlowNodeItem,
  FlowEdgeItem,
  FlowBranchItem,
  FlowNodeType,
  EventFlowFolder,
} from '../types/eventFlow';

const STORAGE_KEY = 'hk_event_flows_v1';
const FOLDER_STORAGE_KEY = 'hk_event_folders_v1';

export const DEFAULT_EVENT_FOLDERS: EventFlowFolder[] = [
  { id: 'folder-biz', name: '业务攻坚与工程交付', parentId: null, isExpanded: true, createdAt: 1 },
  { id: 'folder-arch', name: '架构演进与技术重构', parentId: null, isExpanded: true, createdAt: 2 },
  { id: 'folder-workflow', name: '流程审批与合规协同', parentId: null, isExpanded: true, createdAt: 3 },
  { id: 'folder-study', name: '学习探索与前沿研读', parentId: null, isExpanded: true, createdAt: 4 },
];

// 初始高品质示范事件流数据 (结构严谨，易于 LLM 阅读)
const DEFAULT_EVENT_FLOWS: EventFlow[] = [
  {
    id: 'evt-20261012-001',
    title: '璀璨星图前端工程重构与事件流系统建设',
    status: 'in_progress',
    category: '业务攻坚',
    priority: 'high',
    folderId: 'folder-arch',
    description: '重构待办事项中枢为图驱动的事件流程体系，支持分支推演、Vue Flow 节点可视化与大模型闭环复盘。',
    currentStage: '流程拓扑图接入与分支衍生',
    createdAt: '2026-10-12T16:00:00.000Z',
    updatedAt: '2026-10-12T18:30:00.000Z',
    closedAt: null,
    closureSummary: '',
    tags: ['架构重构', 'VueFlow', '分支闭环', 'LLM规范'],
    nodes: [
      {
        id: 'node-101',
        name: '需求分析与底层 JSON 规范确立',
        type: 'start',
        status: 'completed',
        description: '以事件为基本单位，梳理进行中库与已完成库双库流转模型。',
        assignee: '核心架构师',
        dueDate: '2026-10-12',
        outputs: ['eventFlow.ts 模型规范'],
      },
      {
        id: 'node-102',
        name: '双库流转状态总线开发',
        type: 'process',
        status: 'completed',
        description: '实现 useEventFlows 数据管理，支持推进、分支与闭环。',
        assignee: '前端工程师',
        dueDate: '2026-10-12',
      },
      {
        id: 'node-103',
        name: '拓扑图与大模型 JSON 视窗开发',
        type: 'process',
        status: 'in_progress',
        description: '接入流程图画布，提供一键查看底层 JSON 与 AI 推演建议。',
        assignee: '前端全栈',
        dueDate: '2026-10-13',
      },
      {
        id: 'node-104-b1',
        name: '分支: 知识库周报/日报联动适配',
        type: 'branch',
        status: 'in_progress',
        branchId: 'br-01',
        description: '周报应用可直接调用事件流程进行中的事项作为总结素材。',
        assignee: 'AI Agent',
        dueDate: '2026-10-14',
      },
    ],
    edges: [
      { id: 'e-101-102', source: 'node-101', target: 'node-102', label: '推进下一步' },
      { id: 'e-102-103', source: 'node-102', target: 'node-103', label: '主干推进' },
      { id: 'e-102-b1', source: 'node-102', target: 'node-104-b1', label: '衍生分支' },
    ],
    branches: [
      {
        id: 'br-01',
        name: '知识库与周报联动衍生分支',
        sourceNodeId: 'node-102',
        status: 'active',
        description: '并行推进事件流与知识库、日报应用的深层联动。',
        createdAt: '2026-10-12T17:30:00.000Z',
      },
    ],
    llmMetadata: {
      targetGoal: '实现全功能事件流程管理与双库自动流转闭环',
      nextRecommendedAction: '完成 node-103 拓扑图联调后发起闭环决策',
    },
  },
  {
    id: 'evt-20261011-002',
    title: '3D 知识图谱多维力导向聚合算法优化',
    status: 'in_progress',
    category: '架构演进',
    priority: 'medium',
    folderId: 'folder-arch',
    description: '优化实体节点与主题星云的空间吸引力与排斥力参数，提升跨文档关联表现。',
    currentStage: '物理力学引力参数微调',
    createdAt: '2026-10-11T10:00:00.000Z',
    updatedAt: '2026-10-12T11:20:00.000Z',
    closedAt: null,
    closureSummary: '',
    tags: ['知识图谱', '3D星域', '力导向算法'],
    nodes: [
      {
        id: 'node-201',
        name: '图算法基准性能评测',
        type: 'start',
        status: 'completed',
        description: '评估 5000+ 节点在 WebGL 中的渲染帧率与碰撞阻尼。',
        assignee: '算法团队',
        dueDate: '2026-10-11',
      },
      {
        id: 'node-202',
        name: 'Barnes-Hut 空间四叉树引力优化',
        type: 'process',
        status: 'in_progress',
        description: '将 O(N^2) 运算复杂度优化至 O(N log N)。',
        assignee: '图形计算工程师',
        dueDate: '2026-10-15',
      },
    ],
    edges: [
      { id: 'e-201-202', source: 'node-201', target: 'node-202', label: '推进算法实现' },
    ],
    branches: [],
  },
  {
    id: 'evt-20261010-003',
    title: '生产级企业 UI 设计规范交付与组件拆分',
    status: 'completed',
    category: '流程审批',
    priority: 'high',
    folderId: 'folder-workflow',
    description: '严格遵循 Design Tokens 与核心设计语言，实现全站统一的浅色高光质感。',
    currentStage: '已完成全量闭环验收',
    createdAt: '2026-10-10T09:00:00.000Z',
    updatedAt: '2026-10-11T18:00:00.000Z',
    closedAt: '2026-10-11T18:00:00.000Z',
    closureSummary: '🎉 **事件闭环复盘成果**：已全面完成 Neutral + Indigo 浅色视觉体系落地。全站图标、卡片阴影、发光药丸胶囊选中态均已达标，已归入已完成库并形成设计资产规范。',
    tags: ['UI规范', 'DesignTokens', '已闭环'],
    nodes: [
      {
        id: 'node-301',
        name: 'Design Tokens 语义化变量梳理',
        type: 'start',
        status: 'completed',
        description: '制定背景、高光、文字与边框色彩规范。',
        assignee: 'UI 设计师',
        dueDate: '2026-10-10',
      },
      {
        id: 'node-302',
        name: '核心基础组件库升级改造',
        type: 'process',
        status: 'completed',
        description: '改造 Button、Card、Modal、UniversalTreeSidebar 组件。',
        assignee: '前端工程师',
        dueDate: '2026-10-11',
      },
      {
        id: 'node-303',
        name: '设计系统全站验收并闭环',
        type: 'closure',
        status: 'completed',
        description: '产品与设计评审通过，正式沉淀为企业设计系统规范。',
        assignee: '评审委员会',
        dueDate: '2026-10-11',
      },
    ],
    edges: [
      { id: 'e-301-302', source: 'node-301', target: 'node-302', label: '变量交付' },
      { id: 'e-302-303', source: 'node-302', target: 'node-303', label: '提测验收并闭环' },
    ],
    branches: [],
  },
];

export function useEventFlows() {
  const [folders, setFolders] = useState<EventFlowFolder[]>(() => {
    try {
      const stored = localStorage.getItem(FOLDER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse event folders:', e);
    }
    return DEFAULT_EVENT_FOLDERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save event folders:', e);
    }
  }, [folders]);

  const [events, setEvents] = useState<EventFlow[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return DEFAULT_EVENT_FLOWS;
    } catch (e) {
      console.error('Failed to load event flows from storage:', e);
      return DEFAULT_EVENT_FLOWS;
    }
  });

  const [activeEventId, setActiveEventId] = useState<string | null>(() => {
    return DEFAULT_EVENT_FLOWS[0]?.id || null;
  });

  const activeEvent = useMemo(() => {
    if (!events.length) return null;
    return events.find((e) => e.id === activeEventId) || events[0] || null;
  }, [events, activeEventId]);

  // 持久化存储与事件广播
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('hk-events-change', { detail: events }));
    } catch (e) {
      console.error('Failed to save event flows:', e);
    }
  }, [events]);

  // 进行中库
  const inProgressEvents = useMemo(() => {
    return events.filter((e) => e.status === 'in_progress');
  }, [events]);

  // 已完成库 (闭环归档)
  const completedEvents = useMemo(() => {
    return events.filter((e) => e.status === 'completed');
  }, [events]);

  // 目录操作
  const createFolder = useCallback((name: string, parentId?: string | null) => {
    const newFolder: EventFlowFolder = {
      id: `folder-evt-${Date.now()}`,
      name: name.trim() || '未命名分组',
      parentId: parentId || null,
      isExpanded: true,
      createdAt: Date.now(),
    };
    setFolders((prev) => [...prev, newFolder]);
    return newFolder;
  }, []);

  const renameFolder = useCallback((id: string, newName: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName.trim() || f.name } : f))
    );
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id && f.parentId !== id));
    setEvents((prev) =>
      prev.map((e) => (e.folderId === id ? { ...e, folderId: null } : e))
    );
  }, []);

  const toggleFolderExpand = useCallback((id: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isExpanded: !f.isExpanded } : f))
    );
  }, []);

  const moveEventToFolder = useCallback((eventId: string, folderId: string | null) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, folderId, updatedAt: new Date().toISOString() } : e))
    );
  }, []);

  // 1. 创建新事件 (以事件为基本单位)
  const createEvent = useCallback(
    (params: {
      title: string;
      description?: string;
      category?: EventCategory;
      priority?: EventPriority;
      tags?: string[];
      folderId?: string | null;
    }) => {
      const nowStr = new Date().toISOString();
      const eventId = `evt-${Date.now()}`;
      const startNodeId = `node-${Date.now()}-1`;

      const startNode: FlowNodeItem = {
        id: startNodeId,
        name: '事件发起与目标确立',
        type: 'start',
        status: 'in_progress',
        description: params.description || '确立本事件的核心交付目标与推进路线。',
        assignee: '发起人',
        dueDate: nowStr.slice(0, 10),
      };

      const newEvent: EventFlow = {
        id: eventId,
        title: params.title.trim() || '新事件流程',
        status: 'in_progress',
        category: params.category || '业务攻坚',
        priority: params.priority || 'medium',
        description: params.description?.trim() || '',
        currentStage: '事件初始创建',
        createdAt: nowStr,
        updatedAt: nowStr,
        closedAt: null,
        closureSummary: '',
        tags: params.tags || ['新事件'],
        folderId: params.folderId || null,
        nodes: [startNode],
        edges: [],
        branches: [],
        llmMetadata: {
          targetGoal: params.title,
          nextRecommendedAction: '梳理第一个执行节点或创建并行分支',
        },
      };

      setEvents((prev) => [newEvent, ...prev]);
      setActiveEventId(newEvent.id);
      return newEvent;
    },
    []
  );

  // 2. 推进主干下一步节点
  const addNextStepNode = useCallback(
    (
      eventId: string,
      params: {
        name: string;
        description?: string;
        assignee?: string;
        dueDate?: string;
        sourceNodeId?: string; // 默认挂在当前最后一个节点后
      }
    ) => {
      const nowStr = new Date().toISOString();
      setEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId) return event;

          const sourceNode = params.sourceNodeId
            ? event.nodes.find((n) => n.id === params.sourceNodeId)
            : event.nodes[event.nodes.length - 1];

          const newNodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const newNode: FlowNodeItem = {
            id: newNodeId,
            name: params.name.trim(),
            type: 'process',
            status: 'in_progress',
            description: params.description || '',
            assignee: params.assignee || '未指派',
            dueDate: params.dueDate || nowStr.slice(0, 10),
          };

          const newEdge: FlowEdgeItem = {
            id: `edge-${sourceNode ? sourceNode.id : 'root'}-${newNodeId}`,
            source: sourceNode ? sourceNode.id : event.nodes[0]?.id || newNodeId,
            target: newNodeId,
            label: '推进下一步',
          };

          return {
            ...event,
            currentStage: newNode.name,
            updatedAt: nowStr,
            nodes: [...event.nodes, newNode],
            edges: sourceNode ? [...event.edges, newEdge] : event.edges,
          };
        })
      );
    },
    []
  );

  // 3. 创建新的分支 (Branching)
  const createBranch = useCallback(
    (
      eventId: string,
      params: {
        branchName: string;
        sourceNodeId: string;
        firstNodeName: string;
        description?: string;
      }
    ) => {
      const nowStr = new Date().toISOString();
      setEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId) return event;

          const branchId = `br-${Date.now()}`;
          const newBranch: FlowBranchItem = {
            id: branchId,
            name: params.branchName.trim(),
            sourceNodeId: params.sourceNodeId,
            status: 'active',
            description: params.description || '',
            createdAt: nowStr,
          };

          const branchNodeId = `node-${Date.now()}-br`;
          const branchNode: FlowNodeItem = {
            id: branchNodeId,
            name: params.firstNodeName.trim(),
            type: 'branch',
            status: 'in_progress',
            branchId: branchId,
            description: params.description || `分支【${params.branchName}】的启动节点`,
            dueDate: nowStr.slice(0, 10),
          };

          const branchEdge: FlowEdgeItem = {
            id: `edge-${params.sourceNodeId}-${branchNodeId}`,
            source: params.sourceNodeId,
            target: branchNodeId,
            label: `分支衍生: ${params.branchName}`,
          };

          return {
            ...event,
            updatedAt: nowStr,
            currentStage: `已衍生分支: ${params.branchName}`,
            branches: [...event.branches, newBranch],
            nodes: [...event.nodes, branchNode],
            edges: [...event.edges, branchEdge],
          };
        })
      );
    },
    []
  );

  // 4. 事件闭环 (Closure) ➔ 流转至已完成库
  const closeEvent = useCallback(
    (
      eventId: string,
      closureParams: {
        summary: string;
        lastNodeName?: string;
      }
    ) => {
      const nowStr = new Date().toISOString();
      setEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId) return event;

          const lastNode = event.nodes[event.nodes.length - 1];
          const closureNodeId = `node-${Date.now()}-close`;
          const closureNode: FlowNodeItem = {
            id: closureNodeId,
            name: closureParams.lastNodeName?.trim() || '事件全流程闭环归档',
            type: 'closure',
            status: 'completed',
            description: closureParams.summary,
            dueDate: nowStr.slice(0, 10),
          };

          const closureEdge: FlowEdgeItem = {
            id: `edge-${lastNode ? lastNode.id : 'root'}-${closureNodeId}`,
            source: lastNode ? lastNode.id : event.nodes[0]?.id || closureNodeId,
            target: closureNodeId,
            label: '达成闭环',
          };

          // 将所有未完成节点标为 completed
          const updatedNodes = event.nodes.map((n) => ({
            ...n,
            status: 'completed' as const,
          }));

          return {
            ...event,
            status: 'completed',
            currentStage: '已全面达成闭环',
            updatedAt: nowStr,
            closedAt: nowStr,
            closureSummary: closureParams.summary,
            nodes: [...updatedNodes, closureNode],
            edges: [...event.edges, closureEdge],
          };
        })
      );
    },
    []
  );

  // 5. 重新激活事件 (从已完成库移回进行中库)
  const reopenEvent = useCallback((eventId: string) => {
    const nowStr = new Date().toISOString();
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) return event;
        return {
          ...event,
          status: 'in_progress',
          closedAt: null,
          currentStage: '重新激活推进中',
          updatedAt: nowStr,
        };
      })
    );
  }, []);

  // 6. 更新事件通用属性 (如直接就地修改底层 JSON 映射的字段)
  const updateEvent = useCallback((eventId: string, partial: Partial<EventFlow>) => {
    const nowStr = new Date().toISOString();
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              ...partial,
              updatedAt: nowStr,
            }
          : event
      )
    );
  }, []);

  // 7. 删除事件
  const deleteEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  // 8. 从大模型生成的 JSON 一键导入新事件
  const importEventFromJson = useCallback((jsonString: string): { success: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.title || !Array.isArray(parsed.nodes)) {
        return { success: false, error: 'JSON 数据缺少必要的 title 或 nodes 数组结构' };
      }

      const nowStr = new Date().toISOString();
      const imported: EventFlow = {
        id: parsed.id || `evt-${Date.now()}`,
        title: parsed.title,
        status: parsed.status === 'completed' || parsed.status === '已完成闭环' ? 'completed' : 'in_progress',
        category: parsed.category || '业务攻坚',
        priority: parsed.priority || 'medium',
        description: parsed.description || '',
        currentStage: parsed.currentStage || '导入事件',
        createdAt: parsed.createdAt || nowStr,
        updatedAt: nowStr,
        closedAt: parsed.closedAt || null,
        closureSummary: parsed.closureSummary || '',
        tags: parsed.tags || ['LLM导入'],
        nodes: parsed.nodes,
        edges: parsed.edges || [],
        branches: parsed.branches || [],
      };

      setEvents((prev) => [imported, ...prev]);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'JSON 语法解析错误' };
    }
  }, []);

  // 9. 更新单个节点属性 (如修改名称、简介、发布日期)
  const updateNode = useCallback((eventId: string, nodeId: string, partial: Partial<FlowNodeItem>) => {
    const nowStr = new Date().toISOString();
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) return event;
        const updatedNodes = event.nodes.map((n) =>
          n.id === nodeId ? { ...n, ...partial } : n
        );
        return {
          ...event,
          updatedAt: nowStr,
          nodes: updatedNodes,
        };
      })
    );
  }, []);

  // 10. 删除指定节点
  const deleteNode = useCallback((eventId: string, nodeId: string) => {
    const nowStr = new Date().toISOString();
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) return event;
        return {
          ...event,
          updatedAt: nowStr,
          nodes: event.nodes.filter((n) => n.id !== nodeId),
          edges: event.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        };
      })
    );
  }, []);

  return {
    events,
    folders,
    activeEventId,
    activeEvent,
    setActiveEventId,
    inProgressEvents,
    completedEvents,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleFolderExpand,
    moveEventToFolder,
    createEvent,
    addNextStepNode,
    createBranch,
    closeEvent,
    reopenEvent,
    updateEvent,
    updateNode,
    deleteNode,
    deleteEvent,
    importEventFromJson,
  };
}
