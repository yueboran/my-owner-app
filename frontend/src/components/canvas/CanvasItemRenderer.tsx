/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 自由画布单组件渲染器 (支持文本、图片、日记复盘卡片、便利贴、ECharts图表与代码块)
 */

import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Sparkles,
  Calendar,
  Pin,
  Image as ImageIcon,
  Code2,
  FileText,
  BarChart2,
  StickyNote,
  ExternalLink,
} from 'lucide-react';
import type { CanvasItem, CanvasItemData } from '../../types/canvas';
import { JOURNAL_CATEGORIES, MOOD_CONFIGS, WEATHER_CONFIGS } from '../../types/journal';
import { CardBlockEditor } from '../journal/CardBlockEditor';

interface CanvasItemRendererProps {
  item: CanvasItem;
  isSelected: boolean;
  onUpdateData: (id: string, newData: Partial<CanvasItemData>) => void;
}

export const CanvasItemRenderer: React.FC<CanvasItemRendererProps> = ({
  item,
  isSelected,
  onUpdateData,
}) => {
  const [isEditingText, setIsEditingText] = useState(false);

  // 1. 渲染文本区组件 (Text Block)
  if (item.type === 'text') {
    const {
      text = '点击双击编辑文本内容...',
      fontSize = 14,
      fontColor = '#1e293b',
      bgColor = 'transparent',
      textAlign = 'left',
      isBold = false,
    } = item.data;

    if (isEditingText) {
      return (
        <div className="w-full h-full p-2 flex flex-col">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => onUpdateData(item.id, { text: e.target.value })}
            onBlur={() => setIsEditingText(false)}
            className="w-full h-full p-2 bg-white/90 border border-blue-400 rounded-lg outline-none resize-none text-xs leading-relaxed font-sans shadow-inner"
            style={{ fontSize: `${fontSize}px`, color: fontColor }}
          />
        </div>
      );
    }

    return (
      <div
        onDoubleClick={() => setIsEditingText(true)}
        className="w-full h-full p-3 select-none flex flex-col justify-start overflow-hidden rounded-xl cursor-text"
        style={{
          backgroundColor: bgColor,
          textAlign,
        }}
        title="双击进行编辑"
      >
        <p
          className="whitespace-pre-line leading-relaxed m-0 break-words"
          style={{
            fontSize: `${fontSize}px`,
            color: fontColor,
            fontWeight: isBold ? 700 : 400,
          }}
        >
          {text || '双击输入文本...'}
        </p>
      </div>
    );
  }

  // 2. 渲染图片组件 (Image Block)
  if (item.type === 'image') {
    const {
      imageUrl,
      imageAlt = '画布图片',
      objectFit = 'cover',
      borderRadius = 12,
    } = item.data;

    if (!imageUrl) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100/80 border-2 border-dashed border-stone-300 rounded-xl p-4 text-stone-400">
          <ImageIcon size={28} className="mb-1 text-stone-400" />
          <span className="text-xs font-medium">暂无图片</span>
          <span className="text-[10px] text-stone-400 mt-0.5">请在工具栏上传或输入图片链接</span>
        </div>
      );
    }

    return (
      <div
        className="w-full h-full overflow-hidden relative group"
        style={{ borderRadius: `${borderRadius}px` }}
      >
        <img
          src={imageUrl}
          alt={imageAlt}
          className="w-full h-full pointer-events-none select-none"
          style={{ objectFit }}
          draggable={false}
        />
      </div>
    );
  }

  // 3. 渲染日记卡片组件 (Journal Card - 完美复刻参考图)
  if (item.type === 'journal') {
    const entry = item.data.journalEntry;
    if (!entry) {
      return (
        <div className="w-full h-full p-4 bg-white/80 rounded-2xl border border-stone-200 flex items-center justify-center text-xs text-stone-400">
          未关联有效日记卡片
        </div>
      );
    }

    const catConfig =
      JOURNAL_CATEGORIES.find((c) => c.id === entry.category) || JOURNAL_CATEGORIES[0];
    const moodObj = MOOD_CONFIGS.find((m) => m.id === entry.mood);
    const weatherObj = WEATHER_CONFIGS.find((w) => w.id === entry.weather);

    return (
      <div className="w-full h-full bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/90 shadow-sm flex flex-col justify-between overflow-hidden select-none">
        {/* 卡片顶端色彩指示条 */}
        <div
          className="h-1.5 w-full shrink-0"
          style={{ backgroundColor: entry.isPinned ? '#f59e0b' : catConfig.color }}
        />

        {/* 头部元信息 */}
        <div className="p-3.5 pb-2 flex items-center justify-between gap-2 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catConfig.badgeClass}`}
            >
              {catConfig.label}
            </span>

            <span className="text-[10px] font-medium text-stone-500 bg-stone-50 border border-stone-200/70 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
              <Calendar size={10} className="text-stone-400" />
              {entry.date}
            </span>

            {moodObj && (
              <span className="text-xs" title={`心情：${moodObj.label}`}>
                {moodObj.emoji}
              </span>
            )}

            {weatherObj && (
              <span className="text-xs" title={`天气：${weatherObj.label}`}>
                {weatherObj.emoji}
              </span>
            )}
          </div>

          {entry.isPinned && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
              <Pin size={9} className="fill-amber-600" />
              置顶
            </span>
          )}
        </div>

        {/* 日记标题与块编辑器内容 (阻止滚轮穿透，确保优先滚动卡片内部且不泄漏至外部) */}
        <div
          onWheel={(e) => {
            e.stopPropagation();
            const target = e.currentTarget;
            const isAtTop = target.scrollTop <= 0 && e.deltaY < 0;
            const isAtBottom =
              Math.abs(target.scrollTop + target.clientHeight - target.scrollHeight) < 2 &&
              e.deltaY > 0;
            if (isAtTop || isAtBottom) {
              e.preventDefault();
            }
          }}
          className="p-3.5 flex-1 overflow-y-auto overscroll-contain select-text"
        >
          <CardBlockEditor
            entry={entry}
            onUpdateEntry={(updated) => {
              onUpdateData(item.id, {
                journalEntry: {
                  ...entry,
                  ...updated,
                },
              });
            }}
          />
        </div>

        {/* 底部信息条 */}
        <div className="px-3.5 py-1.5 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400 shrink-0">
          <span>工作日记同步卡片</span>
          <span className="text-blue-600 font-medium flex items-center gap-0.5">
            璀璨星图 <Sparkles size={10} />
          </span>
        </div>
      </div>
    );
  }

  // 4. 渲染便签贴纸 (Sticky Note)
  if (item.type === 'sticky') {
    const { noteText = '随手记录闪光灵感...', noteColor = '#fef08a' } = item.data;

    return (
      <div
        className="w-full h-full p-4 shadow-md rounded-2xl flex flex-col justify-between select-none relative overflow-hidden transition-transform"
        style={{
          backgroundColor: noteColor,
          color: '#422006',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-4 bg-black/5" />
        <div className="flex items-center gap-1 text-[11px] font-bold opacity-60 mb-1">
          <StickyNote size={12} />
          <span>灵感便签</span>
        </div>
        <textarea
          value={noteText}
          onChange={(e) => onUpdateData(item.id, { noteText: e.target.value })}
          onWheel={(e) => e.stopPropagation()}
          className="w-full flex-1 bg-transparent border-none outline-none resize-none text-xs leading-relaxed font-sans font-medium text-amber-950 overscroll-contain"
          placeholder="在此输入便签内容..."
        />
      </div>
    );
  }

  // 5. 渲染高级外部图表组件 (ECharts)
  if (item.type === 'chart') {
    const {
      chartType = 'line',
      chartTitle = '效能指标分析',
      chartData = {
        categories: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        series: [
          { name: '代码产出', data: [120, 180, 150, 240, 210, 310, 280] },
          { name: '攻坚复盘', data: [80, 110, 95, 170, 160, 230, 200] },
        ],
      },
    } = item.data;

    // ECharts 配置生成
    const getOption = () => {
      if (chartType === 'bar') {
        return {
          title: {
            text: chartTitle,
            textStyle: { fontSize: 13, color: '#1e293b', fontWeight: 'bold' },
            left: 10,
            top: 8,
          },
          tooltip: { trigger: 'axis' },
          grid: { left: '8%', right: '8%', bottom: '15%', top: '25%' },
          xAxis: {
            type: 'category',
            data: chartData.categories,
            axisLabel: { fontSize: 10, color: '#64748b' },
          },
          yAxis: {
            type: 'value',
            axisLabel: { fontSize: 10, color: '#64748b' },
            splitLine: { lineStyle: { stroke: '#f1f5f9' } },
          },
          series: chartData.series.map((s, idx) => ({
            name: s.name,
            type: 'bar',
            data: s.data,
            itemStyle: {
              borderRadius: [4, 4, 0, 0],
              color: idx === 0 ? '#4f46e5' : '#06b6d4',
            },
          })),
        };
      }

      if (chartType === 'pie') {
        return {
          title: {
            text: chartTitle,
            textStyle: { fontSize: 13, color: '#1e293b', fontWeight: 'bold' },
            left: 10,
            top: 8,
          },
          tooltip: { trigger: 'item' },
          series: [
            {
              type: 'pie',
              radius: ['40%', '70%'],
              center: ['50%', '55%'],
              itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
              data: [
                { value: 45, name: '核心功能架构' },
                { value: 25, name: '性能与渲染调优' },
                { value: 20, name: 'AI工作流衔接' },
                { value: 10, name: '缺陷修复' },
              ],
            },
          ],
        };
      }

      // 默认平滑折线图
      return {
        title: {
          text: chartTitle,
          textStyle: { fontSize: 13, color: '#1e293b', fontWeight: 'bold' },
          left: 10,
          top: 8,
        },
        tooltip: { trigger: 'axis' },
        grid: { left: '8%', right: '8%', bottom: '15%', top: '25%' },
        xAxis: {
          type: 'category',
          data: chartData.categories,
          axisLabel: { fontSize: 10, color: '#64748b' },
        },
        yAxis: {
          type: 'value',
          axisLabel: { fontSize: 10, color: '#64748b' },
          splitLine: { lineStyle: { stroke: '#f1f5f9' } },
        },
        series: chartData.series.map((s, idx) => ({
          name: s.name,
          type: 'line',
          smooth: true,
          data: s.data,
          lineStyle: { width: 3, color: idx === 0 ? '#4f46e5' : '#8b5cf6' },
          itemStyle: { color: idx === 0 ? '#4f46e5' : '#8b5cf6' },
          areaStyle: {
            color:
              idx === 0
                ? 'rgba(79, 70, 229, 0.12)'
                : 'rgba(139, 92, 246, 0.08)',
          },
        })),
      };
    };

    return (
      <div className="w-full h-full bg-white/90 backdrop-blur-md rounded-2xl border border-stone-200/90 shadow-sm p-2 flex flex-col justify-between overflow-hidden select-none">
        <div className="flex-1 w-full h-full min-h-0">
          <ReactECharts
            option={getOption()}
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      </div>
    );
  }

  // 6. 渲染代码块组件 (Code Editor Block)
  if (item.type === 'code') {
    const {
      codeContent = `// 璀璨星图 · 核心流水线初始化\nconst pipeline = new StarmapPipeline({\n  canvasMode: "freeform",\n  snapToGrid: true,\n  theme: "light-glass",\n});\nawait pipeline.start();`,
      codeLanguage = 'typescript',
    } = item.data;

    return (
      <div className="w-full h-full bg-[#1e1e2e] text-[#cdd6f4] rounded-2xl border border-[#313244] shadow-md flex flex-col overflow-hidden select-none font-mono text-xs">
        <div className="px-3 py-1.5 bg-[#181825] border-b border-[#313244] flex items-center justify-between text-[10px] text-[#a6adc8]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f38ba8] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f9e2af] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#a6e3a1] inline-block" />
            <span className="ml-2 font-bold uppercase">{codeLanguage}</span>
          </div>
          <Code2 size={12} />
        </div>
        <textarea
          value={codeContent}
          onChange={(e) => onUpdateData(item.id, { codeContent: e.target.value })}
          onWheel={(e) => e.stopPropagation()}
          className="w-full flex-1 p-3 bg-transparent border-none outline-none resize-none text-[11px] font-mono leading-relaxed text-[#cdd6f4] overscroll-contain"
          spellCheck={false}
        />
      </div>
    );
  }

  // 7. 渲染自由画笔轨迹 (Pen / Freehand Stroke)
  if (item.type === 'pen') {
    const { pathPoints = [], strokeColor = '#4f46e5', strokeWidth = 3 } = item.data;
    if (pathPoints.length < 2) return null;

    const pathD = pathPoints.reduce(
      (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
      ''
    );

    return (
      <svg className="w-full h-full overflow-visible pointer-events-none">
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <div className="w-full h-full p-2 bg-stone-100 rounded-xl flex items-center justify-center text-xs text-stone-500">
      未知组件类型: {item.type}
    </div>
  );
};
