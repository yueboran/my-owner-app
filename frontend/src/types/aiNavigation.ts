/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AI 导航与前沿工具库数据类型定义
 */

export type AiCategory =
  | 'all'
  | 'llm'        // 大语言模型
  | 'coding'     // AI 编程与开发
  | 'image'      // 图像与设计
  | 'video'      // 音视频与多模态
  | 'productivity' // 办公与知识库
  | 'agent'      // Agent 与工作流
  | 'search';    // AI 深度搜索

export interface AiCategoryConfig {
  id: AiCategory;
  label: string;
  badgeClass: string;
  iconName?: string;
}

export interface AiToolItem {
  id: string;
  name: string;
  description: string;
  category: AiCategory;
  url: string;
  iconBg: string;
  iconEmoji: string;
  tags: string[];
  isHot?: boolean;
  isFeatured?: boolean;
  pricing: 'Free' | 'Freemium' | 'Commercial' | 'OpenSource';
}
