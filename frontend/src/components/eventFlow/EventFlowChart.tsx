import React, { useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Clock, Edit2, Calendar, X, Trash2, Check } from 'lucide-react';
import { convertToGraphLayout, type EventFlow, type FlowNodeItem } from '../../types/eventFlow';

// 精简版事件节点卡片组件：支持编辑，仅保留标题、简介、发布日期
const CustomEventNode: React.FC<NodeProps> = ({ data }: any) => {
  const node = data as FlowNodeItem & { onEdit?: (n: FlowNodeItem) => void };

  return (
    <div
      onClick={() => node.onEdit?.(node)}
      className="w-[210px] p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing select-none text-left relative group"
    >
      {/* 左侧输入连接桩 (必须使用 absolute 且父级为 relative) */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="w-2.5 h-2.5 !bg-indigo-500 border-2 border-white rounded-full z-10"
        style={{ position: 'absolute', left: -5, top: '50%', transform: 'translateY(-50%)' }}
      />

      {/* 1. 标题与编辑按钮 */}
      <div className="flex items-start justify-between gap-1.5">
        <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 leading-snug flex-1">
          {node.name}
        </h4>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            node.onEdit?.(node);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all cursor-pointer shrink-0"
          title="点击编辑节点"
        >
          <Edit2 size={12} />
        </button>
      </div>

      {/* 2. 简介 */}
      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
        {node.description || '暂无简介描述'}
      </p>

      {/* 3. 时间 (明确为发布日期) */}
      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
        <Clock size={11} className="text-slate-400 shrink-0" />
        <span className="truncate">发布：{node.publishDate || node.dueDate || '2026-10-12'}</span>
      </div>

      {/* 右侧输出连接桩 (必须使用 absolute 且父级为 relative) */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="w-2.5 h-2.5 !bg-indigo-500 border-2 border-white rounded-full z-10"
        style={{ position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)' }}
      />
    </div>
  );
};

interface EventFlowChartProps {
  event: EventFlow;
  onNodeClick?: (nodeId: string) => void;
  onUpdateNode?: (eventId: string, nodeId: string, partial: Partial<FlowNodeItem>) => void;
  onDeleteNode?: (eventId: string, nodeId: string) => void;
}

export const EventFlowChart: React.FC<EventFlowChartProps> = ({
  event,
  onNodeClick,
  onUpdateNode,
  onDeleteNode,
}) => {
  // 当前正在编辑的节点
  const [editingNode, setEditingNode] = useState<FlowNodeItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');

  // 节点类型映射
  const nodeTypes = useMemo(
    () => ({
      customEventNode: CustomEventNode,
    }),
    []
  );

  // 打开编辑节点模态框
  const handleOpenEdit = (node: FlowNodeItem) => {
    setEditingNode(node);
    setEditName(node.name);
    setEditDesc(node.description || '');
    setEditDate(node.publishDate || node.dueDate || new Date().toISOString().slice(0, 10));
  };

  // 保存节点编辑内容
  const handleSaveNodeEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode || !editName.trim()) return;

    if (onUpdateNode) {
      onUpdateNode(event.id, editingNode.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        publishDate: editDate,
        dueDate: editDate,
      });
    }

    setEditingNode(null);
  };

  // 删除该节点
  const handleDeleteNodeAction = () => {
    if (!editingNode) return;
    if (confirm(`确定要删除节点【${editingNode.name}】吗？`)) {
      onDeleteNode?.(event.id, editingNode.id);
      setEditingNode(null);
    }
  };

  // 计算初始布局与完备连线
  const { initialNodes, initialEdges } = useMemo(() => {
    const { graphNodes, graphEdges } = convertToGraphLayout(event);

    // 为每个节点绑定编辑回调
    const nodesWithHandler = graphNodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onEdit: handleOpenEdit,
      },
    }));

    // 强制赋予粗实心连线与清晰紫色大箭头
    const edgesWithArrows = graphEdges.map((e) => ({
      ...e,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366F1', strokeWidth: 2.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 22,
        height: 22,
        color: '#6366F1',
      },
    }));

    return { initialNodes: nodesWithHandler, initialEdges: edgesWithArrows };
  }, [event]);

  // 维护可拖拽节点与连线状态
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 当外部事件变更时同步重置拓扑图节点与连线
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="w-full h-full min-h-[460px] rounded-xl border border-slate-200/90 overflow-hidden bg-slate-50/60 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background gap={16} size={1} color="#E2E8F0" />
        <Controls showInteractive={false} position="bottom-right" />
        <MiniMap
          nodeColor="#6366F1"
          maskColor="rgba(241, 245, 249, 0.7)"
          position="bottom-left"
          className="!w-28 !h-20 !rounded-lg !border !border-slate-200 shadow-xs"
        />
      </ReactFlow>

      {/* 节点编辑轻量弹窗 */}
      {editingNode && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Edit2 size={13} className="text-[#5146D8]" />
                <span>编辑流程节点</span>
              </span>
              <button
                type="button"
                onClick={() => setEditingNode(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveNodeEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  节点标题 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="例如：双库流转状态总线开发"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">节点简介</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="输入节点的具体执行要点或交付物说明..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-indigo-600" />
                  <span>发布日期</span>
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleDeleteNodeAction}
                  className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <Trash2 size={12} />
                  <span>删除节点</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingNode(null)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 font-medium transition-colors cursor-pointer text-[11px]"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#5146D8] hover:bg-[#4338CA] text-white rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 text-[11px] shadow-xs"
                  >
                    <Check size={12} />
                    <span>保存修改</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


