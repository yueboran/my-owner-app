/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 卡片块编辑器 · 表格组件 (TableBlockComponent)
 * 特性：
 * 1. 结构化二维表格：支持表头切换、内联就地单元格编辑
 * 2. 行列管理：快速增删行、增删列、在特定位置插入行列
 * 3. 复制功能：一键将表格复制为 Excel/Google Sheets 兼容的 TSV 及 Markdown 文本
 * 4. 粘贴功能：支持直接捕获 Excel/网页制表符(TSV)/Markdown 文本并自动解析填充扩充表格
 * 5. 复制块：支持复制整块并在当前卡片中克隆
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Table as TableIcon,
  Plus,
  Trash2,
  Copy,
  Check,
  ClipboardPaste,
  Columns,
  Rows,
  Sparkles,
} from 'lucide-react';
import {
  type TableBlockData,
  parseTableContent,
  stringifyTableContent,
  tableToMarkdown,
  tableToTsv,
  parseTsvOrMarkdownToTable,
} from '../../types/cardBlock';

interface TableBlockComponentProps {
  content: string;
  isEditing: boolean;
  fontSizeClass?: string;
  onUpdateContent: (newContent: string) => void;
  onDeleteBlock?: () => void;
  onDuplicateBlock?: () => void;
}

export const TableBlockComponent: React.FC<TableBlockComponentProps> = ({
  content,
  isEditing,
  fontSizeClass = 'text-[16px]',
  onUpdateContent,
  onDeleteBlock,
  onDuplicateBlock,
}) => {
  // 解析当前表格结构
  const tableData = parseTableContent(content);
  const rows = tableData.rows || [['列 1', '列 2'], ['', '']];
  const hasHeader = tableData.hasHeader !== false;

  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{ r: number; c: number } | null>(null);

  // 内部同步更新
  const commitData = useCallback(
    (newRows: string[][], newHasHeader: boolean = hasHeader) => {
      const updated: TableBlockData = {
        rows: newRows,
        hasHeader: newHasHeader,
      };
      onUpdateContent(stringifyTableContent(updated));
    },
    [hasHeader, onUpdateContent]
  );

  // 单元格内容修改
  const handleCellChange = (rIndex: number, cIndex: number, value: string) => {
    const nextRows = rows.map((r, rIdx) =>
      rIdx === rIndex ? r.map((c, cIdx) => (cIdx === cIndex ? value : c)) : r
    );
    commitData(nextRows);
  };

  // 添加一行
  const handleAddRow = (targetIndex?: number) => {
    const colCount = rows[0]?.length || 2;
    const newEmptyRow = new Array(colCount).fill('');
    const nextRows = [...rows];
    if (targetIndex !== undefined) {
      nextRows.splice(targetIndex + 1, 0, newEmptyRow);
    } else {
      nextRows.push(newEmptyRow);
    }
    commitData(nextRows);
  };

  // 删除某行
  const handleDeleteRow = (rIndex: number) => {
    if (rows.length <= 1) return; // 至少保留一行
    const nextRows = rows.filter((_, idx) => idx !== rIndex);
    commitData(nextRows);
  };

  // 添加一列
  const handleAddCol = (targetIndex?: number) => {
    const nextRows = rows.map((r, rIdx) => {
      const copy = [...r];
      const defaultVal = rIdx === 0 ? `列 ${copy.length + 1}` : '';
      if (targetIndex !== undefined) {
        copy.splice(targetIndex + 1, 0, defaultVal);
      } else {
        copy.push(defaultVal);
      }
      return copy;
    });
    commitData(nextRows);
  };

  // 删除某列
  const handleDeleteCol = (cIndex: number) => {
    const colCount = rows[0]?.length || 0;
    if (colCount <= 1) return; // 至少保留一列
    const nextRows = rows.map((r) => r.filter((_, idx) => idx !== cIndex));
    commitData(nextRows);
  };

  // 复制表格数据（TSV 格式，完美兼容 Excel、Numbers 与 Markdown）
  const handleCopyTable = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const tsvText = tableToTsv(tableData);
    try {
      await navigator.clipboard.writeText(tsvText);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    } catch (_err) {
      // 降级使用 textarea
      const el = document.createElement('textarea');
      el.value = tsvText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    }
  };

  // 智能粘贴：在单元格内粘贴 Excel 或制表符数据
  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    startR: number,
    startC: number
  ) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    // 检查是否包含多列或多行（制表符或换行）
    if (pastedText.includes('\t') || pastedText.includes('\n')) {
      e.preventDefault();
      const parsed = parseTsvOrMarkdownToTable(pastedText);
      const pasteRows = parsed.rows;
      if (pasteRows.length === 0) return;

      // 计算需要扩展的最大行与最大列
      const targetRowsNeeded = Math.max(rows.length, startR + pasteRows.length);
      const pasteMaxCols = Math.max(...pasteRows.map((r) => r.length));
      const targetColsNeeded = Math.max(rows[0]?.length || 0, startC + pasteMaxCols);

      // 构建新网格
      const nextRows: string[][] = [];
      for (let r = 0; r < targetRowsNeeded; r++) {
        const rowData: string[] = [];
        for (let c = 0; c < targetColsNeeded; c++) {
          const pasteRIndex = r - startR;
          const pasteCIndex = c - startC;

          if (
            pasteRIndex >= 0 &&
            pasteRIndex < pasteRows.length &&
            pasteCIndex >= 0 &&
            pasteCIndex < pasteRows[pasteRIndex].length
          ) {
            rowData.push(pasteRows[pasteRIndex][pasteCIndex]);
          } else if (r < rows.length && c < rows[r].length) {
            rowData.push(rows[r][c]);
          } else {
            rowData.push('');
          }
        }
        nextRows.push(rowData);
      }

      commitData(nextRows);
    }
  };

  // 从剪贴板整体导入/替换当前表格
  const handleImportFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) return;
      const parsed = parseTsvOrMarkdownToTable(text);
      if (parsed.rows.length > 0) {
        commitData(parsed.rows);
      }
    } catch (_e) {
      alert('请先复制 Excel、CSV 或 Markdown 表格文本后再点击粘贴导入');
    }
  };

  // =========================================================================
  // 1. 阅读只读态渲染
  // =========================================================================
  if (!isEditing) {
    return (
      <div className="my-3 overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-2xs group/table relative">
        {/* 只读态快捷工具浮层 */}
        <div className="absolute right-2 top-2 z-10 opacity-0 group-hover/table:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleCopyTable}
            className="p-1 rounded-md bg-white/90 border border-stone-200 text-stone-600 hover:text-indigo-600 shadow-2xs text-xs flex items-center gap-1 backdrop-blur-xs cursor-pointer"
            title="复制表格数据（可直接粘贴至 Excel）"
          >
            {copiedFeedback ? (
              <>
                <Check size={12} className="text-emerald-600" />
                <span className="text-[11px] text-emerald-600 font-medium">已复制</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span className="text-[11px] font-medium">复制数据</span>
              </>
            )}
          </button>
        </div>

        <div className="overflow-x-auto scrollbar-refined">
          <table className="w-full border-collapse text-left text-xs md:text-sm">
            <tbody>
              {rows.map((row, rIdx) => {
                const isHeaderRow = rIdx === 0 && hasHeader;
                return (
                  <tr
                    key={rIdx}
                    className={`border-b border-stone-200 last:border-b-0 transition-colors ${
                      isHeaderRow ? 'bg-stone-50/90 font-semibold text-stone-900' : 'hover:bg-stone-50/40 text-stone-700'
                    }`}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`p-2.5 md:p-3 border-r border-stone-200 last:border-r-0 align-top ${fontSizeClass}`}
                      >
                        {cell || <span className="text-stone-300 font-mono">-</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. 编辑态渲染
  // =========================================================================
  return (
    <div className="my-3 rounded-2xl border border-teal-200/90 bg-white shadow-xs p-3.5 space-y-3 relative group/editTable">
      {/* 顶部表格快捷操作栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1 text-xs font-semibold">
            <TableIcon size={13} />
            <span>表格组件</span>
          </span>

          <span className="text-xs text-stone-400 font-mono">
            {rows.length} 行 × {rows[0]?.length || 0} 列
          </span>
        </div>

        {/* 工具按键组 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleAddRow()}
            className="px-2 py-1 text-xs rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="在末尾新增一行"
          >
            <Rows size={12} className="text-stone-500" />
            <span>+ 行</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddCol()}
            className="px-2 py-1 text-xs rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="在末尾新增一列"
          >
            <Columns size={12} className="text-stone-500" />
            <span>+ 列</span>
          </button>

          <button
            type="button"
            onClick={handleCopyTable}
            className="px-2 py-1 text-xs rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="复制表格为 Excel / TSV 格式"
          >
            {copiedFeedback ? (
              <Check size={12} className="text-emerald-600" />
            ) : (
              <Copy size={12} className="text-stone-500" />
            )}
            <span>{copiedFeedback ? '已复制' : '复制数据'}</span>
          </button>

          <button
            type="button"
            onClick={handleImportFromClipboard}
            className="px-2 py-1 text-xs rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="从剪贴板粘贴 Excel / Markdown 表格覆盖"
          >
            <ClipboardPaste size={12} className="text-indigo-600" />
            <span>粘贴数据</span>
          </button>

          {onDuplicateBlock && (
            <button
              type="button"
              onClick={onDuplicateBlock}
              className="p-1 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer"
              title="复制并追加此表格块"
            >
              <Copy size={13} />
            </button>
          )}

          {onDeleteBlock && (
            <button
              type="button"
              onClick={onDeleteBlock}
              className="p-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-500 transition-colors cursor-pointer"
              title="删除此表格块"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 表格可滚动输入区 */}
      <div className="overflow-x-auto scrollbar-refined rounded-xl border border-stone-200">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            {/* 顶端列操作微控制器 */}
            <tr className="bg-stone-100/70 text-stone-500 text-[11px] border-b border-stone-200 select-none">
              <th className="w-8 p-1 text-center font-mono text-stone-400">#</th>
              {rows[0]?.map((_, cIdx) => (
                <th key={cIdx} className="p-1 text-center border-r border-stone-200 last:border-r-0">
                  <div className="flex items-center justify-center gap-1 group/colCtrl">
                    <span className="font-mono text-stone-400">C{cIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleAddCol(cIdx)}
                      className="p-0.5 hover:text-teal-600 rounded"
                      title="在此列后插入列"
                    >
                      <Plus size={10} />
                    </button>
                    {rows[0].length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCol(cIdx)}
                        className="p-0.5 hover:text-rose-500 rounded"
                        title="删除该列"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => {
              const isHeaderRow = rIdx === 0 && hasHeader;
              return (
                <tr
                  key={rIdx}
                  className={`border-b border-stone-200 last:border-b-0 ${
                    isHeaderRow ? 'bg-stone-50/90 font-semibold' : 'hover:bg-stone-50/30'
                  }`}
                >
                  {/* 左侧行控制器 */}
                  <td className="w-8 p-1 text-center border-r border-stone-200 bg-stone-100/50 select-none align-middle">
                    <div className="flex items-center justify-center gap-0.5 group/rowCtrl">
                      <span className="font-mono text-[10px] text-stone-400">{rIdx + 1}</span>
                      <div className="hidden group-hover/rowCtrl:flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleAddRow(rIdx)}
                          className="hover:text-teal-600"
                          title="在此行后插入行"
                        >
                          <Plus size={9} />
                        </button>
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(rIdx)}
                            className="hover:text-rose-500"
                            title="删除该行"
                          >
                            <Trash2 size={9} />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 单元格输入框 */}
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="p-1 border-r border-stone-200 last:border-r-0 align-top"
                    >
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                        onPaste={(e) => handleCellPaste(e, rIdx, cIdx)}
                        onFocus={() => setFocusedCell({ r: rIdx, c: cIdx })}
                        placeholder={isHeaderRow ? `表头 ${cIdx + 1}` : '输入内容...'}
                        className={`w-full p-1.5 rounded-lg border border-transparent hover:border-stone-200 focus:border-teal-500 focus:bg-white bg-transparent outline-none transition-all ${fontSizeClass} ${
                          isHeaderRow ? 'font-semibold text-stone-900' : 'text-stone-700'
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 底部贴心操作提示 */}
      <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
        <span>💡 支持从 Excel 直接复制粘贴一片单元格自动填充</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddRow()}
            className="text-teal-600 hover:text-teal-700 font-medium cursor-pointer"
          >
            + 快速增行
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleAddCol()}
            className="text-teal-600 hover:text-teal-700 font-medium cursor-pointer"
          >
            + 快速增列
          </button>
        </div>
      </div>
    </div>
  );
};
