/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * BlockSuite / EdgelessEditor 无界白板画布系统
 * 严格按照 EdgelessEditor 规范实现：底部中置悬浮Dock工具栏、文字、图片、便签、日记卡片、自由涂鸦画笔、动态关系连线、自由拖拽与8向缩放
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toPng } from 'html-to-image';
import {
  MousePointer2,
  Hand,
  Type,
  Image as ImageIcon,
  StickyNote,
  PenTool,
  ArrowRight,
  BookOpen,
  BarChart2,
  Code2,
  Save,
  Download,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Grid,
  Sparkles,
  Plus,
  Palette,
  X,
  ChevronLeft,
  ChevronRight,
  Move,
} from 'lucide-react';
import type {
  CanvasItem,
  CanvasItemType,
  CanvasConnector,
  EdgelessToolMode,
  CanvasState,
} from '../../types/canvas';
import type { JournalEntry } from '../../types/journal';
import { CanvasItemRenderer } from './CanvasItemRenderer';

const STORAGE_KEY = 'hk_blocksuite_edgeless_state_v2';

interface FreeformCanvasProps {
  journalEntries?: JournalEntry[];
  onOpenAddJournal?: () => void;
  canvasId?: string;
  initialState?: CanvasState;
  onSaveCanvasState?: (canvasId: string, state: CanvasState) => void;
  isFullScreenMode?: boolean;
}

// 便签常用色板
const STICKY_COLORS = [
  { name: '柠檬黄', color: '#fef08a', text: '#713f12' },
  { name: '樱花粉', color: '#fbcfe8', text: '#831843' },
  { name: '冰川蓝', color: '#bae6fd', text: '#0c4a6e' },
  { name: '薄荷绿', color: '#bbf7d0', text: '#14532d' },
  { name: '香芋紫', color: '#e9d5ff', text: '#581c87' },
];

