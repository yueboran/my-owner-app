/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 卡片内嵌式块编辑器 (Block-based Editor) 统一数据模型与跨模块适配器
 * 支持：工作日记 (JournalEntry) · 知识收集 (KnowledgeClip) · 画布节点 (CanvasItem)
 */

export type CardBlockType =
  | 'paragraph'   // 文本段落
  | 'heading'     // 标题 (H1, H2, H3)
  | 'ai-insight'  // AI 提炼核心
  | 'image'       // 图片/图表附件 (支持缩放与对齐)
  | 'code'        // 代码块
  | 'quote'       // 引用块
  | 'callout'     // 重点提示框
  | 'todo'        // 待办/检查清单
  | 'link'        // 外部链接卡片
  | 'table';      // 表格组件 (支持增删行列、复制粘贴、单元格编辑)

/** 字体大小级别：16px · 18px · 20px · 22px（并兼容历史命名） */
export type FontSizeLevel = '16' | '18' | '20' | '22' | 'xs' | 'sm' | 'base' | 'lg' | 'xl';

export const AVAILABLE_FONT_SIZES: FontSizeLevel[] = ['16', '18', '20', '22'];

export const FONT_SIZE_CONFIG: Record<
  FontSizeLevel,
  { label: string; shortLabel: string; px: string; textClass: string; headingClass: string }
> = {
  '16': { label: '16px', shortLabel: '16px', px: '16px', textClass: 'text-[16px] leading-relaxed', headingClass: 'text-xl font-bold' },
  '18': { label: '18px (默认)', shortLabel: '18px', px: '18px', textClass: 'text-[18px] leading-relaxed', headingClass: 'text-2xl font-bold' },
  '20': { label: '20px', shortLabel: '20px', px: '20px', textClass: 'text-[20px] leading-loose', headingClass: 'text-3xl font-bold' },
  '22': { label: '22px', shortLabel: '22px', px: '22px', textClass: 'text-[22px] leading-loose', headingClass: 'text-4xl font-bold' },
  // 兼容原有命名级别，平滑映射到新字号
  xs: { label: '16px', shortLabel: '16px', px: '16px', textClass: 'text-[16px] leading-relaxed', headingClass: 'text-xl font-bold' },
  sm: { label: '18px (默认)', shortLabel: '18px', px: '18px', textClass: 'text-[18px] leading-relaxed', headingClass: 'text-2xl font-bold' },
  base: { label: '18px (默认)', shortLabel: '18px', px: '18px', textClass: 'text-[18px] leading-relaxed', headingClass: 'text-2xl font-bold' },
  lg: { label: '20px', shortLabel: '20px', px: '20px', textClass: 'text-[20px] leading-loose', headingClass: 'text-3xl font-bold' },
  xl: { label: '22px', shortLabel: '22px', px: '22px', textClass: 'text-[22px] leading-loose', headingClass: 'text-4xl font-bold' },
};

/** 单个块的数据结构 */
export interface CardBlock {
  id: string;
  type: CardBlockType;
  content: string; // 块的主体内容（文本、代码、图片URL等）
  meta?: {
    level?: 1 | 2 | 3;
    fontSize?: FontSizeLevel; // 块级字体大小微调
    widthPercent?: 100 | 75 | 50; // 图片宽度：100%全宽 / 75%中等 / 50%紧凑
    align?: 'left' | 'center' | 'right';
    colorTheme?: 'emerald' | 'sky' | 'indigo' | 'amber' | 'purple'; // AI提炼/提示框主题
    checked?: boolean; // 待办项勾选状态
    caption?: string; // 图片或附件说明
    fileName?: string; // 附件文件名
    fileSize?: string; // 附件大小
    language?: string; // 代码语言
    title?: string; // 提示框或外链标题
    url?: string; // 外链地址
    textColor?: string; // 块级字体颜色
    highlightBg?: string; // 块级标注背景色
  };
}

/** 主标题与标题块的字号级别：18px (H3) · 24px (H2) · 30px (H1) */
export type TitleFontSizeLevel = '18' | '24' | '30';

