/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 全局 Lucide 图标统一管理与映射系统 (Lucide Icon System)
 * 遵循原则：
 * 1. 简洁线性 (Clean & Linear, strokeWidth=1.75 ~ 2)
 * 2. 风格统一 (Unified Style, 适配专业 SaaS、后台管理与开发工具)
 * 3. 纯静态 Tree Shaking 按需加载，杜绝动态臃肿全量打包
 * 4. 全面替代 Emoji 与手写 SVG
 */

import React from 'react';
import {
  LayoutGrid,
  Bot,
  Compass,
  ListTodo,
  PenLine,
  Target,
  BookmarkPlus,
  Scroll,
  TrendingUp,
  Brain,
  Wrench,
  Briefcase,
  MapPin,
  Layout,
  Search,
  Sparkles,
  Zap,
  Flame,
  Sprout,
  Coffee,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Lightbulb,
  BookOpen,
  Code2,
  Flag,
  FileText,
  Trash2,
  Edit2,
  Copy,
  Split,
  Pin,
  Mail,
  Send,
  MoreVertical,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ExternalLink,
  Save,
  RotateCcw,
  Check,
  X,
  User,
  PanelLeftClose,
  PanelLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Timer,
  FolderGit2,
  Quote,
  Image as ImageIcon,
} from 'lucide-react';

/** 系统核心功能与业务模块对应的标准 Lucide 图标库 */
export const APP_ICONS = {
  // 顶层导航与主视图
  marketplace: LayoutGrid,
  agentChat: Bot,
  freeCanvas: Layout,
  explore: Compass,
  analysis: Bot,
  footprintMap: MapPin,

  // 个人助理子模块
  todos: ListTodo,
  journal: PenLine,
  knowledgeCollector: BookmarkPlus,

  // 应用合集
  biography: Scroll,
  businessAnalysis: TrendingUp,

  // 常用工具
  personalityTest: Brain,
  aiNavigation: Compass,
  careerNavigation: Briefcase,
  tools: Wrench,

  // 任务与意图分类图标
  coreTodo: Flame,
  agileTask: Zap,
  longTerm: Sprout,
  dailyLife: Coffee,
  idea: Lightbulb,
  milestone: Flag,
  architecture: Layers,
  document: FileText,
  study: BookOpen,
  code: Code2,

  // 交互与状态指示
  success: CheckCircle2,
  clock: Clock,
  calendar: Calendar,
  timer: Timer,
  sparkles: Sparkles,
  search: Search,
  filter: SlidersHorizontal,
  more: MoreVertical,
  plus: Plus,
  save: Save,
  reset: RotateCcw,
  edit: Edit2,
  delete: Trash2,
  copy: Copy,
  split: Split,
  pin: Pin,
  mail: Mail,
  send: Send,
  check: Check,
  close: X,
  user: User,
  link: ExternalLink,
  quote: Quote,
  image: ImageIcon,
  project: FolderGit2,
  panelClose: PanelLeftClose,
  panelOpen: PanelLeft,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  chevronRight: ChevronRight,
  arrowRight: ArrowRight,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
} as const;

export type AppIconKey = keyof typeof APP_ICONS;

interface LucideIconProps {
  name: AppIconKey;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * 统一标准 Lucide 图标渲染组件
 * 强制统一线性视觉与默认 strokeWidth=1.75
 */
export const AppIcon: React.FC<LucideIconProps> = ({
  name,
  size = 16,
  className = '',
  strokeWidth = 1.75,
}) => {
  const IconComponent = APP_ICONS[name] || Sparkles;
  return <IconComponent size={size} strokeWidth={strokeWidth} className={className} />;
};
