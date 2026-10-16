/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 通用导出操作按钮组：一键导出为 PDF 与 导出为 MD
 */

import React, { useState } from 'react';
import { FileText, FileDown, Check } from 'lucide-react';
import { exportToMarkdown, exportToPdf, type ExportCardOptions } from '../../utils/exportHelpers';

interface ExportActionButtonsProps {
  options: ExportCardOptions;
  showToast?: (msg: string) => void;
  className?: string;
}

export const ExportActionButtons: React.FC<ExportActionButtonsProps> = ({
  options,
  showToast,
  className = '',
}) => {
  const [exportedType, setExportedType] = useState<'pdf' | 'md' | null>(null);

  const handleExportPdf = () => {
    exportToPdf(options);
    setExportedType('pdf');
    showToast?.('已调起 PDF 导出与打印窗口');
    setTimeout(() => setExportedType(null), 2000);
  };

  const handleExportMd = () => {
    exportToMarkdown(options);
    setExportedType('md');
    showToast?.(`已导出 Markdown 文件《${options.title || '文档'}.md》`);
    setTimeout(() => setExportedType(null), 2000);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* 导出为 PDF */}
      <button
        type="button"
        onClick={handleExportPdf}
        className="px-2 py-1 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-2xs cursor-pointer flex items-center gap-1 text-xs font-medium"
        title="导出为 PDF 文档"
      >
        {exportedType === 'pdf' ? (
          <Check size={13} className="text-emerald-600" />
        ) : (
          <FileText size={13} className="text-rose-500" />
        )}
        <span>PDF</span>
      </button>

      {/* 导出为 MD */}
      <button
        type="button"
        onClick={handleExportMd}
        className="px-2 py-1 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-sky-600 hover:border-sky-200 transition-colors shadow-2xs cursor-pointer flex items-center gap-1 text-xs font-medium"
        title="导出为 Markdown (.md) 文件"
      >
        {exportedType === 'md' ? (
          <Check size={13} className="text-emerald-600" />
        ) : (
          <FileDown size={13} className="text-sky-600" />
        )}
        <span>MD</span>
      </button>
    </div>
  );
};