export const HEADING_FONT_SIZE_CONFIG: Record<
  TitleFontSizeLevel,
  { label: string; shortLabel: string; px: string; headingClass: string; level: number }
> = {
  '18': { label: 'H3 (18px)', shortLabel: '18px', px: '18px', headingClass: 'text-[18px] font-bold text-stone-800 leading-normal', level: 3 },
  '24': { label: 'H2 (24px)', shortLabel: '24px', px: '24px', headingClass: 'text-[24px] font-bold text-stone-900 tracking-tight leading-snug', level: 2 },
  '30': { label: 'H1 (30px)', shortLabel: '30px', px: '30px', headingClass: 'text-[30px] font-bold text-stone-900 tracking-tight leading-tight', level: 1 },
};

/** 通用卡片与研报实体接口（统一抽象工作日记、知识收集、商业研报与个人传记） */
export interface GenericCardEntity {
  id: string;
  title: string;
  titleFontSize?: TitleFontSizeLevel; // 主标题字号等级 ('18' | '24' | '30')
  content?: string;
  subtitle?: string;
  globalFontSize?: FontSizeLevel; // 卡片级全局基准正文字号
  executiveSummary?: string; // 商业研报中的核心战略结论
  sections?: Array<{ id: string; title: string; content: string }>; // 商业研报结构化章节
  coreInsights?: string[]; // 商业研报关键洞察
  aiReflection?: string; // 日记中的 AI 复盘洞察
  aiSummary?: string; // 知识收集中的 AI 提炼核心
  sourceUrl?: string; // 知识收集的来源链接
  attachments?: any[]; // 附件列表
  attachmentPosition?: 'top' | 'bottom';
  blocks?: CardBlock[];
  // 个人传记专属字段支持
  motto?: string;
  overview?: string;
  tagline?: string;
  era?: string;
  timeline?: Array<{
    id?: string;
    year: string;
    title: string;
    description: string;
    lessonLearned?: string;
    [key: string]: any;
  }>;
  analysis?: {
    successFactors?: string[];
    failureLessons?: string[];
    actionableInsights?: string[];
    luckAndTiming?: string[];
    [key: string]: any;
  };
  // 刻意训练专属字段支持
  targetGoal?: string; // 终极目标/心理表征
  level?: string;
  materials?: any[]; // 训练物料清单
}

/**
 * 将任意卡片/研报/传记/训练实体平滑转换为统一块列表 (Block-based representation)
 */
