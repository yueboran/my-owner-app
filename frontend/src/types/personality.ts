/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 性格测试与职场优势测评数据类型定义
 */

export type PersonalityDimension = 'E_I' | 'S_N' | 'T_F' | 'J_P';

export interface QuestionOption {
  text: string;
  dimension: PersonalityDimension;
  value: 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';
}

export interface PersonalityQuestion {
  id: number;
  question: string;
  category: string;
  options: [QuestionOption, QuestionOption];
}

export interface PersonalityResultProfile {
  type: string;
  name: string;
  nickname: string;
  badgeColor: string;
  traits: string[];
  strengths: string[];
  careerSuggestions: string[];
  workStyle: string;
  representativeQuote: string;
}

// 预设高信度精选 MBTI 测评题库（12道快速精准测试题）
export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  {
    id: 1,
    question: '在团队讨论或技术方案评审中，你通常更倾向于：',
    category: '能量来源 (E / I)',
    options: [
      { text: '在交流与头脑风暴中即兴迸发灵感，享受讨论氛围', dimension: 'E_I', value: 'E' },
      { text: '先独自深入思考推演，形成成熟方案后再发表观点', dimension: 'E_I', value: 'I' },
    ],
  },
  {
    id: 2,
    question: '在参加行业大会或团队破冰活动时，你感觉：',
    category: '能量来源 (E / I)',
    options: [
      { text: '与更多不同领域的人结识交流会让你充满活力', dimension: 'E_I', value: 'E' },
      { text: '长时间社交会消耗精力，更渴望回到独立空间深度充能', dimension: 'E_I', value: 'I' },
    ],
  },
  {
    id: 3,
    question: '在面对一个全新的复杂架构或业务需求时，你更关注：',
    category: '信息获取 (S / N)',
    options: [
      { text: '眼前的具体实现细节、现有数据依据与可行性验证', dimension: 'S_N', value: 'S' },
      { text: '长远的全局演进蓝图、底层模式创新与未来可能性', dimension: 'S_N', value: 'N' },
    ],
  },
  {
    id: 4,
    question: '在阅读技术文档或方案报告时，你更容易被什么吸引：',
    category: '信息获取 (S / N)',
    options: [
      { text: '清晰详实的案例、步骤指南与现成代码片段', dimension: 'S_N', value: 'S' },
      { text: '前沿的理论模型、宏观架构图与底层设计哲学', dimension: 'S_N', value: 'N' },
    ],
  },
  {
    id: 5,
    question: '在做关键业务决策或代码重构方案选择时，你通常：',
    category: '决策逻辑 (T / F)',
    options: [
      { text: '严格依照客观逻辑、性能基准与数据指标做理性权衡', dimension: 'T_F', value: 'T' },
      { text: '充分考虑团队感受、协作体验与各方接受度做综合权衡', dimension: 'T_F', value: 'F' },
    ],
  },
  {
    id: 6,
    question: '当同事的工作产出存在明显缺陷需要指出时，你倾向于：',
    category: '决策逻辑 (T / F)',
    options: [
      { text: '直击核心问题本质，客观清晰地列出改进标准', dimension: 'T_F', value: 'T' },
      { text: '先肯定对方的付出与闪光点，再温和提出优化建议', dimension: 'T_F', value: 'F' },
    ],
  },
  {
    id: 7,
    question: '对于日常的工作节奏与项目推进，你更喜欢：',
    category: '行动方式 (J / P)',
    options: [
      { text: '提前制定清晰的时间表与里程碑，按部就班推进', dimension: 'J_P', value: 'J' },
      { text: '保持敏捷灵活，随变化随时调整，享受自如应对未知', dimension: 'J_P', value: 'P' },
    ],
  },
  {
    id: 8,
    question: '面对临近截止日期的任务，你的常态是：',
    category: '行动方式 (J / P)',
    options: [
      { text: '提前留足冗余缓冲期，尽早交付以确保心中踏实', dimension: 'J_P', value: 'J' },
      { text: '在临近节点的高压下往往能激发最强爆发力与专注度', dimension: 'J_P', value: 'P' },
    ],
  },
  {
    id: 9,
    question: '度过了一个紧张的高强度工作周后，周末你更倾向于：',
    category: '能量来源 (E / I)',
    options: [
      { text: '约上朋友聚会或去户外探索新鲜事物', dimension: 'E_I', value: 'E' },
      { text: '在家安静阅读、钻研技术或静享独处时光', dimension: 'E_I', value: 'I' },
    ],
  },
  {
    id: 10,
    question: '在解决技术难题时，你更容易依靠：',
    category: '信息获取 (S / N)',
    options: [
      { text: '过往积累的成熟经验与经过充分验证的成熟方案', dimension: 'S_N', value: 'S' },
      { text: '直觉洞察与跳跃式跨界联想，尝试探索全新范式', dimension: 'S_N', value: 'N' },
    ],
  },
  {
    id: 11,
    question: '当团队发生技术路线分歧时，你更看重：',
    category: '决策逻辑 (T / F)',
    options: [
      { text: '方案在技术架构上的最优解与终极正确性', dimension: 'T_F', value: 'T' },
      { text: '整个团队的共识凝聚力与协同推进的顺畅度', dimension: 'T_F', value: 'F' },
    ],
  },
  {
    id: 12,
    question: '在开启一项全新研发项目前，你通常会：',
    category: '行动方式 (J / P)',
    options: [
      { text: '先搭建好完善的工程脚手架、规范流程与排期清单', dimension: 'J_P', value: 'J' },
      { text: '快速写出最小可行性原型（MVP），在演进中逐步完善', dimension: 'J_P', value: 'P' },
    ],
  },
];

