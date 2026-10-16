/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 商业学习与个人商业成长决策系统 - 核心领域类型定义
 *
 * 核心哲学：
 * 1. 不学习成功者的结果，而学习成功者当时所处的条件、拥有的资源、采取的行动，以及如何解决当时的阻碍。
 * 2. 站在具体个人的现实条件下：条件盘点 ➔ 机会分析 ➔ 差距识别 ➔ 阻碍分析 ➔ 风险评估 ➔ 克服路径 ➔ 最小行动 ➔ 结果反馈 ➔ 沉淀「我的商业方法论」。
 * 3. 机会 ≠ 推荐，而是：机会 × 个人条件 × 风险 × 进入成本 → 个性化判断（现在适不适合做，而非行业好不好）。
 */

// ==================== 一、我是谁：个人当前状态与条件盘点 ====================

export type GapCategoryKey =
  | 'condition' // 条件差距：资金、时间、地理位置、家庭条件、身体条件、当前职业
  | 'resource'  // 资源差距：人脉、客户、渠道、供应链、资本、信息
  | 'knowledge' // 知识差距：行业知识、技术知识、商业知识、法律、财务
  | 'cognition' // 认知差距：判断能力、信息筛选、风险判断、人性理解、战略判断
  | 'ability'   // 能力差距：产品、销售、获客、管理、技术、谈判
  | 'barrier';  // 行业壁垒：资金壁垒、技术壁垒、牌照壁垒、资源壁垒、渠道壁垒、信任壁垒

export interface PersonalGapSubItem {
  id: string;
  name: string; // 如 "资金储备"、"客户资源"、"To B销售能力"
  currentStatus: string; // 个人当前真实状态描述，如 "可动用试错资金 15万"
  currentScore: number; // 当前具备程度 (1-10)
  targetRequirement: string; // 目标商业方向所需水平
  requiredScore: number; // 目标要求程度 (1-10)
  bridgingStrategy: string; // 跨越/弥补该差距的具体策略
}

export interface PersonalGapCategory {
  key: GapCategoryKey;
  title: string;
  subtitle: string;
  items: PersonalGapSubItem[];
}

export interface PersonalCurrentProfile {
  name: string;
  currentRole: string; // 当前职业/身份
  availableCapital: string; // 可支配试错资金
  availableTime: string; // 可投入时间
  location: string; // 所处地理位置与产业带优势
  coreStrengths: string[]; // 当前核心长板
  fatalWeaknesses: string[]; // 当前最大短板约束
  wealthGoal: string; // 财富目标（我想去哪）
  careerGoal: string; // 职业目标（我想去哪）
  ventureGoal: string; // 创业目标（我想去哪）
}

// ==================== 二、外部世界：信息采集、商业案例、商业认知、知识图谱 ====================

// 1. 信息采集 (网页 / 文章 / 视频)
export type InfoCaptureType = 'webpage' | 'article' | 'video';

export interface InformationCaptureItem {
  id: string;
  title: string;
  type: InfoCaptureType;
  sourceUrl?: string;
  sourcePlatform: string;
  author?: string;
  summary: string;
  contentSnippet: string;
  keyTakeaways: string[];
  tags: string[];
  createdAt: number;
}

// 2. 商业案例 (公司 / 项目 / 事件) —— 聚焦“当时条件 → 遇到阻碍 → 跨越路径”
export type BusinessCaseType = 'company' | 'project' | 'event';

export interface BusinessCaseItem {
  id: string;
  title: string;
  type: BusinessCaseType;
  companyName: string;
  industry: string;
  targetAudience: 'To C' | 'To B' | 'To G' | '混合生态';
  timeFrame: string;
  // 核心区别于传统案例库：还原当时条件与阻碍
  initialConditions: string; // 当时所处的真实条件与拥有的初始资源（而非成名后的光环）
  coreObstacles: string; // 当时面临的最大生死阻碍与约束
  overcomingPath: string[]; // 逐步跨越阻碍的真实路径拆解（Step by Step）
  outcomeAndData: string; // 最终商业结果与验证数据
  compareAWithB?: {
    opportunityName: string;
    personACondition: string; // A的条件 -> 可直接进入
    personBCondition: string; // B的条件 -> 直接进入风险极高，需降维路径
    bAlternativePath: string[]; // B的轻资产渐进路径
  };
  keyLessons: string[];
  createdAt: number;
}

// 3. 商业认知 (观点 / 规律 / 模型)
export type BusinessCognitionType = 'viewpoint' | 'law' | 'model';

export interface BusinessCognitionItem {
  id: string;
  title: string;
  type: BusinessCognitionType;
  threeTierLayer: 'level1_experience' | 'level2_method' | 'level3_core';
  coreHypothesis: string;
  detailedExplanation: string;
  counterIntuition: string;
  applicationScenarios: string[];
  cautionWarning: string;
  tags: string[];
  createdAt: number;
}

