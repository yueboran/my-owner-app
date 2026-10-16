/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 个人传记与历史人物谱牒鉴戒数据类型定义
 */

export type BiographyCategory =
  | 'leader'       // 领袖统帅
  | 'thinker'      // 思想哲人
  | 'strategist'   // 科技战略与商界巨擘
  | 'artist'       // 文学艺术
  | 'innovator';   // 科学创新

export type TimelineEventStage =
  | 'early'        // 青年求索 / 筑基期
  | 'rise'         // 崭露头角 / 崛起期
  | 'peak'         // 辉煌巅峰 / 核心功业
  | 'turning'      // 劫波逆境 / 关键转折
  | 'legacy';      // 晚年定论 / 精神遗产

// 古典契卡档案（如军籍、仕官籍、履历牒）
export interface ClassicalDossier {
  registryType: string; // 契卡类型：如 "軍籍"、"官籍"、"名士策"、"创业谱"
  nativePlace: string; // 籍贯：如 "沙州敦煌縣"、"湖南湘乡"
  birthDate: string; // 诞辰：如 "太和二年三月初三"
  ageOrLifespan: string; // 年龄或享年：如 "二十"、"享年六十二"
  appearance: {
    height?: string; // 如 "五尺八寸"
    weight?: string; // 如 "一百四十斤"
    bearing?: string; // 气度仪表：如 "目光如炬，骨相清峻"
  };
  serviceInfo: {
    enlistDate?: string; // 入伍/出仕日期：如 "大中元年二月"
    battalionOrAffiliation?: string; // 所属营伍/门派/机构：如 "歸義軍左廂第三伍"
    rankOrTitle: string; // 现任职衔/爵位：如 "隊正"、"两江总督"、"苹果CEO"
    rankBadgeColor?: string; // 职衔印泥色
  };
  background: {
    education: string; // 教育/师承
    motive: string; // 入伍/出仕/创业缘由
    hobbies: string; // 志趣所好
  };
  physicalCondition: {
    assessment: string; // 评定：如 "壯健"、"精力过人"
    lastCheckDate?: string; // 最近诊察
    injuryOrScars?: string; // 创伤/挫折战伤记录
  };
}

export interface BiographyTimelineEvent {
  id: string;
  year: string; // 年份或年龄，如 "大中二年 (20岁)"、"1853年 (42岁)"
  title: string;
  stage: TimelineEventStage;
  description: string;
  outcomeType: 'success' | 'failure' | 'turning_point'; // 胜/败/转折
  // 深度复盘三要素：处境、原因、人物深度剖析
  situation: string; // 当时处境：环境险恶程度、资源底牌、各方掣肘与两难困局
  rootCause: string; // 深层原因：为何爆发此事件、深层内在驱动力与外部历史诱因
  characterAnalysis: string; // 人物深度分析：心理动机、性格短板/长板、心智模型与认知升华
  attribution: {
    experienceFactor: string; // 主观作为与经验
    luckFactor: string;       // 时代机运与天命
  };
  lessonLearned: string; // 以此为鉴启示
  externalRef?: string;  // 外部典籍/史料文献引用
}

/**
 * 历史人物三层学习模型定义
 * “路径不可复制，规律可以学习；经历属于过去，认知决定未来。”
 */
export interface ThreeTierLearningFramework {
  // 第一层：学经历（最低层）- 动作与时代局限
  level1Experience: {
    headline: string;
    description: string;
    pitfallWarning: string; // 盲目模仿的陷阱
  };
  // 第二层：学方法（中间层）- 分析、决策与资源配置
  level2Method: {
    headline: string;
    description: string;
    transferableRules: string[]; // 具备跨域迁移价值的行动原则
  };
  // 第三层：学内核（最高层）- 持续突破的底层认知心智操作系统
  level3CoreMindset: {
    headline: string;
    description: string;
    mentalModels: string[]; // 长期有效的认知体系与思维模型
  };
}

