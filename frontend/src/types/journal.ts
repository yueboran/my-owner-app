/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 个人日记与工作复盘数据类型定义
 */

import type { KnowledgeAttachment } from './knowledgeClip';

export type MoodType = 'excited' | 'happy' | 'peaceful' | 'tired' | 'stressed';
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
export type JournalCategory = 'work' | 'life' | 'reflection' | 'milestone' | 'idea';

export interface MoodConfig {
  id: MoodType;
  label: string;
  emoji: string;
  color: string;
}

export interface WeatherConfig {
  id: WeatherType;
  label: string;
  emoji: string;
}

export interface JournalCategoryConfig {
  id: JournalCategory;
  label: string;
  color: string;
  badgeClass: string;
}

export const MOOD_CONFIGS: MoodConfig[] = [
  { id: 'excited', label: '充满干劲', emoji: '🚀', color: '#2563eb' },
  { id: 'happy', label: '心情愉悦', emoji: '😊', color: '#16a34a' },
  { id: 'peaceful', label: '宁静专注', emoji: '🌿', color: '#059669' },
  { id: 'tired', label: '略感疲惫', emoji: '☕', color: '#d97706' },
  { id: 'stressed', label: '高压攻坚', emoji: '🔥', color: '#dc2626' },
];

export const WEATHER_CONFIGS: WeatherConfig[] = [
  { id: 'sunny', label: '晴朗', emoji: '☀️' },
  { id: 'cloudy', label: '多云', emoji: '⛅' },
  { id: 'rainy', label: '细雨', emoji: '🌧️' },
  { id: 'windy', label: '清风', emoji: '🍃' },
  { id: 'snowy', label: '初雪', emoji: '❄️' },
];

export const JOURNAL_CATEGORIES: JournalCategoryConfig[] = [
  { id: 'work', label: '工作复盘', color: '#2563eb', badgeClass: 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]' },
  { id: 'reflection', label: '深度复盘', color: '#7c3aed', badgeClass: 'bg-[#f5f3ff] text-[#7c3aed] border-[#ddd6fe]' },
  { id: 'idea', label: '灵感火花', color: '#db2777', badgeClass: 'bg-[#fdf2f8] text-[#db2777] border-[#fbcfe8]' },
  { id: 'milestone', label: '里程碑', color: '#059669', badgeClass: 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]' },
  { id: 'life', label: '生活日常', color: '#d97706', badgeClass: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]' },
];

export interface JournalFolder {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt: number;
  isExpanded?: boolean;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  category: JournalCategory;
  mood?: MoodType;
  weather?: WeatherType;
  tags: string[];
  isPinned: boolean;
  attachments?: KnowledgeAttachment[];
  attachmentPosition?: 'top' | 'bottom';
  createdAt: number;
  updatedAt: number;
  aiReflection?: string; // AI 智能复盘与鼓励建议
  folderId?: string | null;
  blocks?: import('./cardBlock').CardBlock[];
  globalFontSize?: import('./cardBlock').FontSizeLevel;
}
