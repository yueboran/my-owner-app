import React, { useState } from 'react';
import KnowledgeGraph from '../KnowledgeGraph';
import type { KnowledgeItem } from '../../knowledgeTypes';

interface ExploreViewProps {
  items: KnowledgeItem[];
  onExportGraph: () => void;
  onToast: (text: string) => void;
}

/**
 * 知识图谱视图组件
 * 画布占据全部空间，提供全屏沉浸式的知识拓扑与语义关系浏览体验
 */
export const ExploreView: React.FC<ExploreViewProps> = ({ items, onExportGraph, onToast }) => {
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const selectedItem = items.find((item) => item.id === selectedId);

  return (
    <div className="w-full h-full flex-1 relative flex flex-col overflow-hidden bg-[#0A0F1D]">
      {/* 知识图谱主画布组件（全幅铺满） */}
      <KnowledgeGraph
        items={items}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        onRelate={() => {
          onToast('已在知识图谱中建立关联连接');
        }}
        onExportGraph={onExportGraph}
      />

      {/* 悬浮选中的实体卡片（右下角轻巧展示，不阻挡画布主体视线） */}
      {selectedItem && (
        <div className="absolute bottom-5 right-5 max-w-sm bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-slate-700/80 shadow-2xl text-white z-20 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-sky-400 bg-sky-950/80 border border-sky-800/60 px-2 py-0.5 rounded">
              {selectedItem.category}
            </span>
            <button
              type="button"
              onClick={() => setSelectedId(undefined)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
              title="关闭详情卡片"
            >
              ✕
            </button>
          </div>
          <h4 className="text-[15px] font-semibold text-white mb-1.5 leading-snug">
            {selectedItem.title}
          </h4>
          <p className="text-[13px] text-slate-300 line-clamp-4 leading-relaxed">
            {selectedItem.summary || selectedItem.content}
          </p>
        </div>
      )}
    </div>
  );
};

export default ExploreView;
