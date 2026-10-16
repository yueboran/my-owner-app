/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * BlockSuite / EdgelessEditor 规范数据模型定义
 * 支持无界画布、文字、图片、便签、日记卡片、图表、代码、自由画笔轨迹与节点连线
 */

import type { JournalEntry } from './journal';

export type CanvasItemType = 'text' | 'image' | 'journal' | 'sticky' | 'chart' | 'code' | 'pen';

export interface CanvasItemData {
  // 文本组件专属属性
  text?: string;
  fontSize?: number;
  fontColor?: string;
  bgColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  isBold?: boolean;

  // 图片组件专属属性
  imageUrl?: string;
  imageAlt?: string;
  objectFit?: 'cover' | 'contain';
  borderRadius?: number;

  // 日记卡片专属属性
  journalId?: string;
  journalEntry?: JournalEntry;

  // 便签贴纸专属属性
  noteColor?: string;
  noteText?: string;

  // 高级图表专属属性 (ECharts)
  chartType?: 'line' | 'bar' | 'pie' | 'radar';
  chartTitle?: string;
  chartData?: {
    categories: string[];
    series: { name: string; data: number[] }[];
  };

  // 代码高亮块专属属性
  codeContent?: string;
  codeLanguage?: string;

  // 自由画笔轨迹专属属性
  pathPoints?: { x: number; y: number }[];
  strokeColor?: string;
  strokeWidth?: number;
}

export interface CanvasItem {
  id: string;
  type: CanvasItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
  data: CanvasItemData;
}

// 块间关系连线 (Connector)
export interface CanvasConnector {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  color?: string;
  style?: 'solid' | 'dashed' | 'smooth';
}

// 画布当前工具模式
export type EdgelessToolMode =
  | 'select'    // 选择/拖拽/缩放 (V)
  | 'hand'      // 画布平移漫游 (H)
  | 'text'      // 添加文字 (T)
  | 'sticky'    // 添加便签 (S)
  | 'image'     // 添加图片 (I)
  | 'pen'       // 自由涂鸦画笔 (P)
  | 'connector' // 连线工具 (C)
  | 'journal';  // 引入日记卡片

export interface CanvasState {
  items: CanvasItem[];
  connectors?: CanvasConnector[];
  zoom: number;
  panX: number;
  panY: number;
  snapToGrid: boolean;
  gridSize: number;
  updatedAt: number;
}

/** 多画布文档定义 (支持多画布列表、新建、重命名、删除与时间分组) */
export interface CanvasDocument {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  state: CanvasState;
}
