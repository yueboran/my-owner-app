/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 求职导航与职业成长全景数据类型定义
 */

export type CareerCategory =
  | 'all'
  | 'recruit'     // 主流招聘平台
  | 'interview'   // 面经与算法刷题
  | 'salary'      // 薪资爆料与行情
  | 'resume'      // 简历与求职工具
  | 'enterprise'  // 央国企/名企招聘
  | 'community';  // 职场社区与内推

export interface CareerCategoryConfig {
  id: CareerCategory;
  label: string;
  badgeClass: string;
}

export interface CareerResourceItem {
  id: string;
  name: string;
  description: string;
  category: CareerCategory;
  url: string;
  iconBg: string;
  iconEmoji: string;
  tags: string[];
  isHot?: boolean;
  highlightText?: string;
}
