/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 通用文档导出工具：支持导出为 PDF 与 Markdown (.md)
 * 适用于：工作日记 · 商业研报 · 个人传记 · 知识卡片 · 事件流程
 */

import type { CardBlock } from '../types/cardBlock';

export interface ExportCardOptions {
  title: string;
  date?: string;
  updatedAt?: number | string;
  tags?: string[];
  content?: string;
  blocks?: CardBlock[];
  extraMeta?: Record<string, string>;
  extraSections?: Array<{ title: string; content: string }>;
  filename?: string;
}

/**
 * 将卡片/文档数据转为标准 Markdown 格式
 */
export function generateMarkdown(options: ExportCardOptions): string {
  const lines: string[] = [];

  // 1. 标题
  lines.push(`# ${options.title || '无标题文档'}`);
  lines.push('');

  // 2. 核心指标与元数据
  const metaParts: string[] = [];
  if (options.date) metaParts.push(`📅 **日期**：${options.date}`);
  if (options.updatedAt) {
    const timeStr =
      typeof options.updatedAt === 'number'
        ? new Date(options.updatedAt).toLocaleString('zh-CN', { hour12: false })
        : options.updatedAt;
    metaParts.push(`⏱️ **更新时间**：${timeStr}`);
  }
  if (options.tags && options.tags.length > 0) {
    metaParts.push(`🏷️ **标签**：${options.tags.map((t) => `#${t}`).join(' ')}`);
  }
  if (options.extraMeta) {
    Object.entries(options.extraMeta).forEach(([k, v]) => {
      if (v) metaParts.push(`📌 **${k}**：${v}`);
    });
  }
  if (metaParts.length > 0) {
    lines.push(`> ${metaParts.join('  |  ')}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // 3. 额外专属章节（如商业分析核心结论、个人传记定论）
  if (options.extraSections && options.extraSections.length > 0) {
    options.extraSections.forEach((sec) => {
      lines.push(`## ${sec.title}`);
      lines.push('');
      lines.push(sec.content);
      lines.push('');
    });
  }

  // 4. 块组件转换
  if (options.blocks && options.blocks.length > 0) {
    options.blocks.forEach((b) => {
      if (b.type === 'heading') {
        const lvl = b.meta?.level || 2;
        const prefix = '#'.repeat(lvl);
        lines.push(`${prefix} ${b.content}`);
        lines.push('');
      } else if (b.type === 'paragraph') {
        let text = b.content || '';
        // 转换高亮与行内样式为标准 markdown
        text = text.replace(/<mark[^>]*>([\s\S]+?)<\/mark>/gi, '==$1==');
        text = text.replace(/<span style="color:[^"]*">([\s\S]+?)<\/span>/gi, '$1');
        text = text.replace(/<strong>([\s\S]+?)<\/strong>/gi, '**$1**');
        text = text.replace(/<b>([\s\S]+?)<\/b>/gi, '**$1**');
        text = text.replace(/<u>([\s\S]+?)<\/u>/gi, '$1');
        lines.push(text);
        lines.push('');
      } else if (b.type === 'ai-insight') {
        lines.push(`> 💡 **${b.meta?.title || '摘要 / 核心洞察'}**`);
        lines.push(`> ${b.content.replace(/\n/g, '\n> ')}`);
        lines.push('');
      } else if (b.type === 'quote') {
        lines.push(`> ${b.content.replace(/\n/g, '\n> ')}`);
        lines.push('');
      } else if (b.type === 'code') {
        lines.push(`\`\`\`${b.meta?.language || ''}`);
        lines.push(b.content);
        lines.push('```');
        lines.push('');
      } else if (b.type === 'todo') {
        lines.push(`- [${b.meta?.checked ? 'x' : ' '}] ${b.content}`);
      } else if (b.type === 'link') {
        lines.push(`🔗 [${b.meta?.title || b.content}](${b.meta?.url || b.content})`);
        lines.push('');
      } else if (b.type === 'table') {
        try {
          const tableData = JSON.parse(b.content);
          if (tableData && tableData.headers && tableData.rows) {
            lines.push(`| ${tableData.headers.join(' | ')} |`);
            lines.push(`| ${tableData.headers.map(() => '---').join(' | ')} |`);
            tableData.rows.forEach((row: string[]) => {
              lines.push(`| ${row.join(' | ')} |`);
            });
            lines.push('');
          }
        } catch {
          lines.push(b.content);
          lines.push('');
        }
      } else if (b.type === 'image') {
        lines.push(`![${b.meta?.caption || '图片'}](${b.content})`);
        if (b.meta?.caption) lines.push(`*${b.meta.caption}*`);
        lines.push('');
      }
    });
  } else if (options.content) {
    lines.push(options.content);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 触发 Markdown (.md) 文件下载
 */
export function exportToMarkdown(options: ExportCardOptions): void {
  const mdContent = generateMarkdown(options);
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle = (options.filename || options.title || '文档').replace(/[\\/:*?"<>|]/g, '_');
  a.href = url;
  a.download = `${safeTitle}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 生成并打开纯净矢量 PDF 打印窗口（支持所有现代浏览器另存为 PDF）
 */
export function exportToPdf(options: ExportCardOptions): void {
  const safeTitle = (options.title || '文档').replace(/[\\/:*?"<>|]/g, '_');

  // 构建打印专属 HTML
  let blocksHtml = '';
  if (options.blocks && options.blocks.length > 0) {
    options.blocks.forEach((b) => {
      if (b.type === 'heading') {
        blocksHtml += `<h2 style="font-size: 20px; font-weight: bold; margin: 18px 0 8px 0; color: #0f172a;">${b.content}</h2>`;
      } else if (b.type === 'paragraph') {
        let contentHtml = b.content
          .replace(/==([\s\S]+?)==/g, '<mark style="background-color: #fef08a; padding: 2px 4px; border-radius: 3px;">$1</mark>')
          .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br/>');
        const style = b.meta?.textColor ? `color: ${b.meta.textColor};` : 'color: #334155;';
        const bgStyle = b.meta?.highlightBg ? `background-color: ${b.meta.highlightBg}; padding: 8px 12px; border-radius: 8px;` : '';
        blocksHtml += `<p style="font-size: 15px; line-height: 1.75; margin: 10px 0; font-family: Georgia, serif; ${style} ${bgStyle}">${contentHtml}</p>`;
      } else if (b.type === 'ai-insight') {
        blocksHtml += `
          <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 10px 14px; margin: 14px 0; border-radius: 0 8px 8px 0;">
            <div style="font-size: 13px; font-weight: bold; color: #4338ca; margin-bottom: 4px;">💡 ${b.meta?.title || '核心摘要与复盘洞察'}</div>
            <div style="font-size: 14px; color: #334155; line-height: 1.6;">${b.content.replace(/\n/g, '<br/>')}</div>
          </div>
        `;
      } else if (b.type === 'quote') {
        blocksHtml += `<blockquote style="border-left: 3px solid #cbd5e1; padding-left: 12px; color: #64748b; font-style: italic; margin: 12px 0;">${b.content}</blockquote>`;
      } else if (b.type === 'table') {
        try {
          const tableData = JSON.parse(b.content);
          if (tableData && tableData.headers && tableData.rows) {
            let ths = tableData.headers.map((h: string) => `<th style="border: 1px solid #cbd5e1; padding: 8px 12px; background: #f8fafc; text-align: left; font-weight: 600;">${h}</th>`).join('');
            let trs = tableData.rows.map((row: string[]) => `<tr>${row.map((cell: string) => `<td style="border: 1px solid #e2e8f0; padding: 8px 12px;">${cell}</td>`).join('')}</tr>`).join('');
            blocksHtml += `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
          }
        } catch {
          blocksHtml += `<p>${b.content}</p>`;
        }
      }
    });
  } else if (options.content) {
    blocksHtml += `<p style="font-size: 15px; line-height: 1.75; color: #334155;">${options.content.replace(/\n/g, '<br/>')}</p>`;
  }

  // 专属章节
  let extraSectionsHtml = '';
  if (options.extraSections && options.extraSections.length > 0) {
    options.extraSections.forEach((sec) => {
      extraSectionsHtml += `
        <div style="margin: 18px 0; padding: 12px 16px; background-color: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4;">
          <h3 style="font-size: 16px; font-weight: bold; margin: 0 0 6px 0; color: #1c1917;">${sec.title}</h3>
          <p style="font-size: 14px; line-height: 1.6; margin: 0; color: #44403c;">${sec.content.replace(/\n/g, '<br/>')}</p>
        </div>
      `;
    });
  }

  const metaHtml = [
    options.date ? `<span>📅 日期：${options.date}</span>` : '',
    options.updatedAt ? `<span>⏱️ 更新：${typeof options.updatedAt === 'number' ? new Date(options.updatedAt).toLocaleString('zh-CN', { hour12: false }) : options.updatedAt}</span>` : '',
    options.tags && options.tags.length > 0 ? `<span>🏷️ 标签：${options.tags.join(' ')}</span>` : '',
  ]
    .filter(Boolean)
    .join(' &nbsp; | &nbsp; ');

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${safeTitle}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          .header-meta {
            font-size: 12px;
            color: #64748b;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
            margin-bottom: 20px;
          }
          h1 {
            font-size: 26px;
            font-weight: 800;
            margin: 0 0 10px 0;
            color: #0f172a;
            letter-spacing: -0.02em;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1>${options.title || '无标题文档'}</h1>
        <div class="header-meta">${metaHtml}</div>
        ${extraSectionsHtml}
        ${blocksHtml}
      </body>
    </html>
  `;

  // 创建隐藏的打印 iframe 调起原生另存为 PDF
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(fullHtml);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {
          // 容错
        }
      }, 2000);
    }, 400);
  }
}
