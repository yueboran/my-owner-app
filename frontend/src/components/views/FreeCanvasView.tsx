/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 自由画布独立页面 (Freeform Edgeless Canvas View)
 * 特性：
 * 1. 独立占据全部页面，极致无界全景画布沉浸体验
 * 2. 左侧配备可折叠/展开的画布管理侧栏（复刻图 2 时间分组：今天、7天内、30天内）
 * 3. 支持新建画布、保存排版、内联重命名编辑、复制副本与删除画布
 * 4. 多画布独立持久化存储与无缝切换
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Plus,
  PanelLeftClose,
  PanelLeft,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  Layout,
  Clock,
  Calendar,
} from 'lucide-react';
import { FreeformCanvas } from '../canvas/FreeformCanvas';
import type { CanvasDocument, CanvasState } from '../../types/canvas';
import type { JournalEntry } from '../../types/journal';

const STORAGE_CANVASES_KEY = 'hk_free_canvases_documents_v1';
const STORAGE_ACTIVE_CANVAS_ID_KEY = 'hk_active_free_canvas_id_v1';

// 预设默认画布文档列表（涵盖图 2 示例与实际高价值场景）
const INITIAL_CANVASES: CanvasDocument[] = [
  {
    id: 'canvas-trans-auth',
    title: '翻译权限设置',
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2,
    state: {
      items: [
        {
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
            isBold: true,
            bgColor: '#ffffff',
            fontColor: '#1e293b',
          },
        },
        {
          id: 'sticky-arch-note',
          type: 'sticky',
          x: 680,
          y: 60,
          width: 220,
          height: 190,
          zIndex: 2,
          data: {
            noteColor: '#fef08a',
            noteText: '架构思考备忘：\n- 规范现代浅色科技白蓝渐变\n- 反 AI 模板化\n- 沉淀自定义组件库\n- 衔接知识库实时图谱',
          },
        },
        {
          id: 'chart-ai-eff',
          type: 'chart',
          x: 680,
          y: 280,
          width: 230,
          height: 280,
          zIndex: 3,
          data: {
            chartType: 'line',
            chartTitle: '大模型与图谱协同演进效率',
            chartData: {
              categories: ['周一', '周二', '周三', '周四', '周五'],
              series: [
                { name: '传统模式', data: [80, 110, 95, 170, 160] },
                { name: '星图协同', data: [120, 190, 180, 290, 275] },
              ],
            },
          },
        },
      ],
      connectors: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      snapToGrid: true,
      gridSize: 16,
      updatedAt: Date.now() - 3600000 * 2,
    },
  },
  {
    id: 'canvas-salary-calc',
    title: '工资14500税后计算',
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5,
    state: {
      items: [
        {
          id: 'sticky-salary',
          type: 'sticky',
          x: 100,
          y: 80,
          width: 260,
          height: 220,
          zIndex: 1,
          data: {
            noteColor: '#bbf7d0',
            noteText: '工资 14500 税后测算看板：\n- 社保五险个人扣缴：约 1,522.5 元\n- 公积金个人扣缴 (12%)：1,740 元\n- 专项附加扣除：3,000 元\n- 应纳税所得额：3,237.5 元\n- 预扣个税：约 97.1 元\n- 实际到手金额：约 11,140 元',
          },
        },
      ],
      connectors: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      snapToGrid: true,
      gridSize: 16,
      updatedAt: Date.now() - 3600000 * 5,
    },
  },
  {
    id: 'canvas-study-progress',
    title: '学习内容完成情况',
    createdAt: Date.now() - 3600000 * 24 * 3,
    updatedAt: Date.now() - 3600000 * 24 * 3,
    state: {
      items: [
        {
          id: 'sticky-study',
          type: 'sticky',
          x: 80,
          y: 80,
          width: 280,
          height: 220,
          zIndex: 1,
          data: {
            noteColor: '#bae6fd',
            noteText: '近期学习攻坚进度：\n- React 19 核心并发与 Compiler [已完成]\n- Clean Architecture 领域模型落地 [已完成]\n- Dify 工作流编排与外部工具 [进行中]\n- WebGL 拓扑图形性能调优 [进行中]',
          },
        },
      ],
      connectors: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      snapToGrid: true,
      gridSize: 16,
      updatedAt: Date.now() - 3600000 * 24 * 3,
    },
  },
  {
    id: 'canvas-nasm-arch',
    title: 'NASM是什么',
    createdAt: Date.now() - 3600000 * 24 * 5,
    updatedAt: Date.now() - 3600000 * 24 * 5,
    state: {
      items: [
        {
          id: 'text-nasm',
          type: 'text',
          x: 80,
          y: 80,
          width: 440,
          height: 180,
          zIndex: 1,
          data: {
            text: 'NASM (Netwide Assembler) 核心解析：\n- 跨平台 80x86 与 x86-64 汇编器\n- 语法简洁优雅，模块化程度高\n- 广泛应用于操作系统底层内核引导、加密算法汇编加速与嵌入式固件开发。',
            fontSize: 14,
            isBold: false,
            bgColor: '#ffffff',
          },
        },
      ],
      connectors: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      snapToGrid: true,
      gridSize: 16,
      updatedAt: Date.now() - 3600000 * 24 * 5,
    },
  },
  {
    id: 'canvas-prod-fusion',
    title: '整理产品融合表达',
    createdAt: Date.now() - 3600000 * 24 * 6,
    updatedAt: Date.now() - 3600000 * 24 * 6,
    state: {
      items: [
        {
          id: 'sticky-prod',
          type: 'sticky',
          x: 100,
          y: 90,
          width: 280,
          height: 180,
          zIndex: 1,
          data: {
            noteColor: '#fbcfe8',
            noteText: '产品融合核心话术：\n将非结构化灵感通过智能路由无缝提炼，在无限画布中自由编织，形成闭环的个人知识操作系统。',
          },
        },
      ],
      connectors: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      snapToGrid: true,
      gridSize: 16,
      updatedAt: Date.now() - 3600000 * 24 * 6,
    },
  },
  {
    id: 'canvas-pnpm-trouble',
    title: 'pnpm更新失败排查',
    createdAt: Date.now() - 3600000 * 24 * 12,
    updatedAt: Date.now() - 3600000 * 24 * 12,
    state: {
      items: [
        {
          id: 'text-pnpm',
          type: 'text',
          x: 80,
          y: 80,
          width: 400,
          height: 150,
          zIndex: 1,
          data: {
            text: 'pnpm 依赖更新报错根因：\n1. store 缓存权限冲突 (EACCES)\n2. peerDependencies 硬性版本阻断\n解决方案：执行 pnpm store prune 与添加 --force 或 .npmrc strict-peer-dependencies=false',
            fontSize: 13,
            bgColor: '#ffffff',
          },
        },
      ],
      connectors: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      snapToGrid: true,
      gridSize: 16,
      updatedAt: Date.now() - 3600000 * 24 * 12,
    },
  },
  {
    id: 'canvas-uat-metric',
    title: 'UAT验收指标解析',
    createdAt: Date.now() - 3600000 * 24 * 18,
    updatedAt: Date.now() - 3600000 * 24 * 18,
    state: {
      items: [],
      connectors: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      snapToGrid: true,
      gridSize: 16,
      updatedAt: Date.now() - 3600000 * 24 * 18,
    },
  },
  {
    id: 'canvas-fde-plan',
    title: 'FDE智能体交付规划',
    createdAt: Date.now() - 3600000 * 24 * 22,
    updatedAt: Date.now() - 3600000 * 24 * 22,
    state: {
      items: [],
      connectors: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      snapToGrid: true,
      gridSize: 16,
      updatedAt: Date.now() - 3600000 * 24 * 22,
    },
  },
  {
    id: 'canvas-tv-cast',
    title: '笔记本投屏电视方法',
    createdAt: Date.now() - 3600000 * 24 * 26,
    updatedAt: Date.now() - 3600000 * 24 * 26,
    state: {
      items: [],
      connectors: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      snapToGrid: true,
      gridSize: 16,
      updatedAt: Date.now() - 3600000 * 24 * 26,
    },
  },
];