// 16 种性格画像库
export const PERSONALITY_PROFILES: Record<string, PersonalityResultProfile> = {
  INTJ: {
    type: 'INTJ',
    name: '战略家 · 建筑师',
    nickname: '顶层架构推演者',
    badgeColor: '#7c3aed',
    traits: ['宏观推演', '理性敏锐', '追求极致', '战略定力'],
    strengths: ['具备穿透表象的顶层架构设计能力', '逻辑严密，抗压推演能力极强', '目标导向，执行战略意志坚定'],
    careerSuggestions: ['系统架构师', '战略技术顾问', 'AI 算法研发专家', '核心产品操盘手'],
    workStyle: '极度重视逻辑闭环与长期价值，善于从纷繁复杂的业务中抽象出优雅的底层框架。',
    representativeQuote: '在混沌中建立秩序，用终局思维推演当下。',
  },
  INTP: {
    type: 'INTP',
    name: '思想家 · 逻辑学家',
    nickname: '底层原理探索者',
    badgeColor: '#2563eb',
    traits: ['深度思考', '求真求知', '抽象建模', '创新思辨'],
    strengths: ['擅长攻坚底层底层原理与复杂算法', '对技术本质有极致的求知欲', '能发现隐蔽的逻辑漏洞与创新解法'],
    careerSuggestions: ['底层核心研发工程师', '前沿算法研究员', '技术架构评审专家', '前瞻技术预研专家'],
    workStyle: '沉浸于解决高难度认知挑战，追求理论模型与代码设计的纯粹美感。',
    representativeQuote: '凡未被证明的皆为假设，探索事物最深层的运作机理。',
  },
  ENTJ: {
    type: 'ENTJ',
    name: '指挥官 · 领航者',
    nickname: '技术赋能领军者',
    badgeColor: '#dc2626',
    traits: ['果敢决断', '组织号召', '战局掌控', '高效交付'],
    strengths: ['清晰的目标分解与资源调配能力', '在不确定性中迅速决断并推动落地', '极强的领导力与团队赋能心力'],
    careerSuggestions: ['研发总监/CTO', '大型技术项目负责人', '技术产品线操盘手', '创业团队领路人'],
    workStyle: '雷厉风行，以终为始，善于整合资源攻克关键战略高地。',
    representativeQuote: '没有不可攻克的壁垒，用行动将战略蓝图化为现实。',
  },
  ENTP: {
    type: 'ENTP',
    name: '辩论家 · 智多星',
    nickname: '创新跨界破局者',
    badgeColor: '#d97706',
    traits: ['敏锐洞察', '跨界联想', '破局创新', '敏捷应变'],
    strengths: ['总能在常规思路外发现奇招突破口', '出色的技术宣讲与方案感染力', '对新技术趋势有极高敏感度'],
    careerSuggestions: ['创新业务产品专家', '技术布道师/Developer Advocate', '解决方案架构师', '技术预研负责人'],
    workStyle: '充满激情与好奇心，擅长在项目初期破冰与技术选型预研。',
    representativeQuote: '打破常规边界，让创新在碰撞中发生。',
  },
  INFJ: {
    type: 'INFJ',
    name: '提倡者 · 引路人',
    nickname: '人文科技洞见者',
    badgeColor: '#059669',
    traits: ['深度同理', '远见卓识', '价值导向', '专注沉潜'],
    strengths: ['深谙人机交互与用户底层诉求', '兼具理想主义情怀与严谨落地能力', '能为团队注入深远的技术使命感'],
    careerSuggestions: ['用户体验设计架构师', 'AI 伦理与产品向导', '组织技术文化引领者', '高端战略顾问'],
    workStyle: '注重产品对于人与社会的长期正向价值，追求科技与人文的极致交融。',
    representativeQuote: '以科技赋能善意，用洞见点亮前路。',
  },
  INFP: {
    type: 'INFP',
    name: '调停者 · 探索者',
    nickname: '匠心精神践行者',
    badgeColor: '#db2777',
    traits: ['真诚专注', '灵性创造', '匠心执着', '独立思考'],
    strengths: ['极具原创审美与产品细节打磨能力', '对所热爱的技术方向有惊人的专注力', '重视团队氛围的纯粹与真诚'],
    careerSuggestions: ['交互式前端专家', '独立开发者', '技术内容/文档架构师', '设计系统专家'],
    workStyle: '带着匠人精神打磨每一处细节，致力于打造令人愉悦的优雅体验。',
    representativeQuote: '不盲从主流，在热爱中坚守本真。',
  },
  ENFJ: {
    type: 'ENFJ',
    name: '主人公 · 领航导师',
    nickname: '团队凝聚催化剂',
    badgeColor: '#ea580c',
    traits: ['热情感染', '团队共情', '愿景传导', '敏锐协调'],
    strengths: ['卓越的跨部门协同与人际纽带能力', '善于激发团队成员的潜能与信心', '出色的技术沟通与方案汇报能力'],
    careerSuggestions: ['工程效能团队主管', '技术运营总监', '敏捷教练/Scrum Master', '技术合伙人'],
    workStyle: '注重团队生态健康，通过赋能他人来实现整体组织目标的最大化。',
    representativeQuote: '一个人走得快，一群人走得远。',
  },
  ENFP: {
    type: 'ENFP',
    name: '竞选者 · 梦想家',
    nickname: '灵感创意火种',
    badgeColor: '#8b5cf6',
    traits: ['无限活力', '创意无限', '感染力强', '拥抱变化'],
    strengths: ['极强的技术热情与创新感染力', '能快速吸收各领域前沿知识', '善于跨界整合建立全新连接'],
    careerSuggestions: ['创新产品经理', 'AI 交互体验专家', '技术社区领袖', '技术创新策划师'],
    workStyle: '以无穷的好奇心探索未知，善于点燃团队的创新灵感。',
    representativeQuote: '世界广阔无限，永远对下一个可能性心动。',
  },
  ISTJ: {
    type: 'ISTJ',
    name: '物流师 · 磐石守卫',
    nickname: '工程可靠性基石',
    badgeColor: '#334155',
    traits: ['严谨务实', '秩序守护', '高可靠性', '尽职尽责'],
    strengths: ['对系统稳定性与代码规范有极高把控力', '注重数据真实性与可复现性', '踏实可靠，值得团队托付核心重任'],
    careerSuggestions: ['SRE 稳定性专家', '数据库/存储核心专家', '金融级安全架构师', '质量保障负责人'],
    workStyle: '用严谨的工程标准与流程守护系统底线，追求 99.999% 的绝对可靠。',
    representativeQuote: '细微之处见真章，可靠是工程师的最高勋章。',
  },
  ISFJ: {
    type: 'ISFJ',
    name: '守卫者 · 幕后英雄',
    nickname: '温润坚韧支持者',
    badgeColor: '#0284c7',
    traits: ['细致周全', '任劳任怨', '值得信赖', '守护协作'],
    strengths: ['出色的细节观察与工程落地保障能力', '主动为团队填补流程盲区与支持性工作', '极高的忠诚度与服务意识'],
    careerSuggestions: ['核心业务维护专家', '技术文档与知识库管家', '交付与运维保障专家', '项目支持经理'],
    workStyle: '润物细无声，默默筑牢团队的基石，确保每一个交付件无懈可击。',
    representativeQuote: '做好每一件小事，就是最伟大的坚守。',
  },
  ESTJ: {
    type: 'ESTJ',
    name: '总经理 · 执行总指挥',
    nickname: '流程规范推进者',
    badgeColor: '#1e40af',
    traits: ['高效推进', '条理分明', '结果导向', '规则建构'],
    strengths: ['极强的项目排期与里程碑把控能力', '善于建立标准化的研发流程与质量规范', '执行力极强，直奔交付目标'],
    careerSuggestions: ['技术项目总监 (PMO)', '研发交付负责人', '系统集成总工程师', '运维管理总监'],
    workStyle: '制定清晰标准，严格监控进度，用高效的制度确保项目按时高质交付。',
    representativeQuote: '效率源于秩序，执行铸就辉煌。',
  },
  ESFJ: {
    type: 'ESFJ',
    name: '执政官 · 协同纽带',
    nickname: '和谐高效促进者',
    badgeColor: '#059669',
    traits: ['热心协同', '周全考量', '团队黏合', '务实服务'],
    strengths: ['出色的客户/用户需求沟通与梳理能力', '营造温暖包容的团队工作氛围', '快速响应各方诉求并周密落地'],
    careerSuggestions: ['解决方案支持经理', '客户成功技术负责人', '技术产品运营专家', '敏捷协同专家'],
    workStyle: '关注团队中每个人的需求与配合，以高效周到的协同促成共赢。',
    representativeQuote: '让协作更顺畅，让团队更温暖。',
  },
  ISTP: {
    type: 'ISTP',
    name: '鉴赏家 · 极客工匠',
    nickname: '精准排障特种兵',
    badgeColor: '#475569',
    traits: ['冷静敏锐', '极客动手', '应急排障', '高效极简'],
    strengths: ['面对突发故障有极强的冷静排查直觉', '精通底层工具链与性能调优', '少说多做，动手能力极强'],
    careerSuggestions: ['性能调优专家', '内核/驱动研发工程师', '应急安全攻防专家', '自动化工具链专家'],
    workStyle: '敏于行而讷于言，在危机时刻单兵突进，精准定位并迅速解决棘手技术故障。',
    representativeQuote: '用事实说话，用代码和工具解决现实问题。',
  },
  ISFP: {
    type: 'ISFP',
    name: '探险家 · 体验艺术家',
    nickname: '灵动体验雕琢者',
    badgeColor: '#c026d3',
    traits: ['美学敏锐', '灵活随性', '谦逊温和', '注重体验'],
    strengths: ['出色的视觉审美与微交互手感', '善于打破沉闷，给技术产品注入温度', '适应力强，善于随需应变'],
    careerSuggestions: ['UI/UX 前端开发专家', '3D 可视化工程师', '多媒体技术研发', '体验设计师'],
    workStyle: '以艺术家般的敏锐感知雕琢产品细节，追求极致的视觉呈现与交互质感。',
    representativeQuote: '技术是骨架，艺术与体验才是灵魂。',
  },
  ESTP: {
    type: 'ESTP',
    name: '企业家 · 破浪突击手',
    nickname: '敏捷攻坚先锋',
    badgeColor: '#ca8a04',
    traits: ['胆识过人', '即时响应', '现实驱动', '灵活变通'],
    strengths: ['在紧急突发任务中展现出色的应对魄力', '善于快速整合资源打造可用原型', '擅长商务技术谈判与现场演示'],
    careerSuggestions: ['售前技术总监', '突击攻坚项目组长', '技术创业先锋', '现场支持总指挥'],
    workStyle: '敢打硬仗，雷厉风行，在动态变化中捕捉最有利战机。',
    representativeQuote: '在实战中淬炼真知，速度决定胜负。',
  },
  ESFP: {
    type: 'ESFP',
    name: '表演者 · 能量之星',
    nickname: '活力氛围激发者',
    badgeColor: '#e11d48',
    traits: ['热情奔放', '乐观积极', '善于沟通', '享受当下'],
    strengths: ['出众的现场演示与方案传播感染力', '能够迅速化解团队压力与沉闷', '以积极心态迎接各种挑战'],
    careerSuggestions: ['技术产品宣讲专家', '技术运营策划', '客户体验布道师', '开发者活动主理人'],
    workStyle: '让工作充满生机与乐趣，用充沛的热情感染身边每一个人。',
    representativeQuote: '工作不仅是攻坚，更是精彩的创造之旅。',
  },
};
