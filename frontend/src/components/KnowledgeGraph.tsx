import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Graph,
  type EdgeData,
  type GraphOptions,
  type NodeData,
} from '@antv/g6';
import {
  ChevronDown,
  ChevronRight,
  CircleDot,
  Focus,
  GitBranch,
  Link2,
  LoaderCircle,
  Orbit,
  Search,
  Sparkles,
  Download,
  X,
} from 'lucide-react';
import type { KnowledgeItem } from '../knowledgeTypes';
import { buildSemanticGraph, type SemanticNode } from '../data/semanticGraph';
import './KnowledgeGraph.css';

type LayoutMode = 'force' | 'dagre' | 'radial';

const layoutMeta: Record<LayoutMode, { label: string; icon: typeof Orbit }> = {
  dagre: { label: '谱系布局', icon: GitBranch },
  force: { label: '引力布局', icon: Orbit },
  radial: { label: '环域布局', icon: CircleDot },
};

const statusLabel: Record<KnowledgeItem['status'], string> = {
  inbox: '待消化',
  reading: '研读中',
  distilled: '已沉淀',
};

function nodeData(node: NodeData) {
  return node.data as SemanticNode['data'];
}

interface KnowledgeNodeCardProps {
  node: NodeData;
  selected: boolean;
  collapsed: boolean;
  onSelect?: () => void;
  onToggle?: () => void;
}

export function KnowledgeNodeCard({ node, selected, collapsed, onSelect, onToggle }: KnowledgeNodeCardProps) {
  const data = nodeData(node);
  const accentStyle = { '--node-accent': data.color } as CSSProperties;

  if (data.nodeType === 'category') {
    return (
      <div className={`g6-category-node ${selected ? 'is-selected' : ''}`} style={accentStyle} onDoubleClick={onToggle}>
        <span className="g6-category-orbit"><Sparkles size={16} /></span>
        <span className="g6-category-copy">
          <strong>{data.label}</strong>
          <small>{data.childCount ?? 0} 个知识实体</small>
        </span>
        <span className="g6-collapse-mark" aria-hidden="true">
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </span>
      </div>
    );
  }

  return (
    <div className={`g6-knowledge-node ${selected ? 'is-selected' : ''}`} style={accentStyle} onClick={onSelect}>
      <div className="g6-node-head">
        <span>{data.category}</span>
        <i>{statusLabel[data.status ?? 'inbox']}</i>
      </div>
      <strong>{data.label}</strong>
      <p>{data.summary || '等待进一步结构化提炼'}</p>
      <div className="g6-node-foot">
        <span>{data.tags?.slice(0, 2).map((tag) => `#${tag}`).join(' ') || '#全域知识'}</span>
        <b>{Math.round((data.confidence ?? 0) * 100)}% 沉淀</b>
      </div>
    </div>
  );
}

function getLayout(mode: LayoutMode): GraphOptions['layout'] {
  if (mode === 'dagre') return { type: 'dagre', rankdir: 'LR', nodesep: 46, ranksep: 140, animation: true };
  if (mode === 'radial') return { type: 'radial', unitRadius: 170, preventOverlap: true, nodeSize: 260, animation: true };
  return {
    type: 'd3-force',
    link: { distance: 200, strength: 0.8 },
    manyBody: { strength: -900 },
    center: { strength: 0.2 },
    collide: { radius: 140, strength: 1 },
    animation: true,
  };
}

interface RenderableGraph {
  render: () => Promise<unknown>;
  destroy: () => void;
}

export function startGraphRender(
  graph: RenderableGraph,
  onReady: () => void,
  onError?: (error: unknown) => void,
) {
  let disposed = false;
  let rendered = false;

  void graph.render().then(() => {
    rendered = true;
    if (disposed) {
      graph.destroy();
      return;
    }
    onReady();
  }).catch((error: unknown) => {
    if (!disposed) onError?.(error);
  });

  return () => {
    disposed = true;
    if (rendered) graph.destroy();
  };
}