export interface BiographyAnalysisMatrix {
  // 1. 成功要素（可复制优势）
  successFactors: string[];
  // 2. 失败与教训（战略盲区与性格短板）
  failureLessons: string[];
  // 3. 可迁移经验（当代决策与心力方法论）
  actionableInsights: string[];
  // 4. 时代与运气（不可复制的外部浪潮）
  luckAndTiming: string[];
  // 5. 三层学习模型（经历层 -> 方法层 -> 内核认知层）
  threeTierLearning?: ThreeTierLearningFramework;
}

// 历史生死抉择场景（供游戏化角色扮演与推演）
export interface SimulationScenario {
  id: string;
  title: string; // 剧本标题，如 "沙州起兵前夜·死生抉择"
  eraPoint: string; // 发生纪年与角色年龄，如 "大中二年八月 (20岁)"
  urgencyLevel: 'critical' | 'high' | 'moderate'; // 紧迫程度
  contextSummary: string; // 历史背景与现场困局
  currentResources: string[]; // 你当前拥有的底牌/手牌（如：八百死士、半月口粮、暗探名单）
  mortalPeril: string; // 致命杀机与核心矛盾
  historicalDecision: {
    action: string; // 历史人物当年的真实抉择
    rationale: string; // 背后动机与权衡考量
    historicalOutcome: string; // 真实历史的后续连锁反应
  };
  presetDecisions: {
    id: string;
    name: string;
    style: 'aggressive' | 'conservative' | 'subversive' | 'pragmatic';
    description: string;
    rationale: string;
  }[];
}

// 用户决策推演结果
export interface SimulationRecord {
  id: string;
  scenarioId: string;
  profileId: string;
  userDecisionText: string; // 用户的决策内容
  timestamp: number;
  comparisonWithHistory: {
    concurrenceScore: number; // 与历史人物思路重合度 0-100
    divergenceAnalysis: string; // 差异剖析：你的方案 vs 历史原方案
    mindsetContrast: string; // 心智模型与战略格局对比
  };
  immediateReaction: {
    summary: string; // 短期直接连锁反应（3天~1个月）
    alliesResponse: string; // 己方与盟友反应
    adversaryResponse: string; // 敌方与对手应对
  };
  futureBranchOutcome: {
    timelineBranchName: string; // 历史分叉支线命名，如 "沙州提前收复但过早引来合围"
    longTermImpact: string; // 长期走向与终局推演
    survivalProbability: number; // 胜算/存活概率 0-100
    butterflyEffect: string; // 意外引发的蝴蝶效应
  };
  dimensionsScore: {
    boldness: number; // 魄力与果敢 (0-100)
    politicalShrewdness: number; // 政治与人性洞察 (0-100)
    resourceLeverage: number; // 杠杆运用与资源效率 (0-100)
    resilience: number; // 韧性与抗压兜底 (0-100)
  };
  modernTakeaway: string; // 投射于当今现代职场/创业/人生的现实镜鉴
}

export interface BiographyFolder {
  id: string;
  name: string;
  parentId?: string | null;
  isExpanded?: boolean;
  createdAt: number;
}

export interface BiographyProfile {
  id: string;
  name: string;
  courtesyName?: string; // 字/号/别名
  avatarUrl?: string; // 肖像画像 URL（古风工笔或真实肖像）
  avatarEmoji: string;
  era: string; // 朝代/时代，如 "唐代大中朝"、"晚清时期"
  category: BiographyCategory;
  tagline: string; // 一句话定论
  motto: string; // 传世名言
  overview: string; // 生平梗概
  dossier: ClassicalDossier; // 精细化古典谱牒与身量档案
  analysis: BiographyAnalysisMatrix; // 四维深度复盘矩阵
  timeline: BiographyTimelineEvent[]; // 生平大事件时间轴
  scenarios: SimulationScenario[]; // 命运抉择推演剧本库
  folderId?: string | null; // 多级目录分组ID
  blocks?: import('./cardBlock').CardBlock[]; // 块编辑器节点树
  globalFontSize?: import('./cardBlock').FontSizeLevel; // 全局正文字号
  createdAt: number;
  updatedAt: number;
}

