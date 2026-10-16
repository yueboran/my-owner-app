/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 商业分析与行业研报阅读中枢数据类型定义
 */

export type IndustryCategory =
  | 'ai_tech'       // 人工智能与前沿科技
  | 'global_ecom'   // 全球出海与跨境消费
  | 'enterprise'    // 企业服务与 SaaS 软件
  | 'green_energy'  // 新能源与先进制造
  | 'macro_finance';// 宏观经济与资本市场

export type ReportType =
  | 'industry_deep' // 行业深度研究
  | 'company_case'  // 企业与商业模式解构
  | 'competitive'   // 竞争格局与生态位博弈
  | 'financial';    // 财报深度剖析与商业估值

export interface ReportKeyMetric {
  label: string; // 指标名称，如 "全球市场规模 (TAM)"
  value: string; // 数值，如 "$1,280B"
  trend?: string; // 趋势，如 "+38.4% CAGR"
  description?: string; // 说明
}

export interface ReportSection {
  id: string;
  title: string;
  subtitle?: string;
  content: string; // 正文内容（支持富文本/Markdown分段）
  keyTakeaways?: string[]; // 核心提炼点
  dataChartNote?: string; // 数据图表说明
}

/**
 * 商业模式透镜与目标客户群类型
 * To C: 满足人性需求与情绪价值，规模化驱动
 * To B: 组织价值交换，追求确定性商业 ROI（降本、增效、增收、控险）
 * To G: 公共价值与治理能力，聚焦政策匹配、可靠合规与长效信任
 */
export type BusinessTargetType = 'to_c' | 'to_b' | 'to_g';

/**
 * 商业运转四维资源模型定义
 * “人与人之间长期交换的，本质不是钱，而是价值。”
 */
export interface FourDimensionalResources {
  // ① 信息资源：别人不知道，你知道（信息差产生利润）
  information: {
    score: number; // 资源丰度 (1-5)
    summary: string; // 核心信息差与情报壁垒
    details?: string; // 行业趋势、用户需求或技术机会分析
  };
  // ② 关系资源：别人联系不到的人，你能联系（发现+维护+价值匹配，降低交易成本）
  relationship: {
    score: number; // 资源丰度 (1-5)
    summary: string; // 关键人脉连接与生态位
    details?: string; // 持续创造交换价值与生态连接放大
  };
  // ③ 能力资源：别人做不到，你能做到（形成专业壁垒）
  capability: {
    score: number; // 资源丰度 (1-5)
    summary: string; // 研发/产品/供应链/运营核心护城河
    details?: string; // 为什么他人无法在短期内低成本复刻
  };
  // ④ 信任资源：别人不相信别人，但相信你（品牌本质：用过去积累的信任，降低未来交易成本）
  trust: {
    score: number; // 资源丰度 (1-5)
    summary: string; // 品牌信任与背书资产
    details?: string; // 溢价能力与长期履约积累的信任资本
  };
}

/**
 * 商业价值交换与决策机制模型
 * 交易发生 = 对方相信你能创造价值
 */
export interface BusinessExchangeModel {
  targetType: BusinessTargetType; // 商业客户类型 (To C / To B / To G)
  targetAudience: string; // 核心购买者/决策者
  decisionPsychology: string; // 决策心理机制
  exchangeFormula: string; // 价值交换主公式（如：“你能证明投资值得”）
  roiDrivers?: string[]; // 核心价值驱动因子（如：降本、增效、增收、控险）
  // 商业五环飞轮映射
  fiveWheels?: {
    resource: string; // 资源：获取优势（信息/关系/能力/信任）
    value: string; // 价值：产生交易基础
    packaging: string; // 包装：提升感知价值
    marketing: string; // 营销：扩大传播与触达范围
    humanNature: string; // 人性：理解底层决策机制
  };
}

/**
 * 商业分析三层学习模型定义
 * “路径不可复制，规律可以学习；经历属于过去，认知决定未来。”
 */
export interface BusinessThreeTierLearning {
  // 第一层：学经历（动作表象 · 不可复制）
  level1Experience: {
    headline: string; // 如：“当年抓住了什么风口、采用了什么买点/打法”
    description: string;
    pitfallWarning: string; // 盲目复制表象动作的陷阱
  };
  // 第二层：学方法（决策机制 · 高迁移性）
  level2Method: {
    headline: string; // 如：“如何洞察供需拐点、如何配置研发与资本、如何构建护城河”
    description: string;
    transferablePrinciples: string[]; // 具备跨行业迁移价值的决策法则
  };
  // 第三层：学内核（认知心智 · 终极决胜）
  level3CoreMindset: {
    headline: string; // 如：“第一性原理、长期主义定力与组织自我进化系统”
    description: string;
    underlyingMindsets: string[]; // 长期有效的认知体系与思维操作系统
  };
}

export interface BusinessReportFolder {
  id: string;
  name: string;
  parentId?: string | null;
  isExpanded?: boolean;
  createdAt: number;
}

export interface BusinessReport {
  id: string;
  title: string;
  subtitle: string;
  sourceOrg: string; // 发布机构/智库/分析师团队，如 "红杉资本研究部" / "麦肯锡全球研究院"
  author: string; // 分析师/主笔
  publishDate: string; // 发布时间，如 "2026年3月"
  readTimeMinutes: number; // 预计阅读时间（分钟）
  category: IndustryCategory;
  reportType: ReportType;
  ratingBadge: '强烈推荐' | '核心追踪' | '战略必读' | '行业观察';
  executiveSummary: string; // 执行摘要：一句话到一段话的核心战略研判
  keyMetrics: ReportKeyMetric[]; // 关键商业数据 KPI 卡片
  sections: ReportSection[]; // 正文各个结构化章节
  coreInsights: string[]; // 提炼出的三大核心商业洞察
  threeTierLearning?: BusinessThreeTierLearning; // 商业三层学习模型提炼
  businessTarget?: BusinessTargetType; // 商业模式分类：To C / To B / To G
  fourResources?: FourDimensionalResources; // 四维资源模型评估（信息/关系/能力/信任）
  exchangeModel?: BusinessExchangeModel; // 商业价值交换与决策机制模型
  moatAnalysis: {
    networkEffect: number; // 网络效应 (1-5)
    switchingCost: number; // 转换成本 (1-5)
    costAdvantage: number; // 规模与成本优势 (1-5)
    intangibleAssets: number; // 品牌与专利壁垒 (1-5)
    summary: string; // 护城河综合评述
  };
  risksAndHeadwinds: string[]; // 潜在商业风险与阻力
  actionableAdvice: string[]; // 针对创业者/投资人/决策者的实操建议
  tags: string[]; // 检索标签
  isBookmarked?: boolean; // 是否收藏
  folderId?: string | null; // 所属多级目录分类ID
  blocks?: any[]; // 支持块编辑器节点
  createdAt: number;
  updatedAt: number;
}