export function cardToBlocks(card: GenericCardEntity): CardBlock[] {
  // 如果日记/知识卡片/研报/传记/训练中已经存有 blocks，直接返回
  if (card.blocks && Array.isArray(card.blocks) && card.blocks.length > 0) {
    return card.blocks;
  }

  const blocks: CardBlock[] = [];
  const attachments = card.attachments || [];
  const position = card.attachmentPosition || 'bottom';

  // 1. 如果附件在上方，先放置图片/附件块
  if (position === 'top' && attachments.length > 0) {
    attachments.forEach((att) => {
      blocks.push({
        id: `block-att-${att.id}`,
        type: 'image',
        content: att.url || '',
        meta: {
          caption: att.name,
          fileName: att.name,
          fileSize: att.size ? `${Math.round(att.size / 1024)} KB` : undefined,
          widthPercent: 100,
          align: 'center',
        },
      });
    });
  }

  // 2. 刻意训练：终极目标与核心心理表征
  if (card.targetGoal && card.targetGoal.trim()) {
    blocks.push({
      id: `block-practice-target-${card.id}`,
      type: 'ai-insight',
      content: card.targetGoal.trim(),
      meta: {
        title: '训练终极目标与心理表征 (Target Goal & Mental Representation)',
        colorTheme: 'sky',
      },
    });
  } else if (card.motto || card.tagline) {
    // 传世名言 / 一句话定论
    blocks.push({
      id: `block-bio-motto-${card.id}`,
      type: 'ai-insight',
      content: card.motto
        ? `“${card.motto}”\n${card.tagline ? `—— ${card.tagline}` : ''}`
        : (card.tagline || ''),
      meta: {
        title: '传世名言与一句话定论',
        colorTheme: 'amber',
      },
    });
  } else {
    const aiText = card.executiveSummary || card.aiSummary || card.aiReflection;
    if (aiText && aiText.trim()) {
      blocks.push({
        id: `block-ai-${card.id}`,
        type: 'ai-insight',
        content: aiText.trim(),
        meta: {
          title: card.executiveSummary
            ? '执行摘要与核心战略结论 (Executive Summary)'
            : 'AI 提炼核心',
          colorTheme: card.executiveSummary ? 'sky' : 'emerald',
        },
      });
    }
  }

  // 3. 个人传记生平梗概
  if (card.overview && card.overview.trim()) {
    blocks.push({
      id: `block-bio-overview-h-${card.id}`,
      type: 'heading',
      content: '生平概览与历史背景',
      meta: { level: 2 },
    });
    const overviewParts = card.overview.split(/\n\s*\n/).filter((p) => p.trim());
    overviewParts.forEach((p, idx) => {
      blocks.push({
        id: `block-bio-overview-p-${card.id}-${idx}`,
        type: 'paragraph',
        content: p.trim(),
      });
    });
  }

  // 3. 正文段落或研报章节拆分
  if (card.sections && Array.isArray(card.sections) && card.sections.length > 0) {
    // 商业研报章节拆分
    card.sections.forEach((sec, sIdx) => {
      if (sec.title) {
        blocks.push({
          id: `block-sec-h-${card.id}-${sIdx}`,
          type: 'heading',
          content: sec.title,
          meta: { level: 2 },
        });
      }
      if (sec.content) {
        const pList = sec.content.split(/\n\s*\n/).filter((p) => p.trim());
        pList.forEach((p, pIdx) => {
          blocks.push({
            id: `block-sec-p-${card.id}-${sIdx}-${pIdx}`,
            type: 'paragraph',
            content: p.trim(),
          });
        });
      }
    });
  } else {
    // 普通正文段落拆分
    const content = card.content || '';
    if (content.trim()) {
      const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
      if (paragraphs.length > 0) {
        paragraphs.forEach((p, idx) => {
          blocks.push({
            id: `block-p-${card.id}-${idx}`,
            type: 'paragraph',
            content: p.trim(),
          });
        });
      } else {
        blocks.push({
          id: `block-p-${card.id}-0`,
          type: 'paragraph',
          content: content.trim(),
        });
      }
    }
  }

  // 4. 商业洞察 (如有)
  if (card.coreInsights && Array.isArray(card.coreInsights) && card.coreInsights.length > 0) {
    blocks.push({
      id: `block-insights-heading-${card.id}`,
      type: 'heading',
      content: '战略研判提炼：三大关键商业洞察 (Core Insights)',
      meta: { level: 2 },
    });
    card.coreInsights.forEach((ins, idx) => {
      blocks.push({
        id: `block-ins-${card.id}-${idx}`,
        type: 'quote',
        content: `${idx + 1}. ${ins}`,
      });
    });
  }

  // 5. 生平历史大事件 或 刻意训练轴线突破心得 (timeline)
  if (card.timeline && Array.isArray(card.timeline) && card.timeline.length > 0) {
    const isPracticeRecord = Boolean(card.timeline[0]?.reflection || card.timeline[0]?.durationMinutes);
    blocks.push({
      id: `block-tl-h-${card.id}`,
      type: 'heading',
      content: isPracticeRecord
        ? '成长突破与认知刻意练习轴线 (Timeline)'
        : '生平纪年与关键历史节点 (Timeline)',
      meta: { level: 2 },
    });
    card.timeline.forEach((item, idx) => {
      if (item.reflection) {
        // 刻意训练心得
        blocks.push({
          id: `block-tl-${card.id}-${idx}`,
          type: 'quote',
          content: `【${item.date || ''} · ${item.durationMinutes ? `${item.durationMinutes}分钟` : ''}】${item.title}\n${item.reflection}${
            item.breakthroughPoint ? `\n🎯 心理表征与突破点：${item.breakthroughPoint}` : ''
          }`,
        });
      } else {
        // 传记大事件
        blocks.push({
          id: `block-tl-${card.id}-${idx}`,
          type: 'quote',
          content: `【${item.year}】${item.title}\n${item.description}${
            item.lessonLearned ? `\n💡 鉴戒与启示：${item.lessonLearned}` : ''
          }`,
        });
      }
    });
  }

  // 6. 刻意训练配套物料清单 (materials)
  if (card.materials && Array.isArray(card.materials) && card.materials.length > 0) {
    blocks.push({
      id: `block-mat-h-${card.id}`,
      type: 'heading',
      content: '配套精选训练物料与参考文档',
      meta: { level: 2 },
    });
    card.materials.forEach((mat, idx) => {
      const statusText = mat.status === 'completed' ? '已完成' : mat.status === 'in_progress' ? '进行中' : '待精读';
      blocks.push({
        id: `block-mat-${card.id}-${idx}`,
        type: 'todo',
        content: `【${mat.name}】(${statusText})${mat.notes ? ` —— ${mat.notes}` : ''}${mat.url ? ` (${mat.url})` : ''}`,
        meta: {
          checked: mat.status === 'completed',
        },
      });
    });
  }

  // 6. 传记深度复盘与成败鉴戒 (analysis)
  if (card.analysis) {
    const { successFactors, failureLessons, actionableInsights } = card.analysis;
    if (
      (successFactors && successFactors.length > 0) ||
      (failureLessons && failureLessons.length > 0) ||
      (actionableInsights && actionableInsights.length > 0)
    ) {
      blocks.push({
        id: `block-matrix-h-${card.id}`,
        type: 'heading',
        content: '以史为鉴：成败复盘与当代决策启示',
        meta: { level: 2 },
      });
      if (successFactors && successFactors.length > 0) {
        blocks.push({
          id: `block-matrix-sf-${card.id}`,
          type: 'callout',
          content: successFactors.join('\n'),
          meta: { title: '成功核心基石 (Success Factors)', colorTheme: 'emerald' },
        });
      }
      if (failureLessons && failureLessons.length > 0) {
        blocks.push({
          id: `block-matrix-fl-${card.id}`,
          type: 'callout',
          content: failureLessons.join('\n'),
          meta: { title: '失误教训与战略盲区 (Failure Lessons)', colorTheme: 'amber' },
        });
      }
      if (actionableInsights && actionableInsights.length > 0) {
        blocks.push({
          id: `block-matrix-ai-${card.id}`,
          type: 'callout',
          content: actionableInsights.join('\n'),
          meta: { title: '当代可迁移启示 (Actionable Insights)', colorTheme: 'indigo' },
        });
      }
    }
  }

  // 7. 如果有外部来源链接，放置链接块
  if (card.sourceUrl && card.sourceUrl.trim()) {
    blocks.push({
      id: `block-link-${card.id}`,
      type: 'link',
      content: card.sourceUrl.trim(),
      meta: {
        url: card.sourceUrl.trim(),
        title: card.sourceUrl.trim(),
      },
    });
  }

  // 5. 如果附件在下方，放置图片/附件块
  if (position !== 'top' && attachments.length > 0) {
    attachments.forEach((att) => {
      blocks.push({
        id: `block-att-${att.id}`,
        type: 'image',
        content: att.url || '',
        meta: {
          caption: att.name,
          fileName: att.name,
          fileSize: att.size ? `${Math.round(att.size / 1024)} KB` : undefined,
          widthPercent: 100,
          align: 'center',
        },
      });
    });
  }

  return blocks;
}