interface FreeCanvasViewProps {
  onNavigate?: (tabName: string) => void;
  journalEntries?: JournalEntry[];
}

export const FreeCanvasView: React.FC<FreeCanvasViewProps> = ({
  onNavigate,
  journalEntries = [],
}) => {
  // 画布列表持久化状态
  const [canvases, setCanvases] = useState<CanvasDocument[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CANVASES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('加载画布列表失败:', e);
    }
    return INITIAL_CANVASES;
  });

  // 当前激活的画布 ID
  const [activeCanvasId, setActiveCanvasId] = useState<string>(() => {
    const storedId = localStorage.getItem(STORAGE_ACTIVE_CANVAS_ID_KEY);
    return storedId || canvases[0]?.id || 'canvas-trans-auth';
  });

  // 左侧画布侧栏展开/收起状态（默认展开）
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 搜索关键字
  const [searchKeyword, setSearchKeyword] = useState('');

  // 激活的操作菜单画布 ID
  const [activeMenuCanvasId, setActiveMenuCanvasId] = useState<string | null>(null);

  // 内联重命名状态
  const [renamingCanvasId, setRenamingCanvasId] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  // Toast 提示
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // 持久化画布列表
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CANVASES_KEY, JSON.stringify(canvases));
    } catch (e) {
      console.error('保存画布列表失败:', e);
    }
  }, [canvases]);

  // 持久化当前激活画布 ID
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_CANVAS_ID_KEY, activeCanvasId);
    } catch (e) {
      console.error('保存激活画布 ID 失败:', e);
    }
  }, [activeCanvasId]);

  // 点击外部关闭三点菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuCanvasId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  // 当前选中的画布对象
  const currentCanvas = useMemo(() => {
    return canvases.find((c) => c.id === activeCanvasId) || canvases[0] || null;
  }, [canvases, activeCanvasId]);

  // 按照时间将画布列表划分为：今天、7 天内、30 天内（完美复刻图 2）
  const groupedCanvases = useMemo(() => {
    const now = Date.now();
    const oneDay = 3600000 * 24;
    const sevenDays = oneDay * 7;
    const thirtyDays = oneDay * 30;

    const filtered = canvases.filter((c) =>
      searchKeyword.trim() ? c.title.toLowerCase().includes(searchKeyword.toLowerCase()) : true
    );

    const todayList: CanvasDocument[] = [];
    const sevenDaysList: CanvasDocument[] = [];
    const thirtyDaysList: CanvasDocument[] = [];
    const olderList: CanvasDocument[] = [];

    filtered.forEach((c) => {
      const diff = now - (c.updatedAt || c.createdAt || 0);
      if (diff <= oneDay) {
        todayList.push(c);
      } else if (diff <= sevenDays) {
        sevenDaysList.push(c);
      } else if (diff <= thirtyDays) {
        thirtyDaysList.push(c);
      } else {
        olderList.push(c);
      }
    });

    return [
      { key: 'today', label: '今天', list: todayList },
      { key: 'seven', label: '7 天内', list: sevenDaysList },
      { key: 'thirty', label: '30 天内', list: thirtyDaysList },
      { key: 'older', label: '更早之前', list: olderList },
    ].filter((g) => g.list.length > 0);
  }, [canvases, searchKeyword]);

  // 新建画布
  const handleCreateCanvas = () => {
    const newId = `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newCanvas: CanvasDocument = {
      id: newId,
      title: '未命名画布',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      state: {
        items: [
          {
            id: `block-init-${Date.now()}`,
            type: 'text',
            x: 80,
            y: 80,
            width: 380,
            height: 80,
            zIndex: 1,
            data: {
              text: '新创建的自由画布\n点击底部工具栏添加便签、文字、卡片或画笔开始创作...',
              fontSize: 14,
              isBold: true,
              bgColor: '#ffffff',
            },
          },
        ],
        connectors: [],
        zoom: 1,
        panX: 0,
        panY: 0,
        snapToGrid: true,
        gridSize: 16,
        updatedAt: Date.now(),
      },
    };

    setCanvases((prev) => [newCanvas, ...prev]);
    setActiveCanvasId(newCanvas.id);
    setRenamingCanvasId(newCanvas.id);
    setRenameInputValue('未命名画布');
    showToast('已新建画布，可直接修改名称');
  };

  // 启动内联重命名
  const startRenaming = (canvas: CanvasDocument) => {
    setRenamingCanvasId(canvas.id);
    setRenameInputValue(canvas.title);
    setActiveMenuCanvasId(null);
  };

  // 保存重命名
  const saveRenaming = (canvasId: string) => {
    if (renameInputValue.trim()) {
      setCanvases((prev) =>
        prev.map((c) =>
          c.id === canvasId
            ? { ...c, title: renameInputValue.trim(), updatedAt: Date.now() }
            : c
        )
      );
      showToast('已更新画布名称');
    }
    setRenamingCanvasId(null);
  };

  // 复制画布副本
  const handleDuplicateCanvas = (canvas: CanvasDocument) => {
    setActiveMenuCanvasId(null);
    const newId = `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const copyCanvas: CanvasDocument = {
      ...canvas,
      id: newId,
      title: `${canvas.title} (副本)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      state: {
        ...canvas.state,
        items: canvas.state.items.map((it) => ({
          ...it,
          id: `item-copy-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        })),
        updatedAt: Date.now(),
      },
    };
    setCanvases((prev) => [copyCanvas, ...prev]);
    setActiveCanvasId(copyCanvas.id);
    showToast('已创建画布副本');
  };

  // 删除画布
  const handleDeleteCanvas = (canvasId: string) => {
    setActiveMenuCanvasId(null);
    setCanvases((prev) => {
      const next = prev.filter((c) => c.id !== canvasId);
      if (next.length === 0) {
        const fallbackId = `canvas-${Date.now()}`;
        const fallback: CanvasDocument = {
          id: fallbackId,
          title: '未命名画布',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          state: {
            items: [],
            connectors: [],
            zoom: 1,
            panX: 0,
            panY: 0,
            snapToGrid: true,
            gridSize: 16,
            updatedAt: Date.now(),
          },
        };
        setActiveCanvasId(fallbackId);
        return [fallback];
      }
      if (activeCanvasId === canvasId) {
        setActiveCanvasId(next[0].id);
      }
      return next;
    });
    showToast('已删除画布');
  };

  // 保存画布内部状态
  const handleSaveCanvasState = useCallback((canvasId: string, newState: CanvasState) => {
    setCanvases((prev) =>
      prev.map((c) =>
        c.id === canvasId
          ? { ...c, state: newState, updatedAt: Date.now() }
          : c
      )
    );
    showToast('🟢 画布数据已持久化保存');
  }, []);

  return (
    <div className="w-full h-[calc(100vh-65px)] flex overflow-hidden bg-[#f6f8fc] relative">
      {/* Toast 提示 */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2 rounded-xl bg-slate-900/90 text-white text-xs font-medium shadow-xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ====================================================================
          1. 左侧：可折叠画布管理侧栏 (复刻图 2 时间分组与圆角极简风格)
          ==================================================================== */}
      <div
        className={`transition-all duration-300 ease-in-out shrink-0 bg-white/90 backdrop-blur-md border-r border-slate-200/80 flex flex-col z-20 ${
          isSidebarOpen ? 'w-64 sm:w-72' : 'w-14'
        }`}
      >
        {/* 侧栏顶部操作栏 */}
        <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          {isSidebarOpen ? (
            <>
              <button
                type="button"
                onClick={handleCreateCanvas}
                className="flex-1 py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>新建画布</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                title="收起画布侧栏"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <PanelLeftClose size={16} />
              </button>
            </>
          ) : (
            <div className="w-full flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleCreateCanvas}
                title="新建画布"
                className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-sm cursor-pointer"
              >
                <Plus size={18} />
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                title="展开画布侧栏"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <PanelLeft size={16} />
              </button>
            </div>
          )}
        </div>

        {/* 展开态下的搜索过滤 */}
        {isSidebarOpen && (
          <div className="px-3 pt-2.5 pb-1">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索画布..."
                className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-slate-100/70 border border-transparent focus:border-indigo-300 focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 outline-hidden transition-all"
              />
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 画布列表区（复刻图 2 时间分组：今天、7天内、30天内） */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-4 scrollbar-thin">
          {groupedCanvases.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {searchKeyword ? '未找到匹配的画布' : '暂无画布'}
            </div>
          ) : (
            groupedCanvases.map((group) => (
              <div key={group.key} className="space-y-1">
                {isSidebarOpen && (
                  <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-400 tracking-wide select-none">
                    <span>{group.label}</span>
                    <SlidersHorizontal size={11} className="text-slate-300" />
                  </div>
                )}

                <div className="space-y-1">
                  {group.list.map((canvas) => {
                    const isActive = canvas.id === activeCanvasId;
                    const isRenaming = renamingCanvasId === canvas.id;

                    if (!isSidebarOpen) {
                      return (
                        <button
                          key={canvas.id}
                          onClick={() => setActiveCanvasId(canvas.id)}
                          title={canvas.title}
                          className={`w-full h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Layout size={16} />
                        </button>
                      );
                    }

                    return (
                      <div
                        key={canvas.id}
                        className={`group relative rounded-2xl transition-all ${
                          isActive
                            ? 'bg-slate-100 text-slate-900 font-medium shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-50'
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
                                if (e.key === 'Enter') saveRenaming(canvas.id);
                                if (e.key === 'Escape') setRenamingCanvasId(null);
                              }}
                              className="flex-1 text-xs px-2 py-1 rounded-lg bg-white border border-indigo-400 outline-hidden font-normal text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => saveRenaming(canvas.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md cursor-pointer"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenamingCanvasId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-200/50 rounded-md cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => setActiveCanvasId(canvas.id)}
                            className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
                          >
                            <span
                              className={`text-xs truncate flex-1 pr-1 ${
                                isActive ? 'text-slate-900 font-semibold' : 'text-slate-700'
                              }`}
                            >
                              {canvas.title}
                            </span>

                            {/* 右侧三点菜单 ⋮ (贴合图 2) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuCanvasId(
                                  activeMenuCanvasId === canvas.id ? null : canvas.id
                                );
                              }}
                              title="画布操作选项"
                              className={`p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 transition-all cursor-pointer ${
                                isActive || activeMenuCanvasId === canvas.id
                                  ? 'opacity-100'
                                  : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <MoreVertical size={13} />
                            </button>
                          </div>
                        )}

                        {/* 三点浮动操作菜单 (Rename / Duplicate / Delete) */}
                        {activeMenuCanvasId === canvas.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-2 top-8 z-40 w-36 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl py-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => startRenaming(canvas)}
                              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                            >
                              <Edit2 size={13} className="text-slate-500" />
                              <span>重命名</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicateCanvas(canvas)}
                              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                            >
                              <Copy size={13} className="text-slate-500" />
                              <span>复制副本</span>
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            <button
                              type="button"
                              onClick={() => handleDeleteCanvas(canvas.id)}
                              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-50 text-rose-600 text-left transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                              <span>删除画布</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 侧栏底部小统计 */}
        {isSidebarOpen && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-400">
            <span>共 {canvases.length} 个自由画布</span>
            <span className="flex items-center gap-1 text-slate-500">
              <Clock size={11} />
              实时持久化
            </span>
          </div>
        )}
      </div>

      {/* ====================================================================
          2. 右侧主体：自由画布核心区 (直接占据全部页面)
          ==================================================================== */}
      <div className="flex-1 h-full min-w-0 relative overflow-hidden">
        {currentCanvas ? (
          <FreeformCanvas
            key={currentCanvas.id}
            canvasId={currentCanvas.id}
            initialState={currentCanvas.state}
            onSaveCanvasState={handleSaveCanvasState}
            journalEntries={journalEntries}
            isFullScreenMode={true}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <Layout size={32} className="mb-2 text-slate-300" />
            <p className="text-sm">暂无选中的画布</p>
          </div>
        )}
      </div>
    </div>
  );
};
