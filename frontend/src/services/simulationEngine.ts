/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 历史决策推演引擎 (Chronos Simulation Engine)
 * 分析用户在特定历史危机场景下的真实决策，与历史人物做对比，推演顺承与后续局势影响
 */

import type { BiographyProfile, SimulationScenario, SimulationRecord } from '../types/biography';

/**
 * 历史沙盘智能推演计算函数
 * 结合自然语言关键词匹配、情绪烈度、战略倾向与历史因果链，生成高拟真推演长卷
 */
export function simulateDecision(
  profile: BiographyProfile,
  scenario: SimulationScenario,
  userDecision: string
): SimulationRecord {
  const text = userDecision.trim().toLowerCase();

  // 1. 语义倾向分析 (进攻激进 vs 稳健隐忍 vs 政治博弈/借力 vs 奇谋颠覆)
  const isAggressive = /强攻|杀|夜袭|决死|突围|血战|拼|硬拼|决战|斩首|正面|立刻|反抗|辞职|出走/i.test(text);
  const isConservative = /隐忍|退|等待|按兵不动|暂缓|撤退|守|防守|明哲保身|认罪|妥协|保守|观察|和谈/i.test(text);
  const isSubversive = /放火|火攻|伪装|假扮|诈称|奇袭|暗道|离间|谣言|偷袭|反间|毒|内应|开门|借道/i.test(text);
  const isPragmatic = /聚焦|裁减|和解|谈判|联络|整顿|练兵|屯田|分散|化整为零|合作|同盟|上疏/i.test(text);

  // 2. 与历史人物当时决策的重合度评估
  const histAction = scenario.historicalDecision.action.toLowerCase();
  let concurrenceScore = 45;
  if (text.length > 50) concurrenceScore += 10;
  if (isSubversive && histAction.includes('火') || (isSubversive && histAction.includes('伪装'))) concurrenceScore += 25;
  if (isPragmatic && (histAction.includes('裁') || histAction.includes('退') || histAction.includes('整'))) concurrenceScore += 25;
  if (isAggressive && histAction.includes('战')) concurrenceScore += 15;
  if (concurrenceScore > 95) concurrenceScore = 95;
  if (concurrenceScore < 20) concurrenceScore = 28;

  // 3. 维度评分计算
  let boldness = isAggressive ? 92 : (isSubversive ? 84 : 65);
  let politicalShrewdness = (isPragmatic || isConservative) ? 88 : (isSubversive ? 82 : 60);
  let resourceLeverage = (isSubversive || isPragmatic) ? 90 : 70;
  let resilience = isConservative ? 85 : 75;

  if (text.length > 80) {
    boldness = Math.min(99, boldness + 5);
    politicalShrewdness = Math.min(99, politicalShrewdness + 6);
    resourceLeverage = Math.min(99, resourceLeverage + 5);
  }

  // 4. 构建推演分支名称与长远走向
  let branchName = '历史平行支线·';
  let immediateSummary = '';
  let alliesReaction = '';
  let adversaryReaction = '';
  let longTermImpact = '';
  let butterflyEffect = '';
  let survivalProb = 75;

  if (isAggressive) {
    branchName += '【惊雷破局·孤注一掷】';
    immediateSummary = `你的指令如惊雷炸响！部属虽感震惊，但被决死之气裹挟，全军爆发出极其恐怖的爆发力。第一阶段战术目标迅速达成，敌方前哨陷入巨大混乱。`;
    alliesReaction = '随行将士与核心盟友被绝地勇气所感染，士气瞬间攀升至顶点，人人抱必死之心奋力突进。';
    adversaryReaction = '敌方骤然遇袭阵脚大乱，指挥官一时难以判断我军虚实，首度调兵出现约半个时辰的脱节与犹豫。';
    longTermImpact = `虽然在短时间内撕开了致命缺口并赢得了先机，但因未留后手与冗余缓冲，后续一旦敌军主力合围，将面临极大的后勤断绝或精力衰竭风险。此战若胜则是惊世奇迹，若受挫则可能全盘覆没。`;
    butterflyEffect = '你的凶悍举动引起了周边原本中立观望势力的极度震惊，促使某些暗流加速站队。';
    survivalProb = 62;
  } else if (isSubversive) {
    branchName += '【奇谋鬼谷·暗度陈仓】';
    immediateSummary = `你巧妙避开了正面死磕，以极具迷惑性的假象与虚实战术，瞬间将战场的注意力牵引至预设的佯动方向，核心目标在无声中完成潜入。`;
    alliesReaction = '精锐骨干对你的神机妙算敬佩不已，执行时纪律严明、行动隐秘，最大限度保留了生力军战力。';
    adversaryReaction = '敌方完全掉入信息迷雾，重兵被调往假目标，待发现真身意图时关键防线已被破除。';
    longTermImpact = `用最小的代价换取了最大的战果，完美贯彻了“避实就虚”的兵法精髓。在接下来的数月博弈中，你将牢牢掌握主动权，拥有充裕的调整空间。`;
    butterflyEffect = '敌军统帅因误判受重责，导致敌方高层出现内部互相推诿猜忌，削弱了敌阵的整体协同性。';
    survivalProb = 88;
  } else if (isPragmatic) {
    branchName += '【务实深耕·结硬求全】';
    immediateSummary = `你的决策冷静克制，彻底斩断了侥幸与虚荣，把所有精力和资源重新锚定在最核心的根本盘上，局势迅速止血稳定。`;
    alliesReaction = '团队初时虽有委屈或不甘，但随着混乱被迅速理顺、资源得到重新调配，内部凝聚力与信任感大幅增强。';
    adversaryReaction = '对手本欲趁乱追击，见你阵脚严整、退而不乱且深筑营垒，深感无隙可乘，不得不放弃速胜念头转入僵持。';
    longTermImpact = `走的是最为扎实的“以时间换空间”之路。虽然短期内不会有戏剧性的狂飙捷报，但随着时间推移，你的基本盘会像滚雪球般越来越厚实，终成不可逆转之势。`;
    butterflyEffect = '外部原本轻视你的各方观察家开始重新评估你的心智深度，长线合作者开始主动暗中接洽。';
    survivalProb = 85;
  } else {
    branchName += '【隐忍蓄力·待时而动】';
    immediateSummary = `你选择了极度克制与防守反击策略。先稳固住存量底牌，静观局势演变，不主动出击露出破绽。`;
    alliesReaction = '部属情绪转为谨慎戒备，部分急躁求战者有所微词，但整体防线维持稳固。';
    adversaryReaction = '敌方试探性进攻未能占得便宜，开始怀疑我方是否有深藏伏兵，行动转为谨慎摸索。';
    longTermImpact = `虽然有效规避了当下最致命的陷阱，但若长期滞后响应，可能会错失历史转瞬即逝的翻盘窗口期，需要警惕“钝刀割肉”式的资源持续消耗。`;
    butterflyEffect = '战局被拖入漫长的消耗战，胜负天平逐渐向外部宏观大势的偏转倾斜。';
    survivalProb = 70;
  }

  // 5. 与历史原案的深度对比解析
  const divergenceAnalysis = `
【历史人物当时的破局之道】：
${scenario.historicalDecision.action}

【你所作出的决策特点】：
“${userDecision.slice(0, 100)}${userDecision.length > 100 ? '...' : ''}”

【核心逻辑差异】：
${profile.name}在当时的局势下，其核心锚点在于“${scenario.historicalDecision.rationale}”。
而你的推演思路展现出了${isAggressive ? '更为果决的战术穿透力' : isSubversive ? '极高超的非对称博弈智慧' : isPragmatic ? '卓越的现代资源整合与聚焦思维' : '极强的风险规避与防守韧性'}。
你更注重${isAggressive ? '在狭窄的时间窗口内以雷霆之力改变现状' : isSubversive ? '通过信息差和不对称手段以小博大' : '稳住阵脚与可持续造血能力'}。
  `.trim();

  const mindsetContrast = `
${profile.name}身处当时的时代，背负着极其沉重的历史包袱与人际掣肘；而你作为跳出历史迷雾的现代决策者，能够从更宏观的全局上帝视角审视利益纠葛，没有陷入被动的道德或情绪内耗中。
  `.trim();

  // 6. 现代镜像映射
  const modernTakeaway = `
【投射至现代职场与创业的启示】：
当你在当下的商业竞争、职业生死关头或团队危局中面临类似“资源极度匮乏、外界虎视眈眈、内部人心浮动”的十字路口时：
1. ${isAggressive ? '果断出击是打破僵局的利刃，但必须提前想好“第二落点”的接力方案，谨防孤注一掷后力竭。' : isSubversive ? '不要在对手制定的规则里肉搏，善用信息不对称与跨界借力，用非对称竞争重新定义战场。' : '绝境之时先做减法，保住现金流与核心元气，远离情绪是非窝，扎实深耕基本盘才是抵御寒冬的最大底气。'}
2. 历史人物留下的最大遗产不是百战百胜的神话，而是在最绝望时依旧能保持清醒理智、根据底牌重新排兵布阵的强大心力。
  `.trim();

  return {
    id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    scenarioId: scenario.id,
    profileId: profile.id,
    userDecisionText: userDecision,
    timestamp: Date.now(),
    comparisonWithHistory: {
      concurrenceScore,
      divergenceAnalysis,
      mindsetContrast,
    },
    immediateReaction: {
      summary: immediateSummary,
      alliesResponse: alliesReaction,
      adversaryResponse: adversaryReaction,
    },
    futureBranchOutcome: {
      timelineBranchName: branchName,
      longTermImpact,
      survivalProbability: survivalProb,
      butterflyEffect,
    },
    dimensionsScore: {
      boldness,
      politicalShrewdness,
      resourceLeverage,
      resilience,
    },
    modernTakeaway,
  };
}
