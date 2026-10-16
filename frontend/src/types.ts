/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ========== 五维雷达图评分体系 ==========

/** 五维雷达图评分（每个维度 0-100） */
export interface RadarDimensions {
  concept: number;    // 核心概念
  research: number;   // 深度调研
  planning: number;   // 方案规划
  extension: number;  // 拓展与延伸
  evaluation: number; // 价值与评估
}

/** 雷达维度配置常量（标签 + 颜色） */
export const RADAR_DIMS: { key: keyof RadarDimensions; label: string; color: string }[] = [
  { key: 'concept',    label: '核心概念',   color: '#d0bcff' },
  { key: 'research',   label: '深度调研',   color: '#4cd7f6' },
  { key: 'planning',   label: '方案规划',   color: '#fbabff' },
  { key: 'extension',  label: '拓展与延伸', color: '#4ade80' },
  { key: 'evaluation', label: '价值与评估', color: '#f59e0b' },
];

/** 计算雷达图总分（五维平均值） */
export function getRadarAverage(radar: RadarDimensions): number {
  const values = Object.values(radar);
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

// ========== 评论 ==========

export interface Comment {
  id: string;
  author: string;
  avatarUrl?: string;
  timeAgo: string;
  title?: string;
  content: string;
  imageUrl?: string;
  images?: string[];
  type?: 'comment' | 'expansion';
  projectName?: string;
  category?: string;
  ratings?: Record<string, number>;
  customData?: Record<string, string>;
  bookmarked?: boolean;
}

export interface DraftRecord {
  id: string;
  title: string;
  content: string;
  targetProjectId: string | null;
  tag: string;
  ratings: Record<string, string>;
  customData: Record<string, string>;
  timeAgo: string;
}

// ========== 项目核心模型 ==========

export interface Project {
  id: string;
  name: string;
  coverImage?: string;
  icon: string;           // Material symbols name
  intro: string;
  description: string;    // 详细背景描述
  auroraScore: number;    // 综合得分（雷达图平均值）
  radar: RadarDimensions; // 五维雷达评分
  radarContributors?: {
    [K in keyof RadarDimensions]?: { author: string; avatarUrl: string };
  };
  ratingFields?: string[];
  customInputs?: { name: string; type: 'singleLine' | 'multiLine' }[];
  requireTitleField?: boolean;

  tags: string[];
  commentsCount: number;
  timeAgo: string;
  comments?: Comment[];
  hotness?: string;        // 如 "9.2k"
  likes: number;
  bookmarked?: boolean;
  // ===== 痛点共鸣 =====
  painPointCount?: number;
  // ===== 灵感故事与共创轨迹 =====
  inspirationSource?: string;
  inspirationAuthor?: string;
  inspirationAuthorRole?: string;
  coCreationTimeline?: CoCreationEvent[];
}

// ========== 时间线动态 ==========

export interface TimelineFeedItem {
  id: string;
  author: string;
  avatarUrl?: string;
  timeAgo: string;
  feedType: 'expansion' | 'comment' | 'recommendation';
  feedTypeLabel?: string;
  projectName?: string;
  projectIntro?: string;
  projectCover?: string;
  content: string;
  likes: number;
  replyCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  categoryTags?: string[];
}

// ========== 站内通知 ==========

export interface InAppNotification {
  id: string;
  projectId: string;
  projectName: string;
  type: 'comment' | 'milestone' | 'painpoint';
  message: string;
  timestamp: string;
  read: boolean;
}

// ========== 灵感投资组合（资产化认知） ==========

export type HoldingRole = 'creator' | 'commenter' | 'liker' | 'bookmarker';

export interface PortfolioHolding {
  project: Project;
  role: HoldingRole;
  entryValuation: number;
  currentValuation: number;
  valuationChange: number;
  holdingWeight: number;
  engagementScore: number;
  isLiked: boolean;
  isBookmarked: boolean;
}

export interface PortfolioStats {
  totalValuation: number;
  valuationChange24h: number;
  totalHoldings: number;
  influenceRank: string;
  createdCount: number;
  commenterCount: number;
  likerCount: number;
  bookmarkerCount: number;
  streakDays: number;
  weeklyActivity: number[];
}

export interface PortfolioDimensionAlloc {
  key: string;
  label: string;
  percentage: number;
  color: string;
}

// ========== 共创轨迹事件 ==========

export interface CoCreationEvent {
  date: string;
  author: string;
  authorRole?: string;
  eventType: 'inspiration' | 'tech_claim' | 'prototype' | 'milestone' | 'community';
  content: string;
  emoji: string;
}