export const FreeformCanvas: React.FC<FreeformCanvasProps> = ({
  journalEntries = [],
  onOpenAddJournal,
  canvasId,
  initialState,
  onSaveCanvasState,
  isFullScreenMode = false,
}) => {
  // 画布组件列表
  const [items, setItems] = useState<CanvasItem[]>([]);
  // 卡片间关系连线列表
  const [connectors, setConnectors] = useState<CanvasConnector[]>([]);
  // 选中的组件 ID
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // BlockSuite / Edgeless 当前激活工具模式 (默认选择工具)
  const [activeTool, setActiveTool] = useState<EdgelessToolMode>('select');

  // 画布平移与缩放 (Edgeless Viewport)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 网格对齐吸附开关与栅格尺度
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const gridSize = 16;

  // 连线模式暂存起点 ID
  const [connectorStartId, setConnectorStartId] = useState<string | null>(null);

  // 涂鸦画笔模式暂存轨迹
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const isDrawingRef = useRef<boolean>(false);

  // 便签颜色快捷选择弹窗
  const [stickyColorPickerOpen, setStickyColorPickerOpen] = useState<boolean>(false);

  // 日记卡片库抽屉状态
  const [isJournalDrawerOpen, setIsJournalDrawerOpen] = useState<boolean>(false);

  // 保存与提示状态
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string>('');

  // DOM 引用与画布激活状态（点击内部时锁定外部滚动条）
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);
  const imageUploadInputRef = useRef<HTMLInputElement>(null);
  const [isCanvasActive, setIsCanvasActive] = useState<boolean>(false);

  // 拖拽与缩放运行状态
  const dragStateRef = useRef<{
    mode: 'move' | 'resize' | null;
    resizeHandle?: string;
    itemId?: string;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initWidth: number;
    initHeight: number;
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    initWidth: 0,
    initHeight: 0,
  });

  // 显示操作提示
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2400);
  };

  const markDirty = () => {
    setIsSaved(false);
  };

  // 初始化 Edgeless 预设排版（完美复刻用户参考图中的卡片分布与便签关系）
  const getInitialDefaultState = useCallback(() => {
    const defaultItems: CanvasItem[] = [];
    const defaultConnectors: CanvasConnector[] = [];

    // 1. 顶部标题指引文本
    defaultItems.push({
      id: 'block-welcome-text',
      type: 'text',
      x: 60,
      y: 50,
      width: 480,
      height: 80,
      zIndex: 1,
      data: {
        text: '璀璨星图 · EdgelessEditor 自由画布\n文字 · 图片 · 便签 · 自由拖拽 · 缩放 · 关系连线',
        fontSize: 14,
        fontColor: '#334155',
        bgColor: 'rgba(255, 255, 255, 0.7)',
        isBold: true,
      },
    });

    // 2. 日记卡片 1（大模型 Agent 底座思考）
    if (journalEntries.length > 1) {
      defaultItems.push({
        id: `block-journal-${journalEntries[1].id}`,
        type: 'journal',
        x: 60,
        y: 160,
        width: 480,
        height: 440,
        zIndex: 2,
        data: {
          journalId: journalEntries[1].id,
          journalEntry: journalEntries[1],
        },
      });
    }

    // 3. 日记卡片 2（流水线工程重构复盘）
    if (journalEntries.length > 0) {
      defaultItems.push({
        id: `block-journal-${journalEntries[0].id}`,
        type: 'journal',
        x: 580,
        y: 160,
        width: 480,
        height: 440,
        zIndex: 3,
        data: {
          journalId: journalEntries[0].id,
          journalEntry: journalEntries[0],
        },
      });
    }

    // 4. 黄色便签 (Sticky Note - 位于右上)
    defaultItems.push({
      id: 'block-sticky-note',
      type: 'sticky',
      x: 1100,
      y: 60,
      width: 300,
      height: 200,
      zIndex: 4,
      data: {
        noteText: '💡 架构思考备忘：\n- 规范现代浅色科技白蓝渐变\n- 反 AI 模板化\n- 沉淀自定义组件库\n- 衔接知识库实时图谱',
        noteColor: '#fef08a',
      },
    });

    // 5. ECharts 趋势图卡片
    defaultItems.push({
      id: 'block-chart-efficiency',
      type: 'chart',
      x: 1100,
      y: 300,
      width: 450,
      height: 300,
      zIndex: 5,
      data: {
        chartType: 'line',
        chartTitle: '大模型与图谱协同演进效率',
      },
    });

    // 6. 默认建立一条关系连线（卡片1 -> 卡片2）
    if (journalEntries.length > 1) {
      defaultConnectors.push({
        id: 'conn-1',
        fromId: `block-journal-${journalEntries[1].id}`,
        toId: `block-journal-${journalEntries[0].id}`,
        label: '底座驱动流水线',
        color: '#6366f1',
        style: 'smooth',
      });
    }

    return { defaultItems, defaultConnectors };
  }, [journalEntries]);

  // 从本地或外部传入属性加载画布工程
  useEffect(() => {
    if (initialState) {
      setItems(initialState.items || []);
      setConnectors(initialState.connectors || []);
      setZoom(initialState.zoom || 1);
      setPan({ x: initialState.panX || 0, y: initialState.panY || 0 });
      setSnapToGrid(initialState.snapToGrid ?? true);
      setIsSaved(true);
      return;
    }

    try {
      const keyToLoad = canvasId ? `hk_free_canvas_${canvasId}` : STORAGE_KEY;
      const saved = localStorage.getItem(keyToLoad);
      if (saved) {
        const parsed: CanvasState = JSON.parse(saved);
        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
          const updatedItems = parsed.items.map((it) => {
            if (it.type === 'journal' && it.data.journalId) {
              const matched = journalEntries.find((j) => j.id === it.data.journalId);
              if (matched) {
                return { ...it, data: { ...it.data, journalEntry: matched } };
              }
            }
            return it;
          });
          setItems(updatedItems);
          setConnectors(parsed.connectors || []);
          setZoom(parsed.zoom || 1);
          setPan({ x: parsed.panX || 0, y: parsed.panY || 0 });
          setSnapToGrid(parsed.snapToGrid ?? true);
          return;
        }
      }
    } catch {
      // ignore
    }

    const { defaultItems, defaultConnectors } = getInitialDefaultState();
    setItems(defaultItems);
    setConnectors(defaultConnectors);
  }, [canvasId, initialState, getInitialDefaultState, journalEntries]);

  // 保存画布数据至本地存储或外部状态
  const handleSaveEdgeless = useCallback(() => {
    try {
      const stateToSave: CanvasState = {
        items,
        connectors,
        zoom,
        panX: pan.x,
        panY: pan.y,
        snapToGrid,
        gridSize,
        updatedAt: Date.now(),
      };
      if (onSaveCanvasState && canvasId) {
        onSaveCanvasState(canvasId, stateToSave);
      } else {
        const keyToSave = canvasId ? `hk_free_canvas_${canvasId}` : STORAGE_KEY;
        localStorage.setItem(keyToSave, JSON.stringify(stateToSave));
      }
      setIsSaved(true);
      showToast('🟢 自由画布排版已成功保存！');
    } catch {
      showToast('❌ 保存失败，本地存储空间可能不足');
    }
  }, [items, connectors, zoom, pan, snapToGrid, gridSize, onSaveCanvasState, canvasId]);

  // 添加新块至画布中心
  const createBlock = (
    type: CanvasItemType,
    customData: any = {},
    customPos?: { x: number; y: number }
  ) => {
    markDirty();

    const viewportWidth = canvasViewportRef.current?.clientWidth || 1000;
    const viewportHeight = canvasViewportRef.current?.clientHeight || 700;

    const x = customPos
      ? customPos.x
      : Math.round((-pan.x + viewportWidth / 2 - 180) / gridSize) * gridSize;
    const y = customPos
      ? customPos.y
      : Math.round((-pan.y + viewportHeight / 2 - 140) / gridSize) * gridSize;

    let defaultWidth = 320;
    let defaultHeight = 180;

    if (type === 'journal') {
      defaultWidth = 480;
      defaultHeight = 440;
    } else if (type === 'image') {
      defaultWidth = 360;
      defaultHeight = 240;
    } else if (type === 'sticky') {
      defaultWidth = 260;
      defaultHeight = 180;
    } else if (type === 'chart') {
      defaultWidth = 450;
      defaultHeight = 300;
    } else if (type === 'code') {
      defaultWidth = 420;
      defaultHeight = 260;
    }

    const maxZ = items.reduce((max, i) => Math.max(max, i.zIndex), 0);
    const newId = `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newItem: CanvasItem = {
      id: newId,
      type,
      x,
      y,
      width: defaultWidth,
      height: defaultHeight,
      zIndex: maxZ + 1,
      data: customData,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedId(newId);
    setActiveTool('select');
  };

  // 更新单个块的数据
  const updateBlockData = (id: string, newData: any) => {
    markDirty();
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, data: { ...item.data, ...newData } } : item
      )
    );
  };

  // 删除当前选中的块
  const deleteBlock = useCallback(
    (id: string) => {
      markDirty();
      setItems((prev) => prev.filter((i) => i.id !== id));
      // 同步移除相关连线
      setConnectors((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
      showToast('🗑️ 已删除该组件');
    },
    []
  );

  // 克隆复制
  const duplicateBlock = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    markDirty();

    const maxZ = items.reduce((max, i) => Math.max(max, i.zIndex), 0);
    const newId = `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newItem: CanvasItem = {
      ...target,
      id: newId,
      x: target.x + 30,
      y: target.y + 30,
      zIndex: maxZ + 1,
      data: JSON.parse(JSON.stringify(target.data)),
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedId(newId);
  };

  // 置顶 / 置底
  const bringToFront = (id: string) => {
    markDirty();
    const maxZ = items.reduce((max, i) => Math.max(max, i.zIndex), 0);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, zIndex: maxZ + 1 } : item))
    );
  };

  const sendToBack = (id: string) => {
    markDirty();
    const minZ = items.reduce((min, i) => Math.min(min, i.zIndex), 1);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, zIndex: Math.max(0, minZ - 1) } : item))
    );
  };

  // 连线建立处理
  const handleConnectorClick = (targetId: string) => {
    if (!connectorStartId) {
      setConnectorStartId(targetId);
      showToast('已选取起点块，请点击另一个块完成连线');
    } else if (connectorStartId === targetId) {
      setConnectorStartId(null);
      showToast('已取消连线');
    } else {
      markDirty();
      const newConn: CanvasConnector = {
        id: `conn-${Date.now()}`,
        fromId: connectorStartId,
        toId: targetId,
        color: '#6366f1',
        style: 'smooth',
      };
      setConnectors((prev) => [...prev, newConn]);
      setConnectorStartId(null);
      setActiveTool('select');
      showToast('✨ 关系连线已建立！');
    }
  };

  // 导出高清 PNG 图片
  const exportAsPng = async () => {
    if (!canvasContentRef.current) return;
    try {
      showToast('⏳ 正在渲染高清 Edgeless 画布图片...');
      const oldSelected = selectedId;
      setSelectedId(null);

      await new Promise((r) => setTimeout(r, 60));

      const dataUrl = await toPng(canvasContentRef.current, {
        cacheBust: true,
        quality: 0.98,
        backgroundColor: '#f6f8fc',
      });

      const a = document.createElement('a');
      a.download = `BlockSuite_Edgeless_${new Date().toISOString().slice(0, 10)}.png`;
      a.href = dataUrl;
      a.click();

      setSelectedId(oldSelected);
      showToast('🎉 画布已成功导出为图片！');
    } catch {
      showToast('❌ 导出图片失败');
    }
  };

  // 鼠标移动、缩放与画笔逻辑
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. 画布平移 (Hand 模式或中键拖动)
      if (isPanning) {
        const deltaX = e.clientX - panStartRef.current.x;
        const deltaY = e.clientY - panStartRef.current.y;
        setPan((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));
        panStartRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // 2. 涂鸦画笔模式
      if (isDrawingRef.current && activeTool === 'pen') {
        const rect = canvasViewportRef.current?.getBoundingClientRect();
        if (rect) {
          const ptX = (e.clientX - rect.left - pan.x) / zoom;
          const ptY = (e.clientY - rect.top - pan.y) / zoom;
          setDrawingPoints((prev) => [...prev, { x: ptX, y: ptY }]);
        }
        return;
      }

      // 3. 组件拖动与调整大小
      const { mode, itemId, startX, startY, initX, initY, initWidth, initHeight, resizeHandle } =
        dragStateRef.current;
      if (!mode || !itemId) return;

      markDirty();
      const deltaX = (e.clientX - startX) / zoom;
      const deltaY = (e.clientY - startY) / zoom;

      if (mode === 'move') {
        let newX = initX + deltaX;
        let newY = initY + deltaY;

        if (snapToGrid) {
          newX = Math.round(newX / gridSize) * gridSize;
          newY = Math.round(newY / gridSize) * gridSize;
        }

        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, x: newX, y: newY }
              : item
          )
        );
      }

      if (mode === 'resize' && resizeHandle) {
        let newWidth = initWidth;
        let newHeight = initHeight;
        let newX = initX;
        let newY = initY;

        const minW = 120;
        const minH = 80;

        if (resizeHandle.includes('e')) newWidth = Math.max(minW, initWidth + deltaX);
        if (resizeHandle.includes('s')) newHeight = Math.max(minH, initHeight + deltaY);
        if (resizeHandle.includes('w')) {
          const w = Math.max(minW, initWidth - deltaX);
          newX = initX + (initWidth - w);
          newWidth = w;
        }
        if (resizeHandle.includes('n')) {
          const h = Math.max(minH, initHeight - deltaY);
          newY = initY + (initHeight - h);
          newHeight = h;
        }

        if (snapToGrid) {
          newWidth = Math.round(newWidth / gridSize) * gridSize;
          newHeight = Math.round(newHeight / gridSize) * gridSize;
          newX = Math.round(newX / gridSize) * gridSize;
          newY = Math.round(newY / gridSize) * gridSize;
        }

        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, x: newX, y: newY, width: newWidth, height: newHeight }
              : item
          )
        );
      }
    };

    const handleMouseUp = () => {
      dragStateRef.current.mode = null;
      setIsPanning(false);

      // 结束涂鸦并生成画笔组件
      if (isDrawingRef.current && activeTool === 'pen') {
        isDrawingRef.current = false;
        if (drawingPoints.length > 2) {
          markDirty();
          // 计算包围盒
          const minX = Math.min(...drawingPoints.map((p) => p.x));
          const minY = Math.min(...drawingPoints.map((p) => p.y));
          const maxX = Math.max(...drawingPoints.map((p) => p.x));
          const maxY = Math.max(...drawingPoints.map((p) => p.y));

          const normPoints = drawingPoints.map((p) => ({ x: p.x - minX, y: p.y - minY }));
          const maxZ = items.reduce((max, i) => Math.max(max, i.zIndex), 0);

          const newPenItem: CanvasItem = {
            id: `pen-${Date.now()}`,
            type: 'pen',
            x: minX,
            y: minY,
            width: Math.max(40, maxX - minX),
            height: Math.max(40, maxY - minY),
            zIndex: maxZ + 1,
            data: {
              pathPoints: normPoints,
              strokeColor: '#6366f1',
              strokeWidth: 3,
            },
          };
          setItems((prev) => [...prev, newPenItem]);
        }
        setDrawingPoints([]);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, zoom, snapToGrid, gridSize, activeTool, drawingPoints, items]);

  // 全局键盘快捷键（Delete/Backspace 删除选中的块，Esc 取消选择，模式切换）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 若当前焦点在文本输入控件中，不拦截按键
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);
      if (isInput) return;

      // 1. Delete 或 Backspace 键快速删除当前选中的组件
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteBlock(selectedId);
        return;
      }

      // 2. Escape 取消选择与连线
      if (e.key === 'Escape') {
        setSelectedId(null);
        setActiveTool('select');
        setConnectorStartId(null);
        return;
      }

      // 3. 基础模式切换
      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
      if (e.key === 't' || e.key === 'T') setActiveTool('text');
      if (e.key === 's' || e.key === 'S') setActiveTool('sticky');
      if (e.key === 'p' || e.key === 'P') setActiveTool('pen');
      if (e.key === 'c' || e.key === 'C') setActiveTool('connector');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedId, deleteBlock]);

  // 1. 点击画布内部时锁定外部滚动条；点击外部时自动解除锁定
  useEffect(() => {
    const lockExternalScroll = () => {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.style.overflow = 'hidden';
      const pageEl = document.querySelector('.page-container') as HTMLElement | null;
      if (pageEl) pageEl.style.overflow = 'hidden';
    };

    const unlockExternalScroll = () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.style.overflow = '';
      const pageEl = document.querySelector('.page-container') as HTMLElement | null;
      if (pageEl) pageEl.style.overflow = '';
    };

    const handleDocumentMouseDown = (e: MouseEvent) => {
      const root = canvasRootRef.current;
      if (!root) return;

      const isInside = root.contains(e.target as Node);
      if (isInside) {
        setIsCanvasActive(true);
        lockExternalScroll();
      } else {
        setIsCanvasActive(false);
        unlockExternalScroll();
      }
    };

    // 使用捕获阶段确保第一时间捕捉点击
    window.addEventListener('mousedown', handleDocumentMouseDown, true);
    return () => {
      window.removeEventListener('mousedown', handleDocumentMouseDown, true);
      unlockExternalScroll();
    };
  }, []);

  // 2. 原生非 passive 滚轮事件监听：彻底拦截滚动，保障内部优先且绝不穿透至外部
  useEffect(() => {
    const viewport = canvasViewportRef.current;
    if (!viewport) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // (1) 优先对最内部的滚动条起作用：检查事件源向上是否存在内部可滚动容器（卡片内部、textarea、抽屉等）
      let el = e.target as HTMLElement | null;
      while (el && el !== viewport) {
        const isTextarea = el.tagName === 'TEXTAREA';
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;
        const hasScrollY = (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        const hasScrollX = (overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth;

        if (isTextarea || hasScrollY || hasScrollX) {
          // 当前正位于内部滚动容器中：
          // 若已达到边界，阻止默认事件，杜绝浏览器滚动链穿透 (Scroll Chaining) 到外层页面
          const isAtTop = el.scrollTop <= 0 && e.deltaY < 0;
          const isAtBottom = Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight) < 2 && e.deltaY > 0;
          if (isAtTop || isAtBottom) {
            e.preventDefault();
          }
          e.stopPropagation();
          return;
        }
        el = el.parentElement;
      }

      // (2) 属于画布主视口的缩放或平移：百分之百阻止外部页面滚动条起作用
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        setZoom((prev) => Math.min(2.5, Math.max(0.3, prev * zoomFactor)));
      } else {
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    viewport.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  // 画布空白区域点击
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // 快捷键中键或手势工具平移
    if (e.button === 1 || activeTool === 'hand' || e.altKey) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 涂鸦模式
    if (activeTool === 'pen') {
      isDrawingRef.current = true;
      const rect = canvasViewportRef.current?.getBoundingClientRect();
      if (rect) {
        const ptX = (e.clientX - rect.left - pan.x) / zoom;
        const ptY = (e.clientY - rect.top - pan.y) / zoom;
        setDrawingPoints([{ x: ptX, y: ptY }]);
      }
      return;
    }

    // 文字工具模式：点击画布任意位置快速置入文本
    if (activeTool === 'text') {
      const rect = canvasViewportRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = Math.round(((e.clientX - rect.left - pan.x) / zoom) / gridSize) * gridSize;
        const clickY = Math.round(((e.clientY - rect.top - pan.y) / zoom) / gridSize) * gridSize;
        createBlock(
          'text',
          { text: '双击输入文本内容...', fontSize: 14, fontColor: '#0f172a', isBold: false },
          { x: clickX, y: clickY }
        );
      }
      return;
    }

    // 便签工具模式：点击画布任意位置快速放置便签
    if (activeTool === 'sticky') {
      const rect = canvasViewportRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = Math.round(((e.clientX - rect.left - pan.x) / zoom) / gridSize) * gridSize;
        const clickY = Math.round(((e.clientY - rect.top - pan.y) / zoom) / gridSize) * gridSize;
        createBlock(
          'sticky',
          { noteText: '记录灵感...', noteColor: '#fef08a' },
          { x: clickX, y: clickY }
        );
      }
      return;
    }

    // 空白处点击取消选择
    setSelectedId(null);
  };

  const selectedItem = items.find((i) => i.id === selectedId);

  return (
    <div
      ref={canvasRootRef}
      tabIndex={0}
      className={`relative w-full h-full select-none flex overscroll-contain focus:outline-none transition-shadow ${
        isFullScreenMode
          ? 'min-h-full rounded-none border-none shadow-none bg-[#f6f8fc]'
          : 'min-h-[520px] rounded-3xl overflow-hidden border border-white/80 shadow-[0_12px_40px_rgba(24,39,75,0.06)] bg-[#f6f8fc]'
      } ${
        isCanvasActive ? 'ring-2 ring-indigo-500/20' : ''
      }`}
    >
      {/* 隐藏的文件输入组件 */}
      <input
        ref={imageUploadInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            Array.from(files).forEach((file) => {
              const reader = new FileReader();
              reader.onload = (event) => {
                const base64Url = event.target?.result as string;
                if (base64Url) {
                  createBlock('image', {
                    imageUrl: base64Url,
                    imageAlt: file.name,
                    objectFit: 'cover',
                  });
                }
              };
              reader.readAsDataURL(file);
            });
            e.target.value = '';
          }
        }}
      />

      {/* ====================================================================
          1. 顶部 Edgeless 状态栏 (保存指示 · 保存排版 · 导出图片 · 重置)
          ==================================================================== */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 z-40 flex items-center gap-2"
      >
        {/* 画布聚焦锁定指示 */}
        {isCanvasActive && (
          <div className="hidden sm:flex px-2.5 py-1 rounded-2xl bg-indigo-50/90 text-indigo-700 border border-indigo-200/80 shadow-2xs text-[11px] font-medium items-center gap-1 animate-in fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            <span>画布已激活 · 外部滚动已锁定</span>
          </div>
        )}

        {/* 保存状态指示 */}
        <div className="px-3 py-1.5 rounded-2xl bg-white/80 backdrop-blur-xl border border-white shadow-xs text-xs flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isSaved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
            }`}
          />
          <span className="text-slate-600 font-medium">
            {isSaved ? '已保存至本地' : '未保存更改'}
          </span>
        </div>

        {/* 手动保存 */}
        <button
          type="button"
          onClick={handleSaveEdgeless}
          className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          title="保存 Edgeless 画布状态"
        >
          <Save size={13} />
          <span>保存排版</span>
        </button>

        {/* 导出高清 PNG 图片 */}
        <button
          type="button"
          onClick={exportAsPng}
          className="px-3.5 py-1.5 rounded-2xl bg-white/80 hover:bg-white backdrop-blur-xl border border-white text-slate-700 shadow-xs text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          title="导出画布为高清 PNG 图片"
        >
          <Download size={13} />
          <span>导出图片</span>
        </button>

        {/* 重置 */}
        <button
          type="button"
          onClick={() => {
            if (window.confirm('确定恢复为 BlockSuite Edgeless 预设排版吗？')) {
              markDirty();
              const { defaultItems, defaultConnectors } = getInitialDefaultState();
              setItems(defaultItems);
              setConnectors(defaultConnectors);
              setSelectedId(null);
              setPan({ x: 0, y: 0 });
              setZoom(1);
            }
          }}
          className="p-1.5 rounded-xl bg-white/80 hover:bg-white border border-white text-slate-500 hover:text-slate-800 shadow-xs transition-all cursor-pointer"
          title="重置为默认白板"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* ====================================================================
          2. BlockSuite Edgeless 主画布交互视口 (Dot Grid & Infinite Viewport)
          ==================================================================== */}
      <div
        ref={canvasViewportRef}
        onMouseDown={handleCanvasMouseDown}
        className={`flex-1 h-full relative overflow-hidden overscroll-contain ${
          activeTool === 'hand' || isPanning
            ? 'cursor-grab active:cursor-grabbing'
            : activeTool === 'pen'
            ? 'cursor-crosshair'
            : activeTool === 'text'
            ? 'cursor-text'
            : 'cursor-default'
        }`}
        style={{
          backgroundImage: snapToGrid
            ? 'radial-gradient(circle, rgba(148, 163, 184, 0.28) 1.2px, transparent 1.2px)'
            : 'none',
          backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* 画布缩放平移图层 */}
        <div
          ref={canvasContentRef}
          className="absolute origin-top-left will-change-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: '4500px',
            height: '3200px',
          }}
        >
          {/* A. 关系连线 SVG 渲染层 (Connectors / Dynamic Arrows) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
            <defs>
              <marker
                id="edgeless-arrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#6366f1" />
              </marker>
            </defs>

            {connectors.map((conn) => {
              const fromItem = items.find((i) => i.id === conn.fromId);
              const toItem = items.find((i) => i.id === conn.toId);
              if (!fromItem || !toItem) return null;

              // 计算两块中心点
              const fromCenterX = fromItem.x + fromItem.width / 2;
              const fromCenterY = fromItem.y + fromItem.height / 2;
              const toCenterX = toItem.x + toItem.width / 2;
              const toCenterY = toItem.y + toItem.height / 2;

              // 生成平滑贝塞尔曲线
              const dx = toCenterX - fromCenterX;
              const dy = toCenterY - fromCenterY;
              const pathD = `M ${fromCenterX} ${fromCenterY} C ${fromCenterX + dx / 2} ${fromCenterY}, ${toCenterX - dx / 2} ${toCenterY}, ${toCenterX} ${toCenterY}`;

              return (
                <g key={conn.id} className="transition-all">
                  <path
                    d={pathD}
                    fill="none"
                    stroke={conn.color || '#6366f1'}
                    strokeWidth={2.5}
                    strokeDasharray={conn.style === 'dashed' ? '6,6' : 'none'}
                    markerEnd="url(#edgeless-arrow)"
                  />
                  {conn.label && (
                    <text
                      x={(fromCenterX + toCenterX) / 2}
                      y={(fromCenterY + toCenterY) / 2 - 8}
                      fill="#4f46e5"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="select-none bg-white font-sans"
                    >
                      {conn.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 正在涂鸦中的临时笔迹 */}
            {drawingPoints.length > 1 && (
              <path
                d={drawingPoints.reduce(
                  (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
                  ''
                )}
                fill="none"
                stroke="#6366f1"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          {/* B. 块对象列表 (Blocks on Edgeless Surface) */}
          {items.map((item) => {
            const isSelected = item.id === selectedId;

            return (
              <div
                key={item.id}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (activeTool === 'connector') {
                    handleConnectorClick(item.id);
                  } else {
                    setSelectedId(item.id);
                    dragStateRef.current = {
                      mode: 'move',
                      itemId: item.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initX: item.x,
                      initY: item.y,
                      initWidth: item.width,
                      initHeight: item.height,
                    };
                  }
                }}
                className={`absolute transition-shadow group/item ${
                  connectorStartId === item.id
                    ? 'ring-4 ring-indigo-500 shadow-2xl animate-pulse'
                    : isSelected
                    ? 'ring-2 ring-indigo-500 shadow-xl'
                    : 'hover:ring-1 hover:ring-indigo-300/80 shadow-md'
                }`}
                style={{
                  transform: `translate(${item.x}px, ${item.y}px)`,
                  width: `${item.width}px`,
                  height: `${item.height}px`,
                  zIndex: item.zIndex,
                }}
              >
                {/* 块内容渲染器 */}
                <CanvasItemRenderer
                  item={item}
                  isSelected={isSelected}
                  onUpdateData={updateBlockData}
                />

                {/* 选中态：8 向微调手柄 (Resize Handles) */}
                {isSelected && activeTool === 'select' && (
                  <>
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        dragStateRef.current = {
                          mode: 'resize',
                          resizeHandle: 'nw',
                          itemId: item.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          initX: item.x,
                          initY: item.y,
                          initWidth: item.width,
                          initHeight: item.height,
                        };
                      }}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize z-50 shadow-xs"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        dragStateRef.current = {
                          mode: 'resize',
                          resizeHandle: 'ne',
                          itemId: item.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          initX: item.x,
                          initY: item.y,
                          initWidth: item.width,
                          initHeight: item.height,
                        };
                      }}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize z-50 shadow-xs"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        dragStateRef.current = {
                          mode: 'resize',
                          resizeHandle: 'se',
                          itemId: item.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          initX: item.x,
                          initY: item.y,
                          initWidth: item.width,
                          initHeight: item.height,
                        };
                      }}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize z-50 shadow-xs"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        dragStateRef.current = {
                          mode: 'resize',
                          resizeHandle: 'sw',
                          itemId: item.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          initX: item.x,
                          initY: item.y,
                          initWidth: item.width,
                          initHeight: item.height,
                        };
                      }}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize z-50 shadow-xs"
                    />
                    {/* 四边 */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        dragStateRef.current = {
                          mode: 'resize',
                          resizeHandle: 'n',
                          itemId: item.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          initX: item.x,
                          initY: item.y,
                          initWidth: item.width,
                          initHeight: item.height,
                        };
                      }}
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border-2 border-indigo-600 rounded-full cursor-ns-resize z-50 shadow-xs"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        dragStateRef.current = {
                          mode: 'resize',
                          resizeHandle: 's',
                          itemId: item.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          initX: item.x,
                          initY: item.y,
                          initWidth: item.width,
                          initHeight: item.height,
                        };
                      }}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border-2 border-indigo-600 rounded-full cursor-ns-resize z-50 shadow-xs"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        dragStateRef.current = {
                          mode: 'resize',
                          resizeHandle: 'w',
                          itemId: item.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          initX: item.x,
                          initY: item.y,
                          initWidth: item.width,
                          initHeight: item.height,
                        };
                      }}
                      className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-ew-resize z-50 shadow-xs"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        dragStateRef.current = {
                          mode: 'resize',
                          resizeHandle: 'e',
                          itemId: item.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          initX: item.x,
                          initY: item.y,
                          initWidth: item.width,
                          initHeight: item.height,
                        };
                      }}
                      className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-ew-resize z-50 shadow-xs"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* 选中的块悬浮菜单 (Block Context Actions) */}
        {selectedItem && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-xl border border-white/90 rounded-2xl shadow-xl px-3 py-1.5 flex items-center gap-2 text-xs animate-in fade-in zoom-in-95 pointer-events-auto"
          >
            <span className="font-semibold text-slate-700 px-1 border-r border-slate-200">
              {selectedItem.type === 'text' && '文字块'}
              {selectedItem.type === 'image' && '图片块'}
              {selectedItem.type === 'journal' && '日记卡片'}
              {selectedItem.type === 'sticky' && '便签'}
              {selectedItem.type === 'chart' && '图表'}
              {selectedItem.type === 'code' && '代码块'}
              {selectedItem.type === 'pen' && '画笔轨迹'}
            </span>

            {/* 如果是便签，提供调色盘 */}
            {selectedItem.type === 'sticky' && (
              <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                {STICKY_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateBlockData(selectedItem.id, { noteColor: c.color });
                    }}
                    className="w-4 h-4 rounded-full border border-black/10 hover:scale-125 transition-transform cursor-pointer"
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* 置顶与置底 */}
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                bringToFront(selectedItem.id);
              }}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="置于顶层"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                sendToBack(selectedItem.id);
              }}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="置于底层"
            >
              <ArrowDown size={14} />
            </button>

            {/* 复制 */}
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                duplicateBlock(selectedItem.id);
              }}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="克隆复制"
            >
              <Copy size={14} />
            </button>

            {/* 删除 */}
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                deleteBlock(selectedItem.id);
              }}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
              title="删除组件 (Delete)"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}

        {/* ====================================================================
            3. BlockSuite 经典底部中置悬浮工具栏 (Bottom Center Floating Dock Toolbar)
            包含：选择 · 漫游抓手 · 文字 · 便签 · 图片 · 日记 · 图表 · 画笔 · 连线
            ==================================================================== */}
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 bg-white/85 backdrop-blur-2xl border border-white/90 rounded-2xl shadow-[0_12px_32px_rgba(24,39,75,0.12)] p-1.5 flex items-center gap-1 text-slate-700"
        >
          {/* 选择工具 (V) */}
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
              activeTool === 'select'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:bg-slate-100/80 text-slate-600'
            }`}
            title="选择与变换工具 (V)"
          >
            <MousePointer2 size={16} />
            <span className="hidden md:inline">选择</span>
          </button>

          {/* 漫游抓手 (H) */}
          <button
            type="button"
            onClick={() => setActiveTool('hand')}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
              activeTool === 'hand'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:bg-slate-100/80 text-slate-600'
            }`}
            title="漫游抓手工具 (H)"
          >
            <Hand size={16} />
            <span className="hidden md:inline">漫游</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-0.5" />

          {/* 文字 (T) */}
          <button
            type="button"
            onClick={() => {
              createBlock('text', {
                text: '双击输入文字内容...',
                fontSize: 15,
                fontColor: '#0f172a',
                isBold: false,
              });
            }}
            className="p-2 rounded-xl hover:bg-slate-100/80 text-slate-700 transition-all cursor-pointer flex items-center gap-1 text-xs font-medium"
            title="添加文字卡片 (T)"
          >
            <Type size={16} className="text-indigo-600" />
            <span className="hidden md:inline">文字</span>
          </button>

          {/* 便签 (S) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setStickyColorPickerOpen(!stickyColorPickerOpen)}
              className="p-2 rounded-xl hover:bg-slate-100/80 text-slate-700 transition-all cursor-pointer flex items-center gap-1 text-xs font-medium"
              title="添加灵感便签 (S)"
            >
              <StickyNote size={16} className="text-amber-500" />
              <span className="hidden md:inline">便签</span>
            </button>

            {stickyColorPickerOpen && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xl border border-white/90 rounded-2xl shadow-xl p-2 flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                {STICKY_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      createBlock('sticky', {
                        noteText: '记录灵感...',
                        noteColor: c.color,
                      });
                      setStickyColorPickerOpen(false);
                    }}
                    className="w-6 h-6 rounded-full border border-black/10 hover:scale-115 transition-transform"
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 图片 (I) */}
          <button
            type="button"
            onClick={() => imageUploadInputRef.current?.click()}
            className="p-2 rounded-xl hover:bg-slate-100/80 text-slate-700 transition-all cursor-pointer flex items-center gap-1 text-xs font-medium"
            title="上传并置入图片 (I)"
          >
            <ImageIcon size={16} className="text-sky-600" />
            <span className="hidden md:inline">图片</span>
          </button>

          {/* 日记卡片 (Doc) */}
          <button
            type="button"
            onClick={() => setIsJournalDrawerOpen(!isJournalDrawerOpen)}
            className="p-2 rounded-xl hover:bg-slate-100/80 text-slate-700 transition-all cursor-pointer flex items-center gap-1 text-xs font-medium"
            title="置入已有工作日记卡片"
          >
            <BookOpen size={16} className="text-emerald-600" />
            <span className="hidden md:inline">日记卡片</span>
          </button>

          {/* ECharts 图表 */}
          <button
            type="button"
            onClick={() =>
              createBlock('chart', {
                chartType: 'line',
                chartTitle: '效能演进趋势折线',
              })
            }
            className="p-2 rounded-xl hover:bg-slate-100/80 text-slate-700 transition-all cursor-pointer flex items-center gap-1 text-xs font-medium"
            title="添加 ECharts 分析图表"
          >
            <BarChart2 size={16} className="text-cyan-600" />
            <span className="hidden md:inline">图表</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-0.5" />

          {/* 自由画笔 (P) */}
          <button
            type="button"
            onClick={() => {
              setActiveTool(activeTool === 'pen' ? 'select' : 'pen');
              if (activeTool !== 'pen') showToast('已开启自由涂鸦画笔，按住鼠标在画布上拖动即可绘制');
            }}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
              activeTool === 'pen'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:bg-slate-100/80 text-slate-600'
            }`}
            title="自由涂鸦画笔 (P)"
          >
            <PenTool size={16} />
            <span className="hidden md:inline">画笔</span>
          </button>

          {/* 关系连线 (C) */}
          <button
            type="button"
            onClick={() => {
              setActiveTool(activeTool === 'connector' ? 'select' : 'connector');
              setConnectorStartId(null);
              if (activeTool !== 'connector') showToast('已开启关系连线模式，请依次点击两个卡片');
            }}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
              activeTool === 'connector'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:bg-slate-100/80 text-slate-600'
            }`}
            title="卡片关系连线工具 (C)"
          >
            <ArrowRight size={16} />
            <span className="hidden md:inline">连线</span>
          </button>
        </div>

        {/* ====================================================================
            4. 右下角视口漫游与网格控制 (Zoom & Grid Controls)
            ==================================================================== */}
        <div className="absolute bottom-5 right-5 z-40 bg-white/85 backdrop-blur-xl border border-white/90 rounded-2xl shadow-lg p-1.5 flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(0.3, prev - 0.1))}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            title="缩小"
          >
            <ZoomOut size={15} />
          </button>
          <span className="w-12 text-center font-mono font-bold text-slate-700 text-xs">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(2.5, prev + 0.1))}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            title="放大"
          >
            <ZoomIn size={15} />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
            title="还原 100% 视角"
          >
            还原
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-1.5 rounded-lg transition-colors ${
              snapToGrid ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-400 hover:bg-slate-100'
            }`}
            title={snapToGrid ? '网格对齐: 开启' : '网格对齐: 关闭'}
          >
            <Grid size={15} />
          </button>
        </div>

        {/* ====================================================================
            5. 已有日记卡片快速引入抽屉 (Journal Drawer)
            ==================================================================== */}
        {isJournalDrawerOpen && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 left-4 z-40 w-72 max-h-[calc(100%-80px)] bg-white/90 backdrop-blur-2xl border border-white/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-4"
          >
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen size={14} className="text-indigo-600" />
                置入已有日记 ({journalEntries.length})
              </span>
              <button
                type="button"
                onClick={() => setIsJournalDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            </div>

            <div
              onWheel={(e) => e.stopPropagation()}
              className="p-3 overflow-y-auto space-y-2 flex-1 overscroll-contain"
            >
              <p className="text-[11px] text-slate-400 leading-tight mb-2">
                点击卡片即可将其以 Block 块级组件形式添加到白板上：
              </p>
              {journalEntries.map((j) => (
                <div
                  key={j.id}
                  onClick={() => {
                    createBlock('journal', {
                      journalId: j.id,
                      journalEntry: j,
                    });
                    setIsJournalDrawerOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-white/80 hover:bg-white border border-slate-200/80 hover:border-indigo-400 shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold">
                      {j.date}
                    </span>
                    <Plus size={13} className="text-slate-400 group-hover:text-indigo-600" />
                  </div>
                  <h6 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600">
                    {j.title}
                  </h6>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {j.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 提示消息 Toast */}
        {toastMessage && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
};