// 4. 知识图谱 (公司 / 行业 / 人)
export type GraphEntityType = 'company' | 'industry' | 'person';

export interface GraphEntity {
  id: string;
  name: string;
  type: GraphEntityType;
  tagline: string;
  description: string;
  tags: string[];
  scaleOrMetrics: string;
  coreAttributes: Record<string, string>;
  entryBarriers?: string[]; // 针对行业/赛道的核心壁垒
}

export interface GraphRelation {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  description: string;
}

// ==================== 三、核心决策引擎：阻碍分析器与个人商业机会雷达 ====================

export interface ObstacleDimensionItem {
  dimension: string; // 如 "① 技术"、"② 资金"、"③ 客户"、"④ 产品"、"⑤ 销售"、"⑥ 风险"
  concreteObstacle: string; // 具体阻碍，如 "不懂底层模型微调部署" / "没有首批B端种子客户"
  severity: '致命瓶颈' | '中度阻碍' | '可规避';
  overcomingPath: string[]; // 阶段性跨越路径（如：API ➔ 云GPU ➔ 小规模验证）
}

export interface ObstacleAnalysisPlan {
  id: string;
  targetGoal: string; // 目标，如 "进入垂直行业 AI 工具创业" 或 "无经验10万本金切入餐饮消费"
  biggestBottleneck: string; // 当前最大单点障碍结论（如："当前最大障碍是客户资源与行业场景，而不是技术"）
  bottleneckReason: string; // 为什么这是最大障碍
  dimensions: ObstacleDimensionItem[]; // 六维阻碍拆解
  stepByStepPath: string[]; // 从0到1总体渐进演化链路（条件 ➔ 降低投入 ➔ 轻资产MVP ➔ 首批客户 ➔ 现金流 ➔ 扩大规模）
  stopLossLine: string; // 明确止损线设置
  minimumViableAction: string; // 本周即可执行的最小行动 (MVP)
}

export interface OpportunityRadarItem {
  id: string;
  name: string; // 机会名称，如 "垂直场景AI效率工具"、"社区现制餐饮店"、"跨境平台半托管电商"、"企业定制软件服务"、"专业领域知识付费"
  entryBarrierLevel: '低' | '中' | '高' | '极高';
  riskLevel: '低' | '中' | '高' | '极高';
  capitalRequirement: '低' | '中' | '高';
  resourceRequirement: '低' | '中' | '高';
  suitableFor: string; // 适合谁
  quadrant: 'high_value' | 'suitable_explore' | 'not_suitable_now' | 'low_value'; // 雷达四象限
  // 10维量化评估 (1-10分)
  metrics: {
    opportunityValue: number;   // 机会价值
    entryBarrier: number;       // 进入门槛 (分越高门槛越高)
    personalMatch: number;      // 个人匹配度
    resourceMatch: number;      // 资源匹配度
    capitalDemand: number;      // 资金需求
    learningCost: number;       // 学习成本
    competitionIntensity: number; // 竞争程度
    riskScore: number;          // 风险指数
    trialCost: number;          // 试错成本
    potentialReturn: number;    // 潜在收益
  };
  personalizedVerdict: string; // 针对“我”当前条件的个性化结论（现在适不适合做 & 切入建议）
}

// ==================== 四、商业规律沉淀与「我的商业方法论」 ====================

export interface BusinessLawItem {
  id: string;
  title: string;
  categoryLabel: string;
  formulaOrSummary: string;
  deepMechanism: string;
  supportingCases: string[];
  transferableRules: string[];
  createdAt: number;
}

export interface BusinessMethodologySection {
  id: string;
  title: string;
  subtitle: string;
  principles: string[];
  checklist: string[];
  flywheelSteps: { stepName: string; action: string; keyMetric: string }[];
  redLines: string[];
}

export interface MyBusinessMethodology {
  title: string;
  version: string;
  lastUpdated: string;
  missionStatement: string;
  sections: BusinessMethodologySection[];
}

// 视图导航 Tab
export type BusinessLearningTab =
  | 'growth-map'     // 1. 全景架构：我的商业成长系统 & 商业学习系统流导图
  | 'gap-database'   // 2. 我是谁：个人条件盘点与「六大商业差距数据库」
  | 'obstacle-path'  // 3. 核心引擎：「阻碍分析器」与渐进式克服路径 (A vs B)
  | 'radar-matrix'   // 4. 机会评估：「个人商业雷达」与风险匹配矩阵
  | 'world-inputs'   // 5. 外部世界：信息采集 / 商业案例 / 商业认知
  | 'knowledge-graph'// 6. 知识图谱：公司 / 行业 / 人 三维连接
  | 'methodology';   // 7. 终极沉淀：商业规律沉淀与「我的商业方法论」