/** 表格组件数据结构 */
export interface TableBlockData {
  rows: string[][]; // 二维字符串数组，rows[0] 通常为表头
  hasHeader?: boolean; // 是否包含表头高亮样式 (默认 true)
}

/** 默认空表格初始化 (3行3列) */
export function createDefaultTableData(rows = 3, cols = 3): TableBlockData {
  const data: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      if (r === 0) {
        row.push(`列 ${c + 1}`);
      } else {
        row.push('');
      }
    }
    data.push(row);
  }
  return { rows: data, hasHeader: true };
}

/** 解析表格字符串为结构化对象 (支持 JSON 或 Markdown 表格) */
export function parseTableContent(content: string): TableBlockData {
  if (!content || !content.trim()) {
    return createDefaultTableData(3, 3);
  }
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
      return {
        rows: parsed.rows.map((r: any) => (Array.isArray(r) ? r.map(String) : [String(r)])),
        hasHeader: parsed.hasHeader !== false,
      };
    }
  } catch (_e) {
    // 尝试按 Markdown 表格或 TSV 解析
    return parseTsvOrMarkdownToTable(content);
  }
  return createDefaultTableData(3, 3);
}

/** 序列化表格结构为持久化 JSON 字符串 */
export function stringifyTableContent(data: TableBlockData): string {
  return JSON.stringify(data);
}