interface KnowledgeGraphProps {
  items: KnowledgeItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onRelate: (sourceId: string, targetId: string) => void;
  onExportGraph?: () => void;
}

export default function KnowledgeGraph({ items, selectedId, onSelect, onRelate, onExportGraph }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [layout, setLayout] = useState<LayoutMode>('dagre');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const graphData = useMemo(
    () => buildSemanticGraph(items, { collapsedCategories, query }),
    [collapsedCategories, items, query],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !graphData.nodes.length) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const graph = new Graph({
      container,
      autoFit: 'view',
      data: graphData,
      background: 'transparent',
      padding: 60,
      layout: getLayout(layout),
      node: {
        type: 'rect',
        style: {
          // 尺寸增大，留足呼吸空间
          size: (datum) => nodeData(datum).nodeType === 'category' ? [220, 76] : [270, 160],
          radius: (datum) => nodeData(datum).nodeType === 'category' ? 16 : 12,
          fill: (datum) => nodeData(datum).nodeType === 'category' ? '#0F1E36' : '#11223A',
          stroke: (datum) => nodeData(datum).color,
          lineWidth: (datum) => selectedId === datum.id ? 3.5 : 2,
          shadowColor: (datum) => nodeData(datum).color,
          shadowBlur: (datum) => selectedId === datum.id ? 22 : 8,
          // 文字层级化排版
          labelText: (datum) => {
            const data = nodeData(datum);
            if (data.nodeType === 'category') {
              return `【分类】${data.label}\n${data.childCount ?? 0} 个知识实体`;
            }
            const statusTxt = statusLabel[data.status ?? 'inbox'];
            const tags = data.tags?.slice(0, 2).map((tag) => `#${tag}`).join(' ') || '#知识实体';
            const confidence = `${Math.round((data.confidence ?? 0) * 100)}% 沉淀`;
            const summary = data.summary ? (data.summary.length > 26 ? data.summary.slice(0, 26) + '...' : data.summary) : '已建立语义连接';
            return `${data.category} · ${statusTxt}\n${data.label}\n${summary}\n${tags}  •  ${confidence}`;
          },
          labelFill: '#FFFFFF',
          labelPlacement: 'center',
          // 调大字体：分类 15px，知识点 13px，清晰易读
          labelFontSize: (datum) => nodeData(datum).nodeType === 'category' ? 15 : 13,
          labelLineHeight: (datum) => nodeData(datum).nodeType === 'category' ? 24 : 21,
          labelWordWrap: true,
          labelMaxWidth: (datum) => nodeData(datum).nodeType === 'category' ? 188 : 240,
        },
        state: { active: { halo: true, haloStroke: '#60A5FA', haloLineWidth: 2, haloStrokeOpacity: 0.5 } },
        animation: { enter: 'fade', update: 'translate', exit: 'fade' },
      },
      edge: {
        type: 'cubic-horizontal',
        style: {
          stroke: (datum) => datum.data?.relation === 'RELATED_TO' ? '#60A5FA' : '#64748B',
          strokeOpacity: 0.85,
          lineWidth: 2,
          lineDash: (datum) => datum.data?.relation === 'RELATED_TO' ? [6, 4] : undefined,
          endArrow: true,
          labelText: (datum) => String(datum.data?.label ?? ''),
          labelFill: '#FFFFFF',
          labelFontSize: 12,
          labelBackground: true,
          labelBackgroundFill: '#1E293B',
          labelBackgroundRadius: 4,
          labelPadding: [4, 8],
        },
        animation: { enter: 'fade', update: 'fade', exit: 'fade' },
      },
      behaviors: [
        'drag-canvas',
        'zoom-canvas',
        'drag-element',
        { type: 'hover-activate', degree: 1, inactiveState: 'inactive' },
        {
          type: 'create-edge',
          trigger: 'drag',
          enable: editing,
          style: { stroke: '#38BDF8', lineWidth: 2.5, lineDash: [6, 5], endArrow: true },
          onCreate: (edge: EdgeData) => {
            const source = graph.getNodeData(edge.source);
            const target = graph.getNodeData(edge.target);
            if (nodeData(source).nodeType !== 'knowledge' || nodeData(target).nodeType !== 'knowledge' || edge.source === edge.target) return undefined;
            return { ...edge, id: `related-${edge.source}:${edge.target}`, data: { relation: 'RELATED_TO', label: '关联' } };
          },
          onFinish: (edge: EdgeData) => onRelate(String(edge.source), String(edge.target)),
        },
      ],
      plugins: [
        { type: 'grid-line', size: 32, stroke: '#1E293B', lineWidth: 1 },
      ],
    });

    const stopRender = startGraphRender(
      graph,
      () => {
        setLoading(false);
        graphRef.current = graph;
      },
      () => setLoading(false),
    );
    setLoading(false);

    return () => {
      if (graphRef.current === graph) graphRef.current = null;
      stopRender();
    };
  }, [collapsedCategories, editing, graphData, layout, onRelate, onSelect, selectedId]);

  const focusSelected = () => {
    if (!selectedId || !graphRef.current) return;
    void graphRef.current.focusElement(selectedId, { duration: 420 });
  };

  if (!items.length) {
    return (
      <div className="graph-empty flex flex-col items-center justify-center h-full text-slate-400 gap-2">
        <span className="text-base font-semibold text-slate-200">知识图谱等待首批节点</span>
        <p className="text-sm text-slate-400">记录或收集知识后，系统将自动形成知识实体与关联拓扑。</p>
      </div>
    );
  }

  return (
    <div className="g6-workbench w-full h-full">
      {/* 顶部轻巧操作条 */}
      <div className="g6-commandbar">
        <div className="g6-layout-switch" aria-label="图谱布局">
          {(Object.keys(layoutMeta) as LayoutMode[]).map((mode) => {
            const Icon = layoutMeta[mode].icon;
            return (
              <button
                key={mode}
                className={layout === mode ? 'active' : ''}
                onClick={() => setLayout(mode)}
              >
                <Icon size={14} />
                <span>{layoutMeta[mode].label}</span>
              </button>
            );
          })}
        </div>

        <label className="g6-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索实体、摘要或标签..."
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="清除搜索">
              <X size={14} />
            </button>
          )}
        </label>

        <div className="g6-actions">
          {onExportGraph && (
            <button onClick={onExportGraph} title="导出知识图谱结构数据">
              <Download size={14} />
              <span>导出图谱</span>
            </button>
          )}
          <button
            className={editing ? 'active' : ''}
            onClick={() => setEditing((value) => !value)}
          >
            <Link2 size={14} />
            <span>{editing ? '连线编辑中' : '编辑关系'}</span>
          </button>
          <button disabled={!selectedId} onClick={focusSelected}>
            <Focus size={14} />
            <span>聚焦</span>
          </button>
        </div>
      </div>

      {/* 图谱主视口 */}
      <div className="g6-canvas-shell">
        <div ref={containerRef} className="g6-canvas" aria-label="G6 知识图谱画布" />
        {loading && (
          <div className="g6-loading">
            <LoaderCircle size={22} className="animate-spin text-sky-400" />
            <span className="text-xs text-slate-300">正在编排知识图谱布局...</span>
          </div>
        )}
        {query && !graphData.nodes.length && (
          <div className="g6-no-result">
            <Search size={26} className="text-slate-400" />
            <strong className="text-sm text-slate-200">未找到匹配的知识实体</strong>
            <button onClick={() => setQuery('')} className="text-xs text-sky-400">清除搜索</button>
          </div>
        )}
        <div className="g6-hint">
          <span>拖动画布 · 滚轮缩放</span>
          <span>双击主题分类展开 / 折叠</span>
          <span>{editing ? '拖拽节点即可连线建立关联' : '点击节点查看详细内容'}</span>
        </div>
      </div>
    </div>
  );
}
