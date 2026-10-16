/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 应用广场与精选应用数据模型
 * 响应用户诉求：只保留显示前 3 个高价值核心生产力应用
 */

export interface FeaturedItem {
  id: string;
  title: string;
  tag: string;
  desc: string;
  gradient: string;
  iconBg: string;
  badgeBg: string;
  badgeColor: string;
  themeType: 'purple' | 'blue' | 'amber' | 'cyan';
  coverImage?: string;
  codeNumber?: string;
  targetAppId?: string;
  targetView?: string;
}

export interface MarketAppItem {
  id: string;
  title: string;
  category: '全部' | '知识加工' | '联合智能体';
  tag: string;
  tagColor: string;
  tagBg: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  desc: string;
  author: string;
  updatedAt: string;
  favorite?: boolean;
  targetView?: string;
  isSpecialApp?: 'report-generator' | 'todo-reminder';
}

// 顶部精选横幅数据（保留对应前 3 个核心应用）
export const featuredList: FeaturedItem[] = [
  {
    id: 'feat-report',
    title: '周报 / 日报智能撰写',
    tag: 'AI知识联动报告',
    desc: '选择时间范围：单日撰写日报，多日/范围撰写周报；深度联动个人知识库资产，AI自动化提炼总结。',
    gradient: 'linear-gradient(135deg, #1b2858 0%, #30378e 45%, #4b47b8 100%)',
    iconBg: '#22306d',
    badgeBg: 'rgba(99, 102, 241, 0.25)',
    badgeColor: '#c7d2fe',
    themeType: 'purple',
    coverImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1200&auto=format&fit=crop',
    codeNumber: '#REPORT-AI',
    targetAppId: 'app-report-generator',
  },
  {
    id: 'feat-todo',
    title: '事件流程推进智能体',
    tag: '多轮对话中枢',
    desc: '接收自然语言输入，智能分析意图并索引对应事件，推演下一步创建或闭环决策，每步弹出人工确认卡片，信息不全主动引导补全。',
    gradient: 'linear-gradient(135deg, #0d3858 0%, #1e5a88 45%, #2575aa 100%)',
    iconBg: '#18476f',
    badgeBg: 'rgba(56, 189, 248, 0.25)',
    badgeColor: '#bae6fd',
    themeType: 'cyan',
    coverImage: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200&auto=format&fit=crop',
    codeNumber: '#EVENT-AGENT',
    targetAppId: 'app-todo-reminder',
  },
  {
    id: 'feat-footprint',
    title: '华夏星图·足迹与文脉',
    tag: '人文地理智图',
    desc: '可缩放全国 370+ 城市全境地图，点亮城市足迹，标注美食名吃、名胜古迹与历史名人渊源。',
    gradient: 'linear-gradient(135deg, #533a1e 0%, #875c2e 45%, #b27f42 100%)',
    iconBg: '#6d4c26',
    badgeBg: 'rgba(251, 191, 36, 0.25)',
    badgeColor: '#fef3c7',
    themeType: 'amber',
    coverImage: 'https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?q=80&w=1200&auto=format&fit=crop',
    codeNumber: '#CHINA-MAP',
    targetView: 'footprint-map',
  },
];

// 应用集市分类选项
export const marketCategories = [
  '全部',
  '知识加工',
  '联合智能体',
] as const;

// 仅保留显示前 3 个真实生产力应用
export const marketAppList: MarketAppItem[] = [
  {
    id: 'app-report-generator',
    title: '周报 / 日报智能撰写助手',
    category: '知识加工',
    tag: '智能报告',
    tagBg: '#f3e8ff',
    tagColor: '#7e22ce',
    icon: 'FileSpreadsheet',
    iconBg: '#f5f3ff',
    iconColor: '#6d28d9',
    desc: '选择时间范围：单日模式生成规范日报，多日/范围模式生成周报。智能调用个人知识库提炼关键成果与行动计划。',
    author: '华鲲元启 · 知识实验室',
    updatedAt: '2026-10-12 17:50:00',
    isSpecialApp: 'report-generator',
  },
  {
    id: 'app-todo-reminder',
    title: '事件流程推进智能体',
    category: '联合智能体',
    tag: '多轮推进',
    tagBg: '#e0f2fe',
    tagColor: '#0369a1',
    icon: 'Activity',
    iconBg: '#e0f2fe',
    iconColor: '#0284c7',
    desc: '接收自然语言输入，智能分析意图并索引对应事件，推演下一步创建或闭环决策，每步弹出人工确认卡片，信息不全主动引导补全。',
    author: '星图智策 · 事件推进Agent',
    updatedAt: '2026-10-12 18:00:00',
    isSpecialApp: 'todo-reminder',
  },
  {
    id: 'app-footprint-china',
    title: '华夏星图·足迹与文脉',
    category: '联合智能体',
    tag: '应用合集',
    tagBg: '#ecfdf5',
    tagColor: '#059669',
    icon: 'Boxes',
    iconBg: '#e0e7ff',
    iconColor: '#4f46e5',
    desc: '可缩放全国 370+ 城市全境地图，点亮城市足迹，标注美食名吃、名胜古迹、历史名人与文化渊源。',
    author: '华夏星图',
    updatedAt: '2026-10-11 22:30:00',
    targetView: 'footprint-map',
  },
  {
    id: 'app-page-studio',
    title: '书页工坊·本地电子书',
    category: '知识加工',
    tag: '应用合集',
    tagBg: '#eff6ff',
    tagColor: '#2563eb',
    icon: 'BookOpen',
    iconBg: '#eff6ff',
    iconColor: '#2b5aed',
    desc: '从阅读页或自包含HTML高保真提取正文与插图，逐段确认排版与字形，生成带多级目录的EPUB与离线HTML。',
    author: '华鲲元启 · 应用工坊',
    updatedAt: '2026-10-15 22:00:00',
    targetView: 'page-studio',
  },
  {
    id: 'app-social-media',
    title: '自媒体工作台',
    category: '知识加工',
    tag: '应用合集',
    tagBg: '#eff6ff',
    tagColor: '#2563eb',
    icon: 'Workflow',
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    desc: '面向小红书、X（推特）、微信公众号的信息收集、筛选、内容处理与发布管理工作台，当前为基础框架，功能逐步开发。',
    author: '华鲲元启 · 应用工坊',
    updatedAt: '2026-10-16 16:00:00',
    targetView: 'social-media',
  },
  {
    id: 'app-recruitment-agent',
    title: '招聘浏览器代理',
    category: '联合智能体',
    tag: '应用合集',
    tagBg: '#f0fdfa',
    tagColor: '#0f766e',
    icon: 'Workflow',
    iconBg: '#f0fdfa',
    iconColor: '#0f766e',
    desc: '计划调用 Laya 与 LLM，对 BOSS直聘等招聘网站执行浏览器代理操作。当前为基础框架，连接、搜索、筛选与任务跟进将逐步开发。',
    author: '华鲲元启 · 应用工坊',
    updatedAt: '2026-10-16',
    targetView: 'recruitment-agent',
  },
];