/** 将表格转换为 Markdown 格式字符串 */
export function tableToMarkdown(data: TableBlockData): string {
  if (!data.rows || data.rows.length === 0) return '';
  const lines: string[] = [];
  data.rows.forEach((row, rIndex) => {
    lines.push(`| ${row.map((cell) => cell.replace(/\|/g, '\\|') || ' ').join(' | ')} |`);
    if (rIndex === 0 && data.hasHeader !== false) {
      lines.push(`| ${row.map(() => '---').join(' | ')} |`);
    }
  });
  return lines.join('\n');
}

/** 将表格转换为 TSV 格式 (兼容 Excel / Google Sheets 复制粘贴) */
export function tableToTsv(data: TableBlockData): string {
  if (!data.rows || data.rows.length === 0) return '';
  return data.rows.map((row) => row.join('\t')).join('\n');
}

/** 从 TSV (制表符) 或 Markdown 表格文本解析为表格对象 */
export function parseTsvOrMarkdownToTable(text: string): TableBlockData {
  const clean = text.trim();
  if (!clean) return createDefaultTableData(3, 3);

  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const isMarkdown = lines.some((l) => l.includes('|'));

  if (isMarkdown) {
    const parsedRows: string[][] = [];
    lines.forEach((line) => {
      // 忽略分隔线行 |---|---|
      if (/^\s*\|?\s*[-:]+[-|\s:]+\|?\s*$/.test(line)) return;
      const trimmed = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '');
      const cells = trimmed.split('|').map((c) => c.trim());
      if (cells.length > 0) {
        parsedRows.push(cells);
      }
    });

    if (parsedRows.length > 0) {
      // 统一列数
      const maxCols = Math.max(...parsedRows.map((r) => r.length));
      const normalized = parsedRows.map((r) => {
        const copy = [...r];
        while (copy.length < maxCols) copy.push('');
        return copy;
      });
      return { rows: normalized, hasHeader: true };
    }
  }

  // TSV 解析 (从 Excel 或剪贴板制表符)
  const rows = lines.map((line) => line.split('\t').map((c) => c.trim()));
  const maxCols = Math.max(1, ...rows.map((r) => r.length));
  const normalizedRows = rows.map((r) => {
    const copy = [...r];
    while (copy.length < maxCols) copy.push('');
    return copy;
  });

  return { rows: normalizedRows, hasHeader: true };
}

/** 兼容旧日记接口 */
export const entryToBlocks = cardToBlocks;

/**
 * 将块列表序列化回卡片正文字符串 (保持向后兼容)
 */
export function blocksToContent(blocks: CardBlock[]): string {
  return blocks
    .filter(
      (b) =>
        b.type === 'paragraph' ||
        b.type === 'heading' ||
        b.type === 'quote' ||
        b.type === 'code' ||
        b.type === 'table'
    )
    .map((b) => {
      if (b.type === 'table') {
        const tableData = parseTableContent(b.content);
        return tableToMarkdown(tableData);
      }
      return b.content;
    })
    .join('\n\n');
}

/**
 * 从块列表中提取 AI 提炼内容
 */
export function extractAiReflectionFromBlocks(blocks: CardBlock[]): string | undefined {
  const aiBlock = blocks.find((b) => b.type === 'ai-insight');
  return aiBlock ? aiBlock.content : undefined;
}

